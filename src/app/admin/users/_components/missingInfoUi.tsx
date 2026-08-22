import React from "react";

export const STATUS_PILLS: Record<string, { label: string; cls: string }> = {
  submitted: { label: "SUBMITTED", cls: "bg-[#DCFCE7] text-[#15803D]" },
  pending: { label: "PENDING", cls: "bg-[#FEF3C7] text-[#92400E]" },
  viewed: { label: "VIEWED", cls: "bg-[#FEF3C7] text-[#92400E]" },
  in_progress: { label: "IN PROGRESS", cls: "bg-[#EAF6FC] text-[#0876A8]" },
  cancelled: { label: "CANCELLED", cls: "bg-[#F1F5F9] text-[#5B6B7C]" },
  declined: { label: "DECLINED", cls: "bg-[#F3E8FF] text-[#6D28D9]" },
  failed: { label: "FAILED", cls: "bg-[#FEE2E2] text-[#B91C1C]" },
  expired: { label: "EXPIRED", cls: "bg-[#F1F5F9] text-[#475569]" },
};

export const OPEN_STATUSES = ["pending", "viewed", "in_progress"];

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StatusPill({ status }: { status: string }) {
  const pill = STATUS_PILLS[status] ?? {
    label: status.toUpperCase(),
    cls: "bg-[#F1F5F9] text-[#5B6B7C]",
  };
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${pill.cls}`}
    >
      {pill.label}
    </span>
  );
}
