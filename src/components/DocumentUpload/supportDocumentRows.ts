import { DOCUMENT_CATEGORIES } from "./DocumentUploadFields";

const CATEGORY_LABELS: Record<string, string> = DOCUMENT_CATEGORIES.reduce(
  (labels, category) => ({ ...labels, [category.name]: category.label }),
  {} as Record<string, string>,
);

/**
 * Maps client-support-document records (role title CSVs, support images,
 * support spreadsheets) onto the same row shape the Client Documents grid uses,
 * so they list alongside resumes and cover letters.
 *
 * The raw records already carry `id`, `filename` and `cloudFilename`, which is
 * what the download action resolves against — so passing them through as
 * `allDocuments` makes Download work with no extra wiring.
 */
export const generateSupportDocumentRows = (documents: any[]) =>
  (documents ?? []).map((doc) => {
    const roleTitleCount = Array.isArray(doc.roleTitles)
      ? doc.roleTitles.length
      : 0;

    return {
      id: doc.id,
      fileName: doc.filename ?? "Unknown File",
      type: CATEGORY_LABELS[doc.category] ?? doc.category,
      source: "admin",
      // Distinguishes this row from an Upload row for the shared
      // DocumentTableActions component — the two record types live in
      // different tables with different activate endpoints.
      recordType: "supportDocument",
      isActive: doc.isActive,
      dateUpdated: doc.uploadedAt ?? doc.createdAt,
      extractionType: "N/A",
      dataPoints: roleTitleCount
        ? `${roleTitleCount} role title${roleTitleCount === 1 ? "" : "s"}`
        : "No data",
      // The grid renders these as links/buttons; blank means "not applicable
      // to this document type" and the cell renders as a dash.
      suggestedKeywords: "",
      suggestedJobTitles: "",
      generateRTR: "",
      generateCvVariant: "",
      generateInterviewPack: "",
      generateCoverLetter: "",
    };
  });
