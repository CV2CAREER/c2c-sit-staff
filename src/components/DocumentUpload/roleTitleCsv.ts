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

export const ROLE_TITLE_TEMPLATE_FILENAME =
  "role-title-recommendations-template.csv";

/**
 * Parses CSV text into rows of cells. Handles quoted fields (including escaped
 * `""` quotes and embedded commas/newlines) and both LF and CRLF line endings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  // Strip the UTF-8 BOM Excel prepends, which would otherwise corrupt the
  // first header cell.
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

  // Flush the trailing cell/row when the file has no final newline.
  if (cell.length > 0 || row.length > 0) endRow();

  // Drop blank trailing lines.
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

export interface CsvValidationResult {
  errors: string[];
}

const MAX_REPORTED_ROWS = 5;

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Validates a Role Title Recommendations CSV: exact header match, then the
 * allowed values for Status and AI Career Resilience Rating on every row.
 */
export function validateRoleTitleCsv(text: string): CsvValidationResult {
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return { errors: ["The file is empty."] };
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
    };
  }

  if (rows.length === 1) {
    return { errors: ["The file has headers but no rows."] };
  }

  const statusIndex = expected.indexOf("Status");
  const ratingIndex = expected.indexOf("AI Career Resilience Rating");

  const badStatus: string[] = [];
  const badRating: string[] = [];

  rows.slice(1).forEach((cells, index) => {
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

  return { errors };
}

/** CSV text for the downloadable template: headers plus one example row. */
export function buildRoleTitleTemplate(): string {
  const example = [
    "Senior Product Designer",
    "Design",
    "Product Design",
    "Technology",
    "Evidence-Based",
    "High",
  ];

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  return [
    ROLE_TITLE_HEADERS.map(escape).join(","),
    example.map(escape).join(","),
  ].join("\r\n");
}

export function downloadRoleTitleTemplate(): void {
  // Excel needs the BOM to read the file as UTF-8.
  const blob = new Blob(["﻿", buildRoleTitleTemplate()], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = ROLE_TITLE_TEMPLATE_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
