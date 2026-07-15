/**
 * Server-side mirror of the Role Title Recommendations CSV rules enforced in
 * the staff UI. The client-side check is a UX affordance only — the request can
 * be replayed directly, so the same rules are applied here before anything is
 * written to storage.
 */

export const ROLE_TITLE_HEADERS = [
  "Role Title",
  "Classification",
  "Craft",
  "Industry",
  "Status",
  "AI Career Resilience Rating",
] as const;

export const STATUS_VALUES = [
  "Evidence-Based",
  "Adjacent",
  "Aspirational",
] as const;

export const RESILIENCE_RATING_VALUES = ["High", "Medium", "Low"] as const;

const MAX_REPORTED_ROWS = 5;

/**
 * Parses CSV text into rows of cells. Handles quoted fields (escaped `""`,
 * embedded commas and newlines) and both LF and CRLF line endings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Strip the UTF-8 BOM Excel prepends; it would corrupt the first header cell.
  const input = text.replace(/^﻿/, "");

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      endCell();
    } else if (char === "\n") {
      endRow();
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) endRow();

  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

/** One parsed CSV row, persisted on the document's `roleTitles` column. */
export interface RoleTitleRow {
  roleTitle: string;
  classification: string;
  craft: string;
  industry: string;
  status: string;
  aiCareerResilienceRating: string;
}

export interface RoleTitleCsvValidation {
  errors: string[];
  /** Number of data rows (excludes the header). */
  rowCount: number;
  /** Parsed rows — empty when validation failed. */
  rows: RoleTitleRow[];
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function validateRoleTitleCsv(text: string): RoleTitleCsvValidation {
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return { errors: ["The file is empty."], rowCount: 0, rows: [] };
  }

  const headers = rows[0].map((header) => header.trim());
  const expected = [...ROLE_TITLE_HEADERS];

  const headersMatch =
    headers.length === expected.length &&
    headers.every((header, index) => equalsIgnoreCase(header, expected[index]));

  if (!headersMatch) {
    const missing = expected.filter(
      (header) => !headers.some((found) => equalsIgnoreCase(found, header)),
    );
    const unexpected = headers.filter(
      (header) =>
        header !== "" &&
        !expected.some((valid) => equalsIgnoreCase(header, valid)),
    );

    const details: string[] = [];
    if (missing.length) details.push(`Missing: ${missing.join(", ")}`);
    if (unexpected.length) details.push(`Unexpected: ${unexpected.join(", ")}`);
    if (!details.length) details.push("Headers are out of order.");

    return {
      errors: [`Headers do not match the template. ${details.join(" · ")}`],
      rowCount: 0,
      rows: [],
    };
  }

  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    return {
      errors: ["The file has headers but no rows."],
      rowCount: 0,
      rows: [],
    };
  }

  const statusIndex = expected.indexOf("Status");
  const ratingIndex = expected.indexOf("AI Career Resilience Rating");

  const badStatus: string[] = [];
  const badRating: string[] = [];

  dataRows.forEach((cells, index) => {
    // +2 because row 1 is the header and humans count from 1.
    const lineNumber = index + 2;

    const status = (cells[statusIndex] ?? "").trim();
    if (!STATUS_VALUES.some((valid) => equalsIgnoreCase(status, valid))) {
      badStatus.push(`row ${lineNumber} ("${status || "empty"}")`);
    }

    const rating = (cells[ratingIndex] ?? "").trim();
    if (
      !RESILIENCE_RATING_VALUES.some((valid) => equalsIgnoreCase(rating, valid))
    ) {
      badRating.push(`row ${lineNumber} ("${rating || "empty"}")`);
    }
  });

  const summarise = (entries: string[]) => {
    const shown = entries.slice(0, MAX_REPORTED_ROWS).join(", ");
    const extra = entries.length - MAX_REPORTED_ROWS;
    return extra > 0 ? `${shown} and ${extra} more` : shown;
  };

  const errors: string[] = [];
  if (badStatus.length) {
    errors.push(
      `Invalid Status — must be ${STATUS_VALUES.join(" · ")}. Found ${summarise(badStatus)}.`,
    );
  }
  if (badRating.length) {
    errors.push(
      `Invalid AI Career Resilience Rating — must be ${RESILIENCE_RATING_VALUES.join(" · ")}. Found ${summarise(badRating)}.`,
    );
  }

  if (errors.length) {
    return { errors, rowCount: dataRows.length, rows: [] };
  }

  const parsed: RoleTitleRow[] = dataRows.map((cells) => ({
    roleTitle: (cells[expected.indexOf("Role Title")] ?? "").trim(),
    classification: (cells[expected.indexOf("Classification")] ?? "").trim(),
    craft: (cells[expected.indexOf("Craft")] ?? "").trim(),
    industry: (cells[expected.indexOf("Industry")] ?? "").trim(),
    status: (cells[statusIndex] ?? "").trim(),
    aiCareerResilienceRating: (cells[ratingIndex] ?? "").trim(),
  }));

  return { errors, rowCount: dataRows.length, rows: parsed };
}
