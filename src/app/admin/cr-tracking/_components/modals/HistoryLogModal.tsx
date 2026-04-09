"use client";
import { useEffect } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import hlogo from "../../../../../../public/svg/h-logo.svg";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VisuallyHidden from "@/components/ui/visually-hidden";

// 1. Define the interface for a single CR Log entry
interface CrLog {
  createdAt: string; // Or Date if you plan to convert it to Date objects earlier
  createdBy: string;
  updatedBy: string;
  nilUpdatedBy: string;
  nilNotifiedBy: string;
  nilNotifiedAt: string | null; // Can be null if not notified
  // Add other properties if your crLog object has more
}

// 2. Define the interface for the component's props
interface HistoryLogModalProps {
  isHistoryLogModalOpen: boolean;
  setIsHistoryLogModalOpen: (isOpen: boolean) => void;
  crLogs: CrLog[]; // Use the CrLog interface for the array
  setCrLogPage: (page: number | ((current: number) => number)) => void; // Function to update page, can take a number or a function
  crLogPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  totalLogs: number;
  isLogsLoading: boolean;
}

function HistoryLogModal({
  isHistoryLogModalOpen,
  setIsHistoryLogModalOpen,
  crLogs,
  setCrLogPage,
  crLogPage,
  hasPrevPage,
  hasNextPage,
  totalLogs,
  isLogsLoading,
}: HistoryLogModalProps) {
  useEffect(() => {
    // console.log("get log here");
  }, []);

  const formatDateToString = (date: string | Date): string => {
    const newDate = new Date(date);
    return newDate.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Dialog
      open={isHistoryLogModalOpen}
      onOpenChange={() => setIsHistoryLogModalOpen(false)}
    >
      <DialogContent className="min-w-3xl">
        {/* Assuming VisuallyHidden is correctly imported and used */}
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>History Log Modal</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>

        <div className="bg-white rounded-lg">
          <div className="flex item-center justify-between p-4">
            <button
              onClick={() => {
                setIsHistoryLogModalOpen(false);
              }}
              className="border-2 text-center rounded-md p-2"
            >
              Go Back
            </button>
            <h2 className="text-2xl font-semibold text-blue">
              CR History Logs
            </h2>
          </div>
          {isLogsLoading ? (
            <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
              <div className="h-[8rem] flex items-center justify-center animate-pulse">
                <Image className="" src={hlogo} alt="Laigus logo" />
              </div>
            </div>
          ) : (
            <div>
              {/* header */}
              <div className="bg-[#F3F3F3] border-b flex w-full space-x-3 p-4">
                <div className="w-1/6">
                  <h2>Timestamp</h2>
                </div>
                <div className="w-1/6">
                  <h2>Created By</h2>
                </div>
                <div className="w-1/6">
                  <h2>Updated By</h2>
                </div>
                <div className="w-1/6">
                  <h2>NIL updated By</h2>
                </div>
                <div className="w-1/6">
                  <h2>NIL Trigered By</h2>
                </div>
                <div className="w-1/6">
                  <h2>NIL Trigered at</h2>
                </div>
              </div>
              {/* This will have a scrollable height */}
              <div className="w-full max-h-[55vh] overflow-y-auto p-4 space-y-2 scrollbar scrollbar-thumb-blue scrollbar-track-gray-200">
                {crLogs?.map((crLog, index) => (
                  <div className="w-full flex space-x-3" key={index}>
                    <div className="w-1/6 break-words p-2">
                      <p>{formatDateToString(crLog?.createdAt)}</p>
                    </div>
                    <div className="w-1/6 break-words p-2">
                      <p>{crLog?.createdBy}</p>
                    </div>
                    <div className="w-1/6 break-words p-2">
                      <p>{crLog?.updatedBy}</p>
                    </div>
                    <div className="w-1/6 break-words p-2">
                      <p>{crLog?.nilUpdatedBy}</p>
                    </div>
                    <div className="w-1/6 break-words p-2">
                      <p>{crLog?.nilNotifiedBy}</p>
                    </div>
                    <div className="w-1/6 break-words p-2">
                      <p>
                        {crLog?.nilNotifiedAt
                          ? formatDateToString(crLog?.nilNotifiedAt)
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end  w-full rounded-xl items-center p-4 bg-white sticky bottom-0 z-10 gap-[8px]">
            <div className="flex flex-col">
              <div className="flex justify-end space-x-4 items-center">
                <FaChevronLeft
                  className={`hover:cursor-pointer ${hasPrevPage ? "text-blue" : ""}`}
                  onClick={() => {
                    setCrLogPage((current) =>
                      hasPrevPage ? (current -= 1) : current
                    );
                  }}
                />
                <p>{crLogPage}</p>
                <FaChevronRight
                  className={`hover:cursor-pointer ${hasNextPage ? "text-blue" : ""}`}
                  onClick={() => {
                    setCrLogPage((current) =>
                      hasNextPage ? (current += 1) : current
                    );
                  }}
                />
              </div>
              <div className="mt-2">
                <p>{`Has a total of ${totalLogs} Logs`}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HistoryLogModal;
