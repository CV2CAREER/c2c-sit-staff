// components/GenericRecordsPage.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { usePromptsQueries, usePromptsMutations } from "@/hooks/api/admin/prompts";
import Loader from "../../../../../public/gifs/loader-2.gif";
import NothingFound from "../../../../../public/svg/nothing-found.svg";
import { Select } from "antd"; // Assuming Ant Design Select is used
import moment from "moment";
import { ImSpinner2 } from "react-icons/im";
import TableWithHeaderClass from "@/components/Table"; // Assuming this is a custom component
import { GridColDef } from "@mui/x-data-grid-pro"; // Assuming MUI DataGrid types
import Image from "next/image";
import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts"; // Generic types

interface GenericRecordsPageProps<
  TCategory extends PromptCategory,
  TQuestion extends PromptQuestion,
  TSimulation extends PromptSimulation,
> {
  title: string;
  apiBasePath: string; // e.g., "prompts/cv-ai" or "prompts/qa-ai"
  columnHeaders: GridColDef[];
  // Function to transform raw API response into table data
  dataTransformer: (reportsData: {
    full: TCategory[];
    prompts: TQuestion[];
    simulations: TSimulation[];
  }) => any[];
}

const GenericRecordsPage = <
  TCategory extends PromptCategory,
  TQuestion extends PromptQuestion,
  TSimulation extends PromptSimulation,
>({
  title,
  apiBasePath,
  columnHeaders,
  dataTransformer,
}: GenericRecordsPageProps<TCategory, TQuestion, TSimulation>) => {
  // --- TanStack Query Integration ---
  const { promptsDataDomain, vcsDomain, queueDomain } = usePromptsQueries({ basePath: apiBasePath });
  const { rollbackVcs, clearQueue, addToQueue } = usePromptsMutations(apiBasePath);

  const [hideVCS, setHideVCS] = useState<string[]>([]);
  const [runningRollback, setRunningRollback] = useState<string | null>(null);
  const [visiblePage, setVisiblePage] = useState("VCS");

  // Sorted VCS prompts
  const sortedVCS = useMemo(() => {
    if (!vcsDomain.data?.prompts) return [];
    const prompts = [...vcsDomain.data.prompts];
    const activePrompt = vcsDomain.data.activePrompt;
    
    return prompts.sort((a: any, b: any) => {
      if (a._id === activePrompt) return -1;
      if (b._id === activePrompt) return 1;
      return (b._id || "").localeCompare(a._id || "");
    });
  }, [vcsDomain.data]);

  // Transform data for the table
  const tableData = useMemo(() => {
    if (!promptsDataDomain.data) return [];
    return dataTransformer(promptsDataDomain.data as any);
  }, [promptsDataDomain.data, dataTransformer]);

  // Initial hideVCS state
  useEffect(() => {
    if (sortedVCS.length > 0 && hideVCS.length === 0) {
      setHideVCS(sortedVCS.map((p: any) => p._id));
    }
  }, [sortedVCS, hideVCS.length]);

  const rollbackVCSVersion = async (promptData: any) => {
    try {
      setRunningRollback(promptData?._id);
      
      // Clear existing queue if any
      if (queueDomain.data?.length > 0) {
        await clearQueue.mutateAsync();
      }

      // Add to queue
      await addToQueue.mutateAsync(promptData?.prompt.toString());

      // Rollback VCS
      await rollbackVcs.mutateAsync(promptData?._id);

      setRunningRollback(null);
      toast.success("Version rolled back successfully!");
    } catch (error: any) {
      setRunningRollback(null);
      toast.error(error?.response?.data?.message || "Unable to rollback version.");
    }
  };

  function uniqueByValue(items: any[]) {
    const set = new Set();
    return items.filter((item) => {
      const isDuplicate = set.has(item);
      set.add(item);
      return !isDuplicate;
    });
  }

  return (
    <div className="flex flex-col mt-10 h-full min-h-full">
      <div className="w-full p-8 rounded-3xl bg-white">
        <div className="flex flex-row items-start justify-between w-full gap-x-10">
          <div className="flex flex-col items-start space-y-10 w-full h-full">
            <h3 className="text-24 !font-medium font-sharp-grotesk text-career-black-200">
              {title}
            </h3>
          </div>
        </div>

        <div className="w-full h-fit">
          <Select
            defaultValue={visiblePage}
            className="w-[42px] my-4 mr-3"
            style={{ width: 250 }}
            onChange={(value) => {
              setVisiblePage(value);
            }}
            options={[
              {
                label: "Prompts Records",
                value: "records",
              },
              {
                label: "Version Control System",
                value: "VCS",
              },
            ]}
          />
        </div>

        {promptsDataDomain.isLoading || vcsDomain.isLoading ? (
          <div className="flex flex-col items-center justify-center mt-4 w-full border-2 border-gray-100 min-h-[600px] max-w-[1024px] rounded-[5px] h-full">
            <Image className="w-24 h-24" src={Loader} alt="" />
 
            <h3 className="text-sm !font-medium font-sharp-grotesk text-career-blue-500">
              Fetching records...
            </h3>
          </div>
        ) : (
          <div
            className={`flex flex-col w-full mt-4 ${
              !tableData || tableData?.length === 0
                ? "border-2 border-gray-100 items-center"
                : ""
            } min-h-[600px] rounded-[5px] h-full`}
          >
            {visiblePage === "records" ? (
              tableData && tableData.length > 0 ? (
                <TableWithHeaderClass
                  rows={tableData}
                  columns={columnHeaders}
                  getRowId={(row: any) => row._id}
                />
              ) : (
                <div className="flex flex-col items-center space-y-4 justify-center w-full h-full">
                  <Image src={NothingFound} className="w-32 h-32" alt="" />
                  <p className="text-gray-800 text-sm">No records found...</p>
                </div>
              )
            ) : visiblePage === "VCS" ? (
              <div className="w-full h-full space-y-10 border-t-2 border-t-gray-300 pt-10 flex flex-col overflow-y-auto no-scroll-btn">
                {sortedVCS.map((promptVersion, index) => {
                  return (
                    <div
                      className="w-full h-fit flex flex-row space-x-10"
                      key={index}
                    >
                      <div className="flex flex-col space-y-1 items-start mt-8 w-fit min-w-[200px]">
                        <h3 className="text-black text-sm font-medium">
                          {moment(promptVersion?.createdAt).format(
                            "DD MMM YYYY",
                          )}
                        </h3>
                        <div className="space-x-2 flex flex-row items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 6h.008v.008H6V6Z"
                            />
                          </svg>
                          <p className="text-sm text-black">
                            {promptVersion?.version
                              ?.toString()
                              .split("")
                              .join(".")}
                          </p>
                        </div>
                        <div className="space-x-2 flex flex-row items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
                            />
                          </svg>

                          <p className="text-sm text-black">
                            {promptVersion?._id
                              ?.toString()
                              .substring(
                                promptVersion?._id.toString().length,
                                promptVersion?._id.toString().length - 7,
                              )}
                          </p>
                        </div>
                        {promptVersion?._id !== vcsDomain.data?.activePrompt && (
                          <div
                            onClick={() => {
                              rollbackVCSVersion(promptVersion);
                            }}
                            className={` text-xs grid place-items-center min-w-[50px] ${
                              runningRollback !== null
                                ? "text-white bg-gray-200"
                                : "text-black bg-blue-gray-100 cursor-pointer"
                            } font-medium rounded-lg py-1.5 px-3`}
                          >
                            {runningRollback === promptVersion?._id ? (
                              <ImSpinner2 className="animate-spin text-white text-20" />
                            ) : (
                              "Rollback"
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-col flex border-gray-300 border-2 space-y-3 w-full rounded-lg min-h-[300px] h-fit">
                        <div className="flex flex-row space-x-3 w-full items-center p-3 border-b-2 border-b-gray-300">
                          <h1 className="text-[28px] text-black font-semibold">
                            v
                            {promptVersion?.version
                              ?.toString()
                              .split("")
                              .join(".")}
                          </h1>
                          {promptVersion?._id === vcsDomain.data?.activePrompt && (
                            <div className="rounded-full px-2 py-0.5 border-green-600 text-sm border text-green-600">
                              Active
                            </div>
                          )}
                        </div>
                        <article className="text-xs text-left mt-1 xl:mt-3 p-3">
                          {hideVCS.includes(promptVersion?._id) ? (
                            <pre className="w-full whitespace-pre-wrap">
                              <article>
                                {promptVersion?.prompt.slice(0, 650)}
                                {promptVersion?.prompt.length > 0 && (
                                  <span
                                    className="text-blue cursor-pointer"
                                    onClick={() => {
                                      setHideVCS((processes) => {
                                        return processes.filter(
                                          (p) => p !== promptVersion._id,
                                        );
                                      });
                                    }}
                                  >
                                    ... Read more
                                  </span>
                                )}
                              </article>
                            </pre>
                          ) : (
                            <pre className="w-full whitespace-pre-wrap">
                              {" "}
                              <article>{promptVersion?.prompt} </article>{" "}
                              {promptVersion?.prompt.length > 0 && (
                                <span
                                  className="text-blue cursor-pointer"
                                  onClick={() => {
                                    setHideVCS((processes) => {
                                      return uniqueByValue([
                                        ...processes,
                                        promptVersion._id,
                                      ]);
                                    });
                                  }}
                                >
                                  ..Hide
                                </span>
                              )}
                            </pre>
                          )}
                        </article>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericRecordsPage;
