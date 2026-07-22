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
import { motion, AnimatePresence } from "framer-motion";
import { SuggestedKeywordsModal } from "./SuggestionModals";
import { Button } from "@/components/ui/button";
import CustomModal from "@/components/CustomModal/CustomModal";
import { FiX, FiUploadCloud, FiCheckCircle } from "react-icons/fi";
import { Formik } from "formik";
import PulseLoader from "./loader";
import DocumentUploadFields from "@/components/DocumentUpload/DocumentUploadFields";
import {
  INITIAL_UPLOAD_VALUES,
  countSelectedFiles,
  useDocumentUploadSubmit,
} from "@/components/DocumentUpload/useDocumentUploadSubmit";

const ClientDocument = ({ userId }: { userId: string }) => {
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

  const { handleSubmit: handleUploadSubmit, isUploading } =
    useDocumentUploadSubmit(userId, () => setIsReviseModalOpen(false));

//   console.log("client documents", documentsData);
  return (
    <>
      <div className="w-full bg-white p-4 md:p-6 rounded-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-xl md:text-2xl !font-medium font-sharp-grotesk text-career-black-200 capitalize">
            Client Documents
          </h3>
          <div className="flex items-center bg-career-gray-300 w-full md:w-auto bigLaptop:w-[31rem] h-12 rounded-[2.5rem] px-4 py-3">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search"
              className="border-none outline-none ring-0 focus:ring-0 focus:border-none focus:outline-0 bg-career-gray-300 ml-4 w-full placeholder:text-14 placeholder:font-medium placeholder:text-career-gray-200"
            />
          </div>
        </div>

        <div className="h-fit w-[100%] mt-[2rem]">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <PulseLoader />
            </div>
          ) : (
             <StyledDataGridPro
               rows={documentRows}
               getRowId={(row) => {
                 return row.id || `${row.type}-${row.source}-${row.dateUpdated}-${Math.random().toString(36).substr(2, 9)}`;
               }}
               columns={
                 generateClientDocumentsColumns(allDocuments as any[], userId) as GridColDef[]
               }
              showToolbar={true}
              paginationMode="server"
              rowCount={0}
              pagination
              rowBufferPx={100}
              columnBufferPx={5}
              rowReordering
              slots={{
                toolbar: GridToolbar,
              }}
              disableRowSelectionOnClick
              checkboxSelection
              checkboxSelectionVisibleOnly
              onCellClick={(params) => {
                if (params.field === "suggestedKeywords") {
                  setIsKeywordModalOpen(true);
                }
              }}
            />
          )}
        </div>
        <motion.div
          className="mt-4 inline-block"
          whileHover={{ scale: isUploading ? 1 : 1.03 }}
          whileTap={{ scale: isUploading ? 1 : 0.97 }}
        >
          <Button
            className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#007ab3] to-[#00b4d8] px-5 py-2 font-semibold text-white shadow-md shadow-[#007ab3]/20 transition-shadow duration-300 hover:from-[#007ab3] hover:to-[#00b4d8] hover:shadow-lg hover:shadow-[#00b4d8]/30 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50 disabled:opacity-60"
            onClick={() => {
              setIsReviseModalOpen(true);
            }}
            disabled={isUploading}
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-white/25 transition-transform duration-700 group-hover:translate-x-[250%]" />
            <span className="relative flex items-center gap-2">
              <motion.span
                animate={isUploading ? { y: [0, -3, 0] } : { y: 0 }}
                transition={{ repeat: isUploading ? Infinity : 0, duration: 0.8 }}
                className="flex items-center"
              >
                <FiUploadCloud className="text-lg" />
              </motion.span>
              {isUploading ? "Uploading..." : "Upload Revised Document"}
            </span>
          </Button>
        </motion.div>
      </div>
      <SuggestedKeywordsModal
        isOpen={isKeywordModalOpen}
        setIsOpen={setIsKeywordModalOpen}
        keywords={rows}
      />
      <CustomModal
        visibility={isReviseModalOpen}
        toggleVisibility={setIsReviseModalOpen}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#007ab3] via-[#00b4d8] to-[#007ab3]" />

          <div className="flex items-start justify-between gap-4 p-4 pt-6 sm:p-6 sm:pt-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#007ab3]/10 text-[#007ab3]">
                <FiUploadCloud className="text-xl" />
              </span>
              <div>
                <h2 className="text-24 !font-medium font-sharp-grotesk text-career-black-200">
                  Upload Revised Document
                </h2>
                <p className="mt-1 text-13 text-career-gray-200">
                  Upload the revised documents here.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsReviseModalOpen(false);
              }}
              aria-label="Close"
              className="shrink-0 rounded-full p-1.5 text-career-gray-200 transition-colors hover:bg-career-gray-300 hover:text-career-black-200"
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
                <form onSubmit={handleSubmit} className="px-4 pb-4 sm:px-6 sm:pb-6">
                  <DocumentUploadFields />

                  <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-career-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                            : "text-career-gray-200"
                        }`}
                      >
                        {totalFiles > 0 && <FiCheckCircle className="text-base" />}
                        {totalFiles === 0
                          ? "No files selected yet"
                          : `${totalFiles} file${totalFiles === 1 ? "" : "s"} ready to upload`}
                      </motion.span>
                    </AnimatePresence>
                    <motion.div
                      whileHover={{ scale: totalFiles === 0 || isUploading ? 1 : 1.03 }}
                      whileTap={{ scale: totalFiles === 0 || isUploading ? 1 : 0.97 }}
                    >
                      <Button
                        type="submit"
                        className="!capitalize rounded-full bg-gradient-to-r from-[#007ab3] to-[#00b4d8] px-6 hover:from-[#007ab3] hover:to-[#00b4d8] disabled:opacity-60"
                        disabled={totalFiles === 0 || isUploading}
                      >
                        {isUploading ? "Uploading..." : "Upload"}
                      </Button>
                    </motion.div>
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
