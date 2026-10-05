"use client";

import React, { useState } from "react";
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

export default function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  jobsiteName,
  isSubmitting = false,
}: RejectModalProps) {
  const { reasons } = useJobsiteRejectReasons();
  const [selectedReason, setSelectedReason] = useState("");
  const [otherText, setOtherText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedReason === "other"
        ? otherText.trim()
        : selectedReason || otherText.trim();

    if (!finalReason) return;
    onConfirm(finalReason);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14143c]/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-[#14143c]">
            Reject verification
          </h3>
          <button
            onClick={onClose}
            className="text-xl text-[#8a8fa3] hover:text-[#14143c]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 mb-4 text-[12.5px] text-[#8a8fa3]">
          Let the client know why the {jobsiteName} submission was rejected.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Reason
            </label>
            <Select
              value={selectedReason}
              onValueChange={(val) => setSelectedReason(val)}
            >
              <SelectTrigger className="w-full rounded-lg border border-[#ececf2] bg-white p-2.5 text-[13px] text-[#14143c] h-10 outline-none focus:border-[#1e9ff2] focus:ring-1 focus:ring-[#1e9ff2]">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-full bg-white border border-[#ececf2] rounded-lg shadow-lg z-[100]">
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.reason} className="whitespace-normal leading-tight text-xs py-2">
                    {r.reason}
                  </SelectItem>
                ))}
                <SelectItem value="other" className="whitespace-normal leading-tight text-xs py-2">Other — specify below</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedReason === "other" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
                Details
              </label>
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Add a short, professional explanation for the client…"
                rows={3}
                required
                className="w-full resize-y rounded-lg border border-[#ececf2] p-2.5 text-[13px] text-[#14143c] outline-none focus:border-[#1e9ff2]"
              />
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#ececf2] bg-white px-4 py-2 text-xs font-semibold text-[#14143c] hover:border-[#c9d3e0]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#dc2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-50"
            >
              {isSubmitting ? "Rejecting…" : "Reject verification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
