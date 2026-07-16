"use client";

import { useState } from "react";
import { FieldArray } from "formik";
import toast from "react-hot-toast";
import { FiAlertCircle, FiDownload, FiPlus, FiUploadCloud, FiX } from "react-icons/fi";
import {
  downloadRoleTitleTemplate,
  validateRoleTitleCsv,
} from "./roleTitleCsv";

export interface UploadCategory {
  /** Formik field name — also the multipart field name sent to the API. */
  name: string;
  label: string;
  /** Short caption under the label, e.g. "PDF · DOCX". */
  hint: string;
  /** Lowercase extensions accepted, without the dot. */
  extensions: string[];
  /** Value for the input's `accept` attribute. */
  accept: string;
  isNew?: boolean;
  /**
   * True for the categories handled by the client-support-documents endpoint;
   * false for resume/cover letter, which go to the document review endpoint.
   */
  isSupportDocument?: boolean;
  /** Rendered above the upload zone when the section is expanded. */
  instructions?: React.ReactNode;
  /**
   * Inspects file contents; a non-empty array rejects the file. Runs only after
   * the extension check passes.
   */
  validateContents?: (file: File) => Promise<string[]>;
  /** Offers a "Download template" action when contents can be rejected. */
  downloadTemplate?: () => void;
}

const TemplateButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#007ab3] px-3 py-1.5 text-12 font-semibold text-[#007ab3] transition-colors duration-200 hover:bg-[#007ab3] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ab3] focus-visible:ring-offset-2"
  >
    <FiDownload />
    Download accepted template
  </button>
);

const CsvInstructions = () => (
  <div className="rounded-xl border border-career-gray-200 bg-career-gray-300/50 p-4 text-13 leading-relaxed text-career-black-200">
    <p className="font-medium">Upload a CSV with these headers</p>
    <p className="mt-2 font-mono text-12 break-words text-career-black-200/80">
      Role Title, Classification, Craft, Industry, Status, AI Career Resilience
      Rating
    </p>
    <dl className="mt-3 space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <dt className="font-medium">Status</dt>
        <dd className="text-career-black-200/70">
          Evidenced · Adjacent · Aspirational
        </dd>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <dt className="font-medium">AI Career Resilience Rating</dt>
        <dd className="text-career-black-200/70">High · Medium · Low</dd>
      </div>
    </dl>
    <TemplateButton onClick={downloadRoleTitleTemplate} />
  </div>
);

export const DOCUMENT_CATEGORIES: UploadCategory[] = [
  {
    name: "resume",
    label: "Resume files",
    hint: "PDF · DOCX",
    extensions: ["pdf", "doc", "docx"],
    accept:
      "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    name: "coverletter",
    label: "Cover letters",
    hint: "PDF · DOCX",
    extensions: ["pdf", "doc", "docx"],
    accept:
      "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    name: "roleTitleRecommendations",
    label: "Role Title Recommendations",
    hint: "CSV only — mandatory",
    extensions: ["csv"],
    accept: ".csv,text/csv",
    isNew: true,
    isSupportDocument: true,
    instructions: <CsvInstructions />,
    validateContents: async (file) =>
      validateRoleTitleCsv(await file.text()).errors,
    downloadTemplate: downloadRoleTitleTemplate,
  },
  {
    name: "supportImages",
    label: "Support Images",
    hint: "PNG · JPG · HEIC",
    extensions: ["png", "jpg", "jpeg", "heic"],
    accept: ".png,.jpg,.jpeg,.heic,image/png,image/jpeg,image/heic",
    isNew: true,
    isSupportDocument: true,
  },
  {
    name: "supportSpreadsheets",
    label: "Support Spreadsheets",
    hint: "XLSX · CSV",
    extensions: ["xlsx", "csv"],
    accept:
      ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    isNew: true,
    isSupportDocument: true,
  },
];

export interface SelectedFile {
  file: File;
  name: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// MIME types are unreliable for CSV and HEIC across browsers, so the extension
// is the source of truth.
function hasAllowedExtension(file: File, extensions: string[]): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return extensions.includes(extension);
}

const UploadSection = ({ category }: { category: UploadCategory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [rejection, setRejection] = useState<{
    fileName: string;
    errors: string[];
  } | null>(null);
  const inputId = `upload-${category.name}`;

  return (
    <FieldArray name={category.name}>
      {({ push, remove, form }) => {
        const files: SelectedFile[] = form.values?.[category.name] ?? [];

        const addFiles = async (fileList: FileList | File[] | null) => {
          if (!fileList?.length) return;

          setRejection(null);

          const wrongType: string[] = [];
          const accepted: File[] = [];

          Array.from(fileList).forEach((file) => {
            if (!hasAllowedExtension(file, category.extensions)) {
              wrongType.push(file.name);
              return;
            }
            // Skip files already staged for this category.
            const isDuplicate = files.some(
              (staged) =>
                staged.name === file.name && staged.file?.size === file.size,
            );
            if (!isDuplicate) accepted.push(file);
          });

          if (wrongType.length) {
            toast.error(
              `${category.label} accepts ${category.hint.replace(" — mandatory", "")} only. Skipped: ${wrongType.join(", ")}`,
            );
          }

          if (!accepted.length || !category.validateContents) {
            accepted.forEach((file) => push({ file, name: file.name }));
            return;
          }

          setIsChecking(true);
          try {
            for (const file of accepted) {
              let errors: string[];
              try {
                errors = await category.validateContents(file);
              } catch {
                errors = ["The file could not be read."];
              }

              if (errors.length) {
                setRejection({ fileName: file.name, errors });
                errors.forEach((error) =>
                  toast.error(`${file.name} — ${error}`, { duration: 8000 }),
                );
                continue;
              }

              push({ file, name: file.name });
            }
          } finally {
            setIsChecking(false);
          }
        };

        return (
          <div
            className={`rounded-2xl border transition-colors duration-200 ${
              isOpen
                ? "border-[#007ab3] bg-white"
                : "border-career-gray-200 bg-white hover:border-career-gray-200/80"
            }`}
          >
            <button
              type="button"
              onClick={() => setIsOpen((open) => !open)}
              aria-expanded={isOpen}
              aria-controls={`${inputId}-panel`}
              className="flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#007ab3] focus-visible:ring-offset-2"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-15 font-medium transition-colors duration-200 ${
                      isOpen ? "text-career-black-200" : "text-career-gray-200"
                    }`}
                  >
                    {category.label}
                  </span>
                  {category.isNew && (
                    <span className="rounded-full bg-[#007ab3]/10 px-2 py-0.5 text-10 font-semibold uppercase tracking-wide text-[#007ab3]">
                      New
                    </span>
                  )}
                  {files.length > 0 && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-10 font-semibold text-green-700">
                      {files.length} selected
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-12 text-career-gray-200">
                  {category.hint}
                </span>
              </span>

              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  isOpen
                    ? "rotate-45 border-[#007ab3] bg-[#F5FDFE] text-[#007ab3]"
                    : "border-career-gray-200 text-career-gray-200"
                }`}
              >
                <FiPlus className="text-lg" />
              </span>
            </button>

            <div
              id={`${inputId}-panel`}
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 border-t border-career-gray-200 p-4">
                  {category.instructions}

                  <label
                    htmlFor={inputId}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      void addFiles(e.dataTransfer.files);
                    }}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors duration-200 ${
                      isDragging
                        ? "border-[#007ab3] bg-[#007ab3]/5"
                        : "border-career-gray-200 hover:border-[#007ab3] hover:bg-career-gray-300/40"
                    }`}
                  >
                    <input
                      id={inputId}
                      className="sr-only"
                      type="file"
                      multiple
                      accept={category.accept}
                      onChange={(e) => {
                        // Snapshot before clearing — the input is reset
                        // synchronously while validation is still awaiting.
                        const picked = Array.from(e.target.files ?? []);
                        // Allow re-selecting the same file after removing it.
                        e.target.value = "";
                        void addFiles(picked);
                      }}
                    />
                    <FiUploadCloud className="text-2xl text-[#007ab3]" />
                    <span className="text-13 text-career-black-200">
                      {isChecking ? "Checking file…" : "Drag & drop, or"}
                    </span>
                    <span
                      className={`rounded-full bg-[#007ab3] px-4 py-2 text-13 font-semibold text-white transition duration-300 hover:bg-[#009de6] ${
                        isChecking ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      Upload {files.length > 0 ? "more" : ""} {category.label.toLowerCase()}
                    </span>
                  </label>

                  {rejection && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-4 text-13 text-red-800"
                    >
                      <p className="flex items-start gap-2 font-medium">
                        <FiAlertCircle className="mt-0.5 shrink-0 text-base" />
                        <span className="min-w-0 break-words">
                          {rejection.fileName} was rejected
                        </span>
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-8">
                        {rejection.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                      {category.downloadTemplate && (
                        <div className="pl-8">
                          <TemplateButton onClick={category.downloadTemplate} />
                        </div>
                      )}
                    </div>
                  )}

                  {files.length > 0 && (
                    <ul className="space-y-2">
                      {files.map((selected, index) => (
                        <li
                          key={`${selected.name}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-career-gray-300 px-3 py-2"
                        >
                          <span className="min-w-0 flex-grow truncate text-13 text-career-black-200">
                            {selected.name}
                          </span>
                          {selected.file?.size != null && (
                            <span className="shrink-0 text-11 text-career-gray-200">
                              {formatSize(selected.file.size)}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Remove ${selected.name}`}
                            onClick={() => remove(index)}
                            className="shrink-0 rounded-full p-1 text-career-black-200 transition-colors hover:bg-white hover:text-red-600"
                          >
                            <FiX />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </FieldArray>
  );
};

export const DocumentUploadFields = () => (
  <div className="space-y-3">
    {DOCUMENT_CATEGORIES.map((category) => (
      <UploadSection key={category.name} category={category} />
    ))}
  </div>
);

export default DocumentUploadFields;
