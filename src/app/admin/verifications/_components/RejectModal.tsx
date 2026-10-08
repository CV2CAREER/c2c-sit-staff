"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useJobsiteRejectReasons } from "@/hooks/api/jobsite-verification.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  jobsiteName: string;
  isSubmitting?: boolean;
}

const DEFAULT_PRESET_REASONS = [
  "Document unreadable, blurry, or low quality",
  "Name on proof does not match client account",
  "Proof does not show completed jobsite verification",
  "Screenshot is missing required account or profile details",
  "Document is expired or invalid",
  "Incorrect jobsite submitted for this requirement",
];

export default function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  jobsiteName,
  isSubmitting = false,
}: RejectModalProps) {
  const { reasons: apiReasons } = useJobsiteRejectReasons();
  const [selectedReason, setSelectedReason] = useState("");
  const [otherText, setOtherText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedReason("");
      setOtherText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Merge API reasons with default preset reasons, removing duplicates
  const allReasonStrings = Array.from(
    new Set([
      ...apiReasons.map((r) => r.reason),
      ...DEFAULT_PRESET_REASONS,
    ])
  ).filter(Boolean);

  const isOther = selectedReason === "other";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = isOther ? otherText.trim() : selectedReason;

    if (!finalReason) return;
    onConfirm(finalReason);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14143c]/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-[#14143c]">
            Reject verification
          </h3>
          <button
            onClick={onClose}
            className="text-xl text-[#8a8fa3] hover:text-[#14143c] p-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 mb-4 text-[12.5px] text-[#8a8fa3]">
          Let the client know why their <strong className="text-[#14143c]">{jobsiteName}</strong> submission was rejected.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Reason <span className="text-red-500">*</span>
            </label>
            <Select
              value={selectedReason}
              onValueChange={(val) => setSelectedReason(val)}
            >
              <SelectTrigger className="w-full rounded-lg border border-[#ececf2] bg-white p-2.5 text-[13px] text-[#14143c] h-10 outline-none focus:border-[#1e9ff2] focus:ring-1 focus:ring-[#1e9ff2]">
                <SelectValue placeholder="Select a rejection reason…" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-full bg-white border border-[#ececf2] rounded-lg shadow-lg z-[100]">
                {allReasonStrings.map((reason) => (
                  <SelectItem key={reason} value={reason} className="whitespace-normal leading-tight text-xs py-2">
                    {reason}
                  </SelectItem>
                ))}
                <SelectItem value="other" className="whitespace-normal leading-tight text-xs py-2 font-medium text-[#1e9ff2]">
                  Other — specify custom reason
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Render custom free-text field when Other is selected */}
          {isOther && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
                Custom Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Explain clearly to the client what needs to be fixed before re-uploading…"
                rows={3}
                required
                className="w-full resize-y rounded-lg border border-[#ececf2] p-2.5 text-[13px] text-[#14143c] outline-none focus:border-[#1e9ff2] focus:ring-1 focus:ring-[#1e9ff2]"
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#ececf2] bg-white px-4 py-2 text-xs font-semibold text-[#14143c] hover:border-[#c9d3e0] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason || (isOther && !otherText.trim())}
              className="rounded-lg bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b91c1c] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? "Rejecting…" : "Reject verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
