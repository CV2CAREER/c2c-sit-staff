import type { FaqArticleStatus } from "@/types/faq.types";

const STATUS_STYLES: Record<FaqArticleStatus, { label: string; className: string }> = {
  published: {
    label: "Published",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  in_review: {
    label: "In review",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
};

export function StatusBadge({ status }: { status: FaqArticleStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function BotBadge({ botAnswerable }: { botAnswerable: boolean }) {
  return botAnswerable ? (
    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-sky-50 text-[#0B96D6] border border-sky-200">
      Bot OK
    </span>
  ) : (
    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      Human only
    </span>
  );
}

export const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
