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

interface AddJobsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    jobsiteId: string;
    country: string;
    required: boolean;
    videoGuideUrl?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function AddJobsiteModal({
  isOpen,
  onClose,
  onAdd,
  isSubmitting = false,
}: AddJobsiteModalProps) {
  const [jobsiteId, setJobsiteId] = useState("");
  const [country, setCountry] = useState("Australia");
  const [customCountry, setCustomCountry] = useState("");
  const [required, setRequired] = useState(true);
  const [videoGuideUrl, setVideoGuideUrl] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCountry = country === "other" ? customCountry.trim() : country;
    if (!jobsiteId.trim() || !finalCountry) return;

    try {
      await onAdd({
        jobsiteId: jobsiteId.trim(),
        country: finalCountry,
        required,
        videoGuideUrl: videoGuideUrl.trim() || undefined,
      });
      setJobsiteId("");
      setCustomCountry("");
      setVideoGuideUrl("");
      onClose();
    } catch {
      // Keep modal open on error so user does not lose their input
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14143c]/35 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold text-[#14143c]">Add jobsite</h3>
          <button
            onClick={onClose}
            className="text-xl text-[#8a8fa3] hover:text-[#14143c]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 mb-4 text-[12.5px] text-[#8a8fa3]">
          Configure a jobsite requirement and video guide for a country.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Jobsite Name / ID
            </label>
            <input
              type="text"
              value={jobsiteId}
              onChange={(e) => setJobsiteId(e.target.value)}
              placeholder="e.g. Seek, Indeed, LinkedIn, Totaljobs"
              required
              className="w-full rounded-lg border border-[#ececf2] p-2.5 text-[13px] text-[#14143c] outline-none focus:border-[#1e9ff2]"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Country Assignment
            </label>
            <Select value={country} onValueChange={(val) => setCountry(val)}>
              <SelectTrigger className="w-full rounded-lg border border-[#ececf2] bg-white p-2.5 text-[13px] text-[#14143c] h-10 outline-none focus:border-[#1e9ff2] focus:ring-1 focus:ring-[#1e9ff2]">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-full bg-white border border-[#ececf2] rounded-lg shadow-lg z-[100]">
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Canada">Canada</SelectItem>
                <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                <SelectItem value="United States">United States</SelectItem>
                <SelectItem value="New Zealand">New Zealand</SelectItem>
                <SelectItem value="Ireland">Ireland</SelectItem>
                <SelectItem value="other">Other country (specify below)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {country === "other" && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
                Custom Country Name
              </label>
              <input
                type="text"
                value={customCountry}
                onChange={(e) => setCustomCountry(e.target.value)}
                placeholder="e.g. Germany"
                required
                className="w-full rounded-lg border border-[#ececf2] p-2.5 text-[13px] text-[#14143c] outline-none focus:border-[#1e9ff2]"
              />
            </div>
          )}

          <div className="mb-4 flex items-center justify-between rounded-lg border border-[#ececf2] p-3">
            <div>
              <div className="text-xs font-semibold text-[#14143c]">
                Requirement status
              </div>
              <div className="text-[11.5px] text-[#8a8fa3]">
                {required
                  ? "Required for clients in this country"
                  : "Turned Off (optional/disabled)"}
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-[#d8dae3] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#1e9ff2] peer-checked:after:translate-x-4"></div>
            </label>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-[#14143c]">
              Video Guide URL (optional)
            </label>
            <input
              type="url"
              value={videoGuideUrl}
              onChange={(e) => setVideoGuideUrl(e.target.value)}
              placeholder="https://scribehow.com/shared/..."
              className="w-full rounded-lg border border-[#ececf2] p-2.5 text-[13px] text-[#14143c] outline-none focus:border-[#1e9ff2]"
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
              {isSubmitting ? "Adding…" : "Add jobsite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
