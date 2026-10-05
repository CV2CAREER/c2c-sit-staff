"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExemptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, note?: string) => void;
  clientName?: string;
  isBulk?: boolean;
  selectedCount?: number;
  isSubmitting?: boolean;
}

export default function ExemptModal({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  isBulk = false,
  selectedCount = 0,
  isSubmitting = false,
}: ExemptModalProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const title = isBulk ? `Exempt ${selectedCount} selected` : `Exempt ${clientName || "client"}`;
  const subtext = isBulk
    ? "These clients will no longer be required to complete jobsite verification. You can reverse this later."
    : `${clientName || "This client"} will no longer be required to complete jobsite verification. You can reverse this later.`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onConfirm(reason, note.trim() || undefined);
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
          <h3 className="text-base font-bold text-[#14143c]">{title}</h3>
          <button
            onClick={onClose}
            className="text-xl text-[#8a8fa3] hover:text-[#14143c]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 mb-4 text-[12.5px] text-[#8a8fa3]">{subtext}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Reason for exemption
            </label>
            <Select value={reason} onValueChange={(val) => setReason(val)}>
              <SelectTrigger className="w-full rounded-lg border border-[#ececf2] bg-white p-2.5 text-[13px] text-[#14143c] h-10 outline-none focus:border-[#1e9ff2] focus:ring-1 focus:ring-[#1e9ff2]">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-full bg-white border border-[#ececf2] rounded-lg shadow-lg z-[100]">
                <SelectItem value="Client is exempt per country/programme rules" className="whitespace-normal leading-tight text-xs py-2">
                  Client is exempt per country/programme rules
                </SelectItem>
                <SelectItem value="Manual verification already completed off-platform" className="whitespace-normal leading-tight text-xs py-2">
                  Manual verification already completed off-platform
                </SelectItem>
                <SelectItem value="Jobsite not applicable to this client's campaign" className="whitespace-normal leading-tight text-xs py-2">
                  Jobsite not applicable to this client's campaign
                </SelectItem>
                <SelectItem value="Other — specify below" className="whitespace-normal leading-tight text-xs py-2">
                  Other — specify below
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any context for the team…"
              rows={3}
              className="w-full resize-y rounded-lg border border-[#ececf2] p-2.5 text-[13px] text-[#14143c] outline-none focus:border-[#1e9ff2]"
            />
          </div>

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
              className="rounded-lg bg-[#1e9ff2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1a8ddb] disabled:opacity-50"
            >
              {isSubmitting ? "Confirming…" : "Confirm exemption"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
