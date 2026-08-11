import { read, utils } from "xlsx";

/**
 * Converts the first sheet of an uploaded XLSX workbook into CSV text so it
 * can be run through the same header/value validation as a real CSV upload
 * (see validateRoleTitleCsv in roleTitleCsv.ts).
 */
export function xlsxBufferToCsv(buffer: Buffer): string {
  const workbook = read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return "";

  return utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
}
