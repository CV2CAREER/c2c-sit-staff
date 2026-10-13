import axios from "axios";
import { createPrivateKey } from "crypto";
import { lookup } from "dns/promises";
import { google } from "googleapis";
import net from "net";
import * as XLSX from "xlsx";
import { GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY } from "../../../../config/env";
import { getServiceLogger } from "../../../../utils/createLogger";
import ErrorHandler from "../../../../utils/errorHandler";

// Turns a spreadsheet link (Google Sheets / Drive, Dropbox, direct URL) or an
// uploaded file into plain string rows per sheet.
//
// Fetching a URL on the server is guarded: HTTPS only, the host must resolve
// to a public address (no localhost / private network / cloud metadata),
// redirects only within the provider's own hosts, a size limit and a timeout.

const logger = getServiceLogger("sheet-import-fetch");

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 60;
const TIMEOUT_MS = 20_000;

export interface ParsedSheet {
  name: string;
  headerRow: number; // 1-based row number of the header in the sheet
  headers: string[];
  rows: { rowNumber: number; cells: string[] }[];
  truncated: boolean;
  // Has type/table/row-id style headers — likely a change-request sheet.
  looksLikeRequests: boolean;
}

export interface ParsedWorkbook {
  source: string; // display name
  sheets: ParsedSheet[];
}

const bad = (message: string, status = 400) => new ErrorHandler(message, status);

// --- parsing -------------------------------------------------------------------

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

export const parseWorkbook = (buffer: Buffer, source: string): ParsedWorkbook => {
  if (buffer.length > MAX_FILE_BYTES) throw bad(`The file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer", cellDates: true, dense: true });
  } catch {
    throw bad("That file isn't a readable Excel or CSV file.");
  }
  if (!wb.SheetNames.length) throw bad("The file has no sheets.");

  const sheets: ParsedSheet[] = wb.SheetNames.map((name) => {
    const raw = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: "", blankrows: true, dateNF: "dd/mm/yyyy" });
    const grid = raw.map((r) => (Array.isArray(r) ? r.map(clean) : []));
    // Blank rows are kept so row numbers match what people see in the sheet.
    // Header = first row (within the first 10) with at least two filled cells.
    let headerIdx = grid.slice(0, 10).findIndex((r) => r.filter(Boolean).length >= 2);
    if (headerIdx === -1) headerIdx = 0;
    const headerCells = grid[headerIdx] ?? [];
    // Drop trailing empty header columns (Sheets exports many).
    let width = headerCells.length;
    while (width > 0 && !headerCells[width - 1]) width--;
    width = Math.min(width, MAX_COLUMNS);
    const headers = headerCells.slice(0, width).map((h, i) => h || `Column ${i + 1}`);
    const body = grid
      .slice(headerIdx + 1)
      .map((cells, i) => ({ rowNumber: headerIdx + 2 + i, cells: Array.from({ length: width }, (_, j) => cells[j] ?? "") }))
      .filter((r) => r.cells.some(Boolean));
    const normHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const has = (...names: string[]) => normHeaders.some((h) => names.includes(h));
    return {
      name,
      looksLikeRequests: has("type", "action", "requesttype", "changetype") && has("table", "tablename", "entity", "module") && has("rowid", "id", "recordid", "uniqueid", "userid"),
      headerRow: headerIdx + 1,
      headers,
      rows: body.slice(0, MAX_ROWS),
      truncated: body.length > MAX_ROWS,
    };
  });
  return { source, sheets };
};

// --- URL safety ------------------------------------------------------------------

const isPrivateAddress = (ip: string) => {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
};

const assertPublicHost = async (hostname: string) => {
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(hostname)) throw bad("That link points at an internal address.");
  const addresses = await lookup(hostname, { all: true }).catch(() => {
    throw bad(`Couldn't find the server "${hostname}". Check the link.`);
  });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw bad("That link points at an internal address.");
};

const download = async (url: string, allowedRedirectHosts: RegExp | null, headers: Record<string, string> = {}) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw bad("Only https:// links are supported.");
  await assertPublicHost(parsed.hostname);
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: TIMEOUT_MS,
    maxContentLength: MAX_FILE_BYTES,
    maxBodyLength: MAX_FILE_BYTES,
    maxRedirects: allowedRedirectHosts ? 5 : 0,
    headers,
    validateStatus: () => true,
    beforeRedirect: (options: { hostname?: string; protocol?: string }) => {
      if (options.protocol !== "https:" || !allowedRedirectHosts?.test(String(options.hostname))) {
        throw bad("The link redirected somewhere unexpected — download the file and upload it instead.");
      }
    },
  } as any);
  return res;
};

const looksLikeLoginPage = (contentType: string, body: Buffer) =>
  contentType.includes("text/html") && /accounts\.google\.com|ServiceLogin|<title>[^<]*(Sign in|Google Drive)/i.test(body.subarray(0, 4000).toString("utf8"));

// --- providers --------------------------------------------------------------------

const GOOGLE_HOSTS = /(^|\.)(google\.com|googleusercontent\.com)$/i;

const googleFileId = (url: URL) =>
  url.pathname.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/)?.[1] ??
  url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/)?.[1] ??
  url.searchParams.get("id");

export const serviceAccountEmail = () => GOOGLE_DRIVE_CLIENT_EMAIL || null;

// The key in .env may arrive wrapped in quotes and/or with escaped "\n"s
// (depending on how it was pasted). Normalise it to a clean PEM and make
// sure Node can actually read it before calling Google.
export const normalizePrivateKey = (raw: string | undefined): string => {
  let key = String(raw ?? "").trim();
  key = key.replace(/^["'`]+|["'`]+$/g, "").replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
  key = key
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  if (!key.startsWith("-----BEGIN")) throw new Error("The Google service account key isn't a PEM private key.");
  createPrivateKey(key); // throws if it still can't be parsed
  return `${key}\n`;
};

const fetchGoogleWithServiceAccount = async (fileId: string, isSheet: boolean): Promise<{ buffer: Buffer; name: string }> => {
  if (!GOOGLE_DRIVE_CLIENT_EMAIL || !GOOGLE_DRIVE_PRIVATE_KEY) throw new Error("No Google service account configured");
  const auth = new google.auth.JWT({
    email: GOOGLE_DRIVE_CLIENT_EMAIL,
    key: normalizePrivateKey(GOOGLE_DRIVE_PRIVATE_KEY),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const drive = google.drive({ version: "v3", auth });
  const meta = await drive.files.get({ fileId, fields: "name,mimeType,size", supportsAllDrives: true });
  const name = meta.data.name || "Google file";
  const res =
    isSheet || meta.data.mimeType === "application/vnd.google-apps.spreadsheet"
      ? await drive.files.export(
          { fileId, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
          { responseType: "arraybuffer" },
        )
      : await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
  return { buffer: Buffer.from(res.data as ArrayBuffer), name };
};

export const fetchWorkbookFromUrl = async (rawUrl: string): Promise<ParsedWorkbook> => {
  let url: URL;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    throw bad("That doesn't look like a link. Paste the full address, starting with https://");
  }

  // Google Sheets / Drive
  if (/(^|\.)google\.com$/i.test(url.hostname)) {
    const fileId = googleFileId(url);
    if (!fileId) throw bad("Couldn't find the file ID in that Google link — copy the link from the sheet's Share button.");
    const isSheet = url.pathname.includes("/spreadsheets/");
    const exportUrl = isSheet
      ? `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`
      : `https://drive.google.com/uc?export=download&id=${fileId}`;

    const res = await download(exportUrl, GOOGLE_HOSTS);
    const body = Buffer.from(res.data);
    const contentType = String(res.headers["content-type"] || "");
    if (res.status === 200 && !looksLikeLoginPage(contentType, body)) {
      const name = decodeURIComponent(String(res.headers["content-disposition"] || "").match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1] || "Google Sheet");
      return parseWorkbook(body, name.replace(/\.xlsx$/i, ""));
    }

    // Not public — try the service account.
    try {
      const { buffer, name } = await fetchGoogleWithServiceAccount(fileId, isSheet);
      return parseWorkbook(buffer, name);
    } catch (err: any) {
      logger.warn(`Service-account read of ${fileId} failed: ${err?.message}`);
      const sa = serviceAccountEmail();
      throw bad(
        `This sheet isn't shared publicly${sa ? ` and the system account can't open it` : ""}. In Google Sheets click Share and either set “Anyone with the link” to Viewer${sa ? `, or add ${sa} as a Viewer` : ""} — then try again.`,
        403,
      );
    }
  }

  // Dropbox share links → direct download
  if (/(^|\.)dropbox\.com$/i.test(url.hostname)) {
    url.searchParams.set("dl", "1");
    const res = await download(url.toString(), /(^|\.)(dropbox\.com|dropboxusercontent\.com)$/i);
    if (res.status !== 200) throw bad(`Dropbox returned ${res.status} — check the link is shared.`);
    return parseWorkbook(Buffer.from(res.data), decodeURIComponent(url.pathname.split("/").pop() || "Dropbox file"));
  }

  // Any other direct file link (no redirects).
  const res = await download(url.toString(), null);
  if (res.status >= 300 && res.status < 400) throw bad("The link redirects — use the direct file link, or download the file and upload it.");
  if (res.status !== 200) throw bad(`The server returned ${res.status} for that link.`);
  const contentType = String(res.headers["content-type"] || "");
  if (contentType.includes("text/html")) throw bad("That link opens a web page, not a file. Use a direct download link or upload the file.");
  return parseWorkbook(Buffer.from(res.data), decodeURIComponent(url.pathname.split("/").pop() || "Linked file"));
};
