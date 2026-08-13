"use client";
import Icon from "../../../../../public/icons";
import { useAdminQueries } from "@/hooks/api/admin.api";
import {
  generateClientDocumentRows,
  generateClientDocumentsColumns,
} from "./clientDocumentsColumns";
import { generateSupportDocumentRows } from "@/components/DocumentUpload/supportDocumentRows";
import { GridColDef, GridToolbar } from "@mui/x-data-grid-pro";
import { StyledDataGridPro } from "@/utils/table";
import { useState, useMemo } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { SuggestedKeywordsModal } from "./SuggestionModals";
import { Button } from "@/components/ui/button";
import CustomModal from "@/components/CustomModal/CustomModal";
import { FiX, FiUploadCloud, FiCheckCircle } from "react-icons/fi";
import {
  HiOutlineFolder,
  HiOutlineViewGrid,
  HiOutlineDocumentText,
  HiOutlineMail,
  HiOutlineBriefcase,
  HiOutlinePhotograph,
  HiOutlineTable,
} from "react-icons/hi";
import { Formik } from "formik";
import PulseLoader from "../../_components/DropDown/loader";
import DocumentUploadFields from "@/components/DocumentUpload/DocumentUploadFields";
import {
  INITIAL_UPLOAD_VALUES,
  countSelectedFiles,
  useDocumentUploadSubmit,
} from "@/components/DocumentUpload/useDocumentUploadSubmit";

// Matches the literal `type` values produced by generateClientDocumentRows
// ("resume" / "coverletter") and generateSupportDocumentRows (the support
// document category labels).
const DOCUMENT_TYPE_TABS = [
  { label: "All Types", value: "all", icon: HiOutlineViewGrid },
  { label: "Resume", value: "resume", icon: HiOutlineDocumentText },
  { label: "Cover Letter", value: "coverletter", icon: HiOutlineMail },
  { label: "Role Title Recommendations", value: "Role Title Recommendations", icon: HiOutlineBriefcase },
  { label: "Support Images", value: "Support Images", icon: HiOutlinePhotograph },
  { label: "Support Spreadsheets", value: "Support Spreadsheets", icon: HiOutlineTable },
] as const;

const ClientDocument = ({ userId }: { userId: string }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const {
    userDocumentsDomain: documentsData,
    clientSupportDocumentsDomain: supportDocumentsData,
  } = useAdminQueries({
    userId,
    fetchUserDocuments: true,
    fetchClientSupportDocuments: true,
  });
  const isLoading = documentsData.isLoading;
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const rows = documentsData?.data?.documents || [];
  const supportRows = useMemo(
    () => supportDocumentsData?.data ?? [],
    [supportDocumentsData?.data],
  );

  // Both lists feed the download action, which resolves cloudFilename off the
  // raw record it finds here.
  const allDocuments = useMemo(
    () => [...rows, ...supportRows],
    [rows, supportRows],
  );

  const documentRows = useMemo(() => {
    return [
      ...generateClientDocumentRows(rows),
      ...generateSupportDocumentRows(supportRows),
    ] as never[];
  }, [rows, supportRows]);

  const [activeTypeTab, setActiveTypeTab] = useState<string>("all");

  // Case/whitespace-insensitive so a stray casing mismatch between a row's
  // `type` and a tab's value can't silently produce an empty grid.
  const normalizeType = (value: unknown) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  const typeTabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (documentRows as any[]).forEach((row) => {
      const key = normalizeType(row.type);
      if (!key) return;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [documentRows]);

  const filteredDocumentRows = useMemo(() => {
    if (activeTypeTab === "all") return documentRows;
    const target = normalizeType(activeTypeTab);
    return (documentRows as any[]).filter((row) => normalizeType(row.type) === target);
  }, [documentRows, activeTypeTab]);

  const { handleSubmit: handleUploadSubmit, isUploading } =
    useDocumentUploadSubmit(userId, () => setIsReviseModalOpen(false));

  const documentColumns = useMemo(() => {
    const baseColumns = generateClientDocumentsColumns(rows as any[], userId) as GridColDef[];

    if (!isMobile) {
      return baseColumns;
    }

    const mobileWidths: Record<string, number> = {
      actions: 84,
      fileName: 170,
      type: 120,
      source: 120,
      dateUpdated: 135,
      extractionType: 135,
      dataPoints: 120,
      suggestedKeywords: 140,
      suggestedJobTitles: 140,
      generateRTR: 150,
      generateCvVariant: 160,
      generateInterviewPack: 170,
      generateCoverLetter: 165,
    };

    return baseColumns.map((col) => {
      const mobileWidth = mobileWidths[col.field];
      if (!mobileWidth) return col;

      const currentWidth = typeof col.width === "number" ? col.width : mobileWidth;
      return {
        ...col,
        width: Math.min(currentWidth, mobileWidth),
      };
    });
  }, [rows, isMobile]);

//   console.log("client documents", documentsData);
  return (
    <>
      <div className="relative w-full overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HiOutlineFolder size={20} />
            </span>
            <h3 className="text-xl md:text-2xl !font-medium font-sharp-grotesk text-career-black-200 capitalize">
              Customer Documents
            </h3>
          </div>
          <div className="flex items-center bg-career-gray-300 w-full bigLaptop:w-[31rem] h-12 rounded-[2.5rem] px-4 py-3">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search"
              className="border-none outline-none ring-0 focus:ring-0 focus:border-none focus:outline-0 bg-career-gray-300 ml-4 w-full placeholder:text-14 placeholder:font-medium placeholder:text-career-gray-200"
            />
          </div>
        </div>

        <div className="filter-tabs-scroll mt-6 flex items-center gap-2 overflow-x-auto pb-2">
          {DOCUMENT_TYPE_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? (documentRows as any[]).length
                : (typeTabCounts[normalizeType(tab.value)] ?? 0);
            const isActive = activeTypeTab === tab.value;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTypeTab(tab.value)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-13 font-medium transition-colors duration-200 ${
                  isActive
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-career-gray-300 bg-white text-career-gray-200 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                <TabIcon className="text-base" />
                {tab.label}
                <span
                  className={`ml-0.5 rounded-full px-1.5 text-11 font-semibold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-career-gray-300 text-career-gray-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-fit w-[100%] mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <PulseLoader />
            </div>
          ) : filteredDocumentRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-career-gray-300 py-16 text-center">
              <p className="font-medium text-career-black-200">
                No {DOCUMENT_TYPE_TABS.find((t) => t.value === activeTypeTab)?.label.toLowerCase() ?? "documents"} yet
              </p>
              <p className="text-13 text-career-gray-200">
                Documents in this category will show up here once uploaded.
              </p>
            </div>
          ) : (
             <StyledDataGridPro
               rows={filteredDocumentRows}
               getRowId={(row) => {
                 return row.id || `${row.type}-${row.source}-${row.dateUpdated}-${Math.random().toString(36).substr(2, 9)}`;
               }}
               columns={
                 generateClientDocumentsColumns(allDocuments as any[], userId) as GridColDef[]
               }
              showToolbar={true}
              density={isMobile ? "compact" : "standard"}
              columnHeaderHeight={isMobile ? 40 : 56}
              rowHeight={isMobile ? 36 : undefined}
              pagination
              initialState={{
                pagination: { paginationModel: { pageSize: 20, page: 0 } },
              }}
              pageSizeOptions={[20, 50, 100]}
              rowBufferPx={100}
              columnBufferPx={5}
              rowReordering
              slots={{
                toolbar: GridToolbar,
              }}
              disableRowSelectionOnClick
              checkboxSelection
              checkboxSelectionVisibleOnly
              sx={
                isMobile
                  ? {
                      "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell": {
                        px: 0.75,
                      },
                      "& .MuiDataGrid-columnHeaderTitle": {
                        fontSize: "0.72rem",
                        lineHeight: 1.15,
                      },
                      "& .MuiDataGrid-cell": {
                        fontSize: "0.75rem",
                      },
                    }
                  : undefined
              }
              onCellClick={(params) => {
                if (params.field === "suggestedKeywords") {
                  setIsKeywordModalOpen(true);
                }
              }}
            />
          )}
        </div>
        <Button
          className="mt-4 gap-2"
          onClick={() => {
            setIsReviseModalOpen(true);
          }}
          disabled={isUploading}
        >
          <FiUploadCloud className="text-lg" />
          {isUploading ? "Uploading..." : "Upload Revised Document"}
        </Button>
      </div>
      <SuggestedKeywordsModal
        isOpen={isKeywordModalOpen}
        setIsOpen={setIsKeywordModalOpen}
        keywords={rows}
      />
      <CustomModal
        visibility={isReviseModalOpen}
        toggleVisibility={setIsReviseModalOpen}
        dialogPanelClassName="rounded-xl"
      >
        <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FiUploadCloud className="text-xl" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Upload Revised Document
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Upload the revised documents here.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsReviseModalOpen(false);
              }}
              aria-label="Close"
              className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          <Formik
            initialValues={INITIAL_UPLOAD_VALUES}
            onSubmit={handleUploadSubmit}
          >
            {({ handleSubmit, values }) => {
              const totalFiles = countSelectedFiles(values);

              return (
                <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-6">
                  <DocumentUploadFields />

                  <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={totalFiles}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center gap-1.5 text-13 ${
                          totalFiles > 0
                            ? "font-medium text-green-700"
                            : "text-gray-500"
                        }`}
                      >
                        {totalFiles > 0 && <FiCheckCircle className="text-base" />}
                        {totalFiles === 0
                          ? "No files selected yet"
                          : `${totalFiles} file${totalFiles === 1 ? "" : "s"} ready to upload`}
                      </motion.span>
                    </AnimatePresence>
                    <Button
                      type="submit"
                      className="!capitalize px-6"
                      disabled={totalFiles === 0 || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </form>
              );
            }}
          </Formik>
        </div>
      </CustomModal>
    </>
  );
};

export default ClientDocument;
