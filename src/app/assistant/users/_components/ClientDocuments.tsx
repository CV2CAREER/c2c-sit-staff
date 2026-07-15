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
import { SuggestedKeywordsModal } from "./SuggestionModals";
import { Button } from "@/components/ui/button";
import CustomModal from "@/components/CustomModal/CustomModal";
import { FiX } from "react-icons/fi";
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
                 generateClientDocumentsColumns(allDocuments as any[]) as GridColDef[]
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
        <Button
          className="mt-4 bg-[#007ab3] hover:bg-[#009de6] text-white font-semibold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007ab3] focus:ring-opacity-50"
          onClick={() => {
            setIsReviseModalOpen(true);
          }}
          disabled={isUploading}
        >
          <span className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            {isUploading ? "Uploading..." : "Upload Revised Document"}
          </span>
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
      >
        <div className="bg-white p-4 sm:p-6 rounded-2xl">
          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setIsReviseModalOpen(false);
              }}
            >
              <FiX className="text-2xl" />
            </button>
          </div>
          <h2>
            <span className="text-24 !font-medium font-sharp-grotesk mt-4 text-career-black-200">
              Upload Revised Document
            </span>
          </h2>
          <p>Upload the revised documents here.</p>
          <Formik
            initialValues={INITIAL_UPLOAD_VALUES}
            onSubmit={handleUploadSubmit}
          >
            {({ handleSubmit, values }) => {
              const totalFiles = countSelectedFiles(values);

              return (
                <form onSubmit={handleSubmit} className="mt-4">
                  <DocumentUploadFields />

                  <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-career-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-13 text-career-gray-200">
                      {totalFiles === 0
                        ? "No files selected yet"
                        : `${totalFiles} file${totalFiles === 1 ? "" : "s"} ready to upload`}
                    </span>
                    <Button
                      type="submit"
                      className="!capitalize rounded-full bg-[#007ab3] px-6 hover:bg-[#009de6]"
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
