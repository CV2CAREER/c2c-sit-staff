"use client";

import React from "react";
import { X, FileText, Download } from "lucide-react";

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
    proofFileRef?.toLowerCase().includes("/pdf");

  const isSeek = jobsiteName.toLowerCase().includes("seek");
  const markText = isSeek ? "SK" : jobsiteName.slice(0, 2).toUpperCase();
  const markColor = isSeek ? "bg-[#e21b1b]" : "bg-[#2557a7]";

  const filename = proofFileRef
    ? proofFileRef.split("/").pop() || "proof_file"
    : `${jobsiteName.toLowerCase()}_verification_screenshot.png`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14143c]/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-[#14143c]">Proof of work</h3>
          <button
            onClick={onClose}
            className="text-xl text-[#8a8fa3] hover:text-[#14143c]"
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

        <div className="flex flex-col items-center justify-center rounded-xl border border-[#ececf2] bg-[#f4f5f9] p-6 text-center">
          {proofFileRef ? (
            isPdf ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <FileText className="h-12 w-12 text-[#1e9ff2]" />
                <span className="text-[13px] font-semibold text-[#14143c]">
                  {filename}
                </span>
                <p className="text-[11.5px] text-[#8a8fa3]">PDF Document</p>
                <a
                  href={proofFileRef}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#1e9ff2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a8ddb]"
                >
                  <Download size={14} /> Open / Download PDF
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={proofFileRef}
                  alt={`Proof for ${jobsiteName}`}
                  className="max-h-[300px] w-auto rounded-lg object-contain"
                />
                <span className="text-[11.5px] font-medium text-[#8a8fa3]">
                  {filename}
                </span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-6">
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

        <div className="mt-4 flex items-center justify-between">
          {proofFileRef ? (
            <a
              href={proofFileRef}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e9ff2] hover:underline"
            >
              <Download size={13} /> Download original
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#ececf2] bg-white px-4 py-2 text-xs font-semibold text-[#14143c] hover:border-[#c9d3e0]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
