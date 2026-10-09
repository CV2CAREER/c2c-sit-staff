"use client";

import React from "react";
import { X, FileText, Download, ExternalLink } from "lucide-react";

interface ProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobsiteName: string;
  clientName: string;
  proofFileRef?: string | null;
}

export default function ProofModal({
  isOpen,
  onClose,
  jobsiteName,
  clientName,
  proofFileRef,
}: ProofModalProps) {
  if (!isOpen) return null;

  const isPdf =
    proofFileRef?.toLowerCase().endsWith(".pdf") ||
    proofFileRef?.toLowerCase().includes("application/pdf") ||
    proofFileRef?.toLowerCase().includes("/pdf");

  const isImage =
    proofFileRef?.toLowerCase().match(/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i) ||
    proofFileRef?.toLowerCase().startsWith("data:image/");

  const isSeek = jobsiteName.toLowerCase().includes("seek");
  const markText = isSeek ? "SK" : jobsiteName.slice(0, 2).toUpperCase();
  const markColor = isSeek ? "bg-[#e21b1b]" : "bg-[#2557a7]";

  const filename = proofFileRef
    ? proofFileRef.startsWith("data:")
      ? `${jobsiteName.toLowerCase()}_verification_${Date.now()}.${isPdf ? "pdf" : "png"}`
      : proofFileRef.split("/").pop()?.split("?")[0] || "proof_file"
    : `${jobsiteName.toLowerCase()}_verification_screenshot.png`;

  const handleDownload = async () => {
    if (!proofFileRef) return;
    try {
      if (proofFileRef.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = proofFileRef;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(proofFileRef);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback in case of CORS or browser blocking
      const newTab = window.open(proofFileRef, "_blank");
      if (!newTab) {
        window.location.href = proofFileRef;
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14143c]/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-[#14143c]">Proof of work</h3>
          <button
            onClick={onClose}
            className="text-xl text-[#8a8fa3] hover:text-[#14143c] p-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 mb-4 flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${markColor}`}
          >
            {markText}
          </div>
          <div>
            <div className="text-[13.5px] font-bold text-[#14143c]">
              {jobsiteName}
            </div>
            <div className="text-[11.5px] text-[#8a8fa3]">{clientName}</div>
          </div>
        </div>

        {/* Document Preview Area */}
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-[#ececf2] bg-[#f8f9fc] p-3 text-center min-h-[260px] overflow-hidden select-none"
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {proofFileRef ? (
            isPdf ? (
              <div className="flex w-full flex-col items-center gap-3">
                <div
                  className="relative w-full h-[320px] rounded-lg overflow-hidden border border-[#ececf2] bg-white shadow-sm flex items-start justify-center"
                  onWheel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <iframe
                    src={`${proofFileRef}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&pagemode=none`}
                    title={filename}
                    scrolling="no"
                    tabIndex={-1}
                    className="w-full h-[650px] -mt-1 pointer-events-none border-none select-none"
                  />
                  {/* Event shield to completely block scroll wheel & interactions */}
                  <div
                    className="absolute inset-0 bg-transparent cursor-default pointer-events-auto"
                    onWheel={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between w-full px-2 pt-1 text-xs">
                  <span className="font-semibold text-[#14143c] truncate max-w-[280px]">
                    {filename}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e9ff2] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1a8ddb] transition cursor-pointer"
                  >
                    <Download size={13} /> Open / Download PDF
                  </button>
                </div>
              </div>
            ) : isImage ? (
              <div className="flex flex-col items-center gap-2.5 w-full">
                <div className="relative w-full h-[320px] rounded-lg overflow-hidden border border-[#ececf2] bg-white shadow-sm flex items-center justify-center">
                  <img
                    src={proofFileRef}
                    alt={`Proof for ${jobsiteName}`}
                    className="h-full w-full object-contain pointer-events-none select-none"
                  />
                </div>
                <span className="text-[11.5px] font-medium text-[#8a8fa3]">
                  {filename}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <FileText className="h-12 w-12 text-[#1e9ff2]" />
                <span className="text-[13px] font-semibold text-[#14143c]">
                  {filename}
                </span>
                <p className="text-[11.5px] text-[#8a8fa3]">Document Attachment</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#1e9ff2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a8ddb] transition"
                >
                  <Download size={14} /> Open / Download file
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <FileText className="h-10 w-10 text-[#8a8fa3]" />
              <div className="text-[12.5px] font-semibold text-[#14143c]">
                {filename}
              </div>
              <div className="text-[11.5px] text-[#8a8fa3]">
                No proof file uploaded yet
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 flex items-center justify-between">
          {proofFileRef ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e9ff2] hover:underline cursor-pointer"
              >
                <Download size={13} /> Download original
              </button>
              <a
                href={proofFileRef}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a8fa3] hover:text-[#14143c] hover:underline"
              >
                <ExternalLink size={13} /> Open in new tab
              </a>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#ececf2] bg-white px-4 py-2 text-xs font-semibold text-[#14143c] hover:border-[#c9d3e0] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
