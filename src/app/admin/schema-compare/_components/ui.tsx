"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { DiffChange, DiffSeverity } from "./types";

export const SEVERITY_STYLES: Record<DiffSeverity, { badge: string; dot: string; label: string; tile: string }> = {
  critical: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    label: "Critical",
    tile: "border-red-200 bg-red-50 text-red-700",
  },
  warning: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    label: "Warning",
    tile: "border-amber-200 bg-amber-50 text-amber-800",
  },
  info: {
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
    label: "Info",
    tile: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export const SEVERITY_HELP: Record<DiffSeverity, string> = {
  critical: "Will likely cause errors for code written against the source schema.",
  warning: "Behaves differently or risks data integrity — review before deploying.",
  info: "Cosmetic or performance-only differences.",
};

export const changeLabel = (change: DiffChange, sourceLabel: string, targetLabel: string) => {
  switch (change) {
    case "missing_in_target":
      return { text: `Missing in ${targetLabel}`, className: "bg-red-50 text-red-700 ring-red-200" };
    case "extra_in_target":
      return { text: `Only in ${targetLabel}`, className: "bg-violet-50 text-violet-700 ring-violet-200" };
    case "modified":
      return { text: "Different", className: "bg-amber-50 text-amber-800 ring-amber-200" };
    case "renamed":
      return { text: "Renamed", className: "bg-slate-100 text-slate-700 ring-slate-200" };
    case "duplicate":
      return { text: "Duplicate", className: "bg-orange-50 text-orange-700 ring-orange-200" };
    default:
      return { text: change, className: "bg-gray-100 text-gray-700 ring-gray-200" };
  }
};

export const Pill = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
      className,
    )}
  >
    {children}
  </span>
);

export const SeverityPill = ({ severity }: { severity: DiffSeverity }) => (
  <Pill className={SEVERITY_STYLES[severity].badge}>
    <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_STYLES[severity].dot)} />
    {SEVERITY_STYLES[severity].label}
  </Pill>
);

export const copyText = async (text: string, what = "Copied") => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} to clipboard`);
    return true;
  } catch {
    toast.error("Your browser blocked clipboard access — select the text and copy it manually.");
    return false;
  }
};

export const downloadFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const CopyButton = ({
  text,
  label = "Copy",
  what,
  className,
}: {
  text: string;
  label?: string;
  what?: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text, what)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
};

export const DownloadButton = ({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
  >
    <Download className="h-3.5 w-3.5" />
    {label}
  </button>
);

export const formatMs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

export const timeAgo = (iso: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(iso).toLocaleString();
};

export const fileStamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
