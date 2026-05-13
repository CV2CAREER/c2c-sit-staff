"use client";
import Icon from "../../../../../public/icons";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import {
  generateClientDocumentRows,
  generateClientDocumentsColumns,
} from "./clientDocumentsColumns";
import { GridColDef, GridToolbar } from "@mui/x-data-grid-pro";
import { StyledDataGridPro } from "@/utils/table";
import { useState, useMemo } from "react";
import { SuggestedKeywordsModal } from "./SuggestionModals";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import CustomModal from "@/components/CustomModal/CustomModal";
import { FiX } from "react-icons/fi";
import { FieldArray, Formik } from "formik";
import { useQueryClient } from "@tanstack/react-query";
import PulseLoader from "../../_components/DropDown/loader";



const ClientDocument = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const { userDocumentsDomain: documentsData } = useAdminQueries({
    userId,
    fetchUserDocuments: true,
  });
  const { uploadDocumentsMutation, submitDocumentReviewMutation } = useAdminMutations();
  const isLoading = documentsData.isLoading;
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isReviseModalOpen, setIsReviseModalOpen] = useState(false);
  const rows = documentsData?.data?.documents || [];
  const documentRows = useMemo(() => {
    return generateClientDocumentRows(rows) as never[];
  }, [rows]);

//   console.log("client documents", documentsData);
  return (
    <>
      <div className="w-full bg-white p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl !font-medium font-sharp-grotesk text-career-black-200 capitalize">
            Client Documents
          </h3>
          <div className="flex items-center bg-career-gray-300 bigLaptop:w-[31rem] h-12 rounded-[2.5rem] px-4 py-3">
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
                 generateClientDocumentsColumns(rows as any[]) as GridColDef[]
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
          disabled={uploadDocumentsMutation.isPending || submitDocumentReviewMutation.isPending}
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
            {uploadDocumentsMutation.isPending || submitDocumentReviewMutation.isPending
              ? "Uploading..."
              : "Upload Revised Document"}
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
            initialValues={{
              resume: [],
              coverletter: [],
            }}
              onSubmit={async (values) => {
                const formData = new FormData();
                formData.append("userId", userId);
                values.resume.forEach((file: any) => {
                  formData.append("resume", file?.file);
                });
                values.coverletter.forEach((file: any) => {
                  formData.append("coverletter", file?.file);
                });

                try {
                  await submitDocumentReviewMutation.mutateAsync(formData);
                  
                  toast.success("Document uploaded and reviewed successfully");
                  setIsReviseModalOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["admin-documents", userId],
                  });
                } catch {
                   toast.error("An error occurred while processing document");
                }
              }}
          >
            {({ handleSubmit, values }) => (
              <form onSubmit={handleSubmit}>
                <FieldArray name="resume">
                  {({ push, remove, form }) => (
                    <div>
                      <label className="flex flex-col text-center my-2 p-6 border border-career-gray-200 cursor-pointer rounded-lg">
                        <input
                          className="sr-only"
                          type="file"
                          multiple
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => {
                            // Check if the files is valid
                            // Push the files to the array
                            if (e.target.files) {
                              for (
                                let i = 0;
                                i < e?.target?.files?.length;
                                i++
                              ) {
                                if (
                                  e.target?.files?.[i].type !==
                                    "application/pdf" &&
                                  e.target.files?.[i].type !==
                                    "application/msword" &&
                                  e.target.files?.[i].type !==
                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                ) {
                                  toast.error("Please select a valid file");
                                  return;
                                }
                                push({
                                  file: e.target.files[i],
                                  name: e.target.files[i].name,
                                });
                              }
                            }
                          }}
                        />
                        <span>
                          Add {!!form.values?.resume?.length && "more"} resume
                          files
                        </span>
                      </label>
                      <div className="space-y-2">
                        {form.values?.resume?.map(
                          (file: any, index: number) => {
                            return (
                              <div
                                key={index}
                                className={
                                  "flex items-center justify-between bg-gray-200 p-2 rounded-lg mt-2"
                                }
                              >
                                <span className="block truncate flex-grow">
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    remove(index);
                                  }}
                                >
                                  <FiX />
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                </FieldArray>
                <FieldArray name="coverletter">
                  {({ push, remove, form }) => (
                    <div>
                      <label className="flex flex-col text-center my-2 p-6 border border-career-gray-200 cursor-pointer rounded-lg">
                        <input
                          className="sr-only"
                          type="file"
                          multiple
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => {
                            // Check if the files is valid
                            // Push the files to the array
                            if (e.target.files) {
                              for (let i = 0; i < e.target.files.length; i++) {
                                if (
                                  e.target.files[i].type !==
                                    "application/pdf" &&
                                  e.target.files[i].type !==
                                    "application/msword" &&
                                  e.target.files[i].type !==
                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                ) {
                                  toast.error("Please select a valid file");
                                  return;
                                }
                                push({
                                  file: e.target.files[i],
                                  name: e.target.files[i].name,
                                });
                              }
                            }
                          }}
                        />
                        <span>
                          Add {!!form.values?.coverletter?.length && "more"}{" "}
                          cover letters
                        </span>
                      </label>
                      <div className="space-y-2">
                        {form.values?.coverletter?.map(
                          (file: any, index: number) => {
                            return (
                              <div
                                key={index}
                                className={
                                  "flex items-center justify-between bg-gray-200 p-2 rounded-lg mt-2"
                                }
                              >
                                <span className="block truncate flex-grow">
                                  {file.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    remove(index);
                                  }}
                                >
                                  <FiX />
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}
                </FieldArray>
                <Button
                  type="submit"
                  className="!capitalize my-4"
                  disabled={
                    (!values.resume.length && !values.coverletter.length) ||
                    uploadDocumentsMutation.isPending || submitDocumentReviewMutation.isPending
                  }
                >
                  {uploadDocumentsMutation.isPending || submitDocumentReviewMutation.isPending ? "Uploading..." : "Upload"}
                </Button>
              </form>
            )}
          </Formik>
        </div>
      </CustomModal>
    </>
  );
};

export default ClientDocument;
