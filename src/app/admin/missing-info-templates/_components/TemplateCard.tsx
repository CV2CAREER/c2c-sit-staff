"use client";

import { Trash2 } from "lucide-react";
import { MissingInfoTemplate } from "@/hooks/api/missing-info-template.api";

interface TemplateCardProps {
  template: MissingInfoTemplate;
  onEdit: (template: MissingInfoTemplate) => void;
  onDelete: (template: MissingInfoTemplate) => void;
  onPublish: (template: MissingInfoTemplate) => void;
  onSend: (template: MissingInfoTemplate) => void;
  /** Housekeeping templates raise an internal staff task instead of a client send. */
  onRaiseTask?: (template: MissingInfoTemplate) => void;
}

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Not yet sent";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function TemplateCard({ template, onEdit, onDelete, onPublish, onSend, onRaiseTask }: TemplateCardProps) {
  const isDraft = template.status === "draft";
  const isHousekeeping = template.category === "housekeeping";
  const fieldCount = template.fields?.length ?? 0;
  const fieldLabel = template.type === "referee_block"
    ? `${fieldCount} referee fields \u00b7 Dynamic count`
    : `${fieldCount} fields \u00b7 ${template.category?.replace(/_/g, " ") || "General"}`;
  const usedText = template.publishCount > 0
    ? `Used ${template.publishCount} times \u00b7 Last sent ${relativeTime((template as any).lastSentAt)}`
    : `Last edited ${relativeTime((template as any).updatedAt)} \u00b7 Not yet published`;

  return (
    <div className="bg-white border border-[#E5E9EF] rounded-xl overflow-hidden">
      {/* Status badge */}
      <div className={`px-3.5 pt-3.5 pb-3 flex items-start ${isDraft ? "bg-[#FDF3E7]" : "bg-[#ECFDF5]"}`}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(template); }}
          className="mr-auto text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
          title="Delete template"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <span className={`text-[11px] font-bold tracking-wider ml-auto ${isDraft ? "text-[#B45309]" : "text-[#16A34A]"}`}>
          {isDraft ? "DRAFT" : "PUBLISHED"}
        </span>
      </div>

      {/* Meta */}
      <div className="px-3.5 pt-3.5 pb-1">
        <h4 className="text-[14px] font-semibold text-[#1F2937] m-0 leading-snug">{template.name}</h4>
        <div className="text-[12px] text-[#6B7280] mt-1">{fieldLabel}</div>
        <div className="text-[12px] text-[#9CA3AF] mt-0.5">
          {usedText}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-3.5 pb-3.5 mt-2">
        <button
          onClick={() => onEdit(template)}
          className="flex-1 text-center text-[13px] font-semibold py-2 rounded-lg border border-[#E5E9EF] bg-white text-[#10365A] hover:bg-[#F9FAFB] transition-colors"
        >
          Edit
        </button>
        {isHousekeeping ? (
          <button
            onClick={() => onRaiseTask?.(template)}
            className="flex-1 text-center text-[13px] font-semibold py-2 rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors"
          >
            Raise as staff task
          </button>
        ) : isDraft ? (
          <button
            disabled
            className="flex-1 text-center text-[13px] font-semibold py-2 rounded-lg border border-[#E5E9EF] text-[#9CA3AF] bg-white cursor-not-allowed"
          >
            Send 🔒
          </button>
        ) : (
          <button
            onClick={() => onSend(template)}
            className="flex-1 text-center text-[13px] font-semibold py-2 rounded-lg bg-[#0B96D6] text-white hover:bg-[#0a86c0] transition-colors"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
