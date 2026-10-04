"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { value: "identity", label: "Identity" },
  { value: "work_rights", label: "Work Rights" },
  { value: "references", label: "References" },
  { value: "certifications", label: "Certifications" },
  { value: "banking", label: "Banking" },
  { value: "housekeeping", label: "Database (Housekeeping)" },
];

const TYPES = [
  { value: "free_form", label: "Free Form" },
  { value: "referee_block", label: "Referee Block" },
];

interface BuilderToolbarProps {
  templateName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onPublish?: () => void;
  onPreview?: () => void;
  isSaving: boolean;
  isPublishing?: boolean;
  isPublished?: boolean;
  backHref: string;
  category?: string;
  onCategoryChange?: (category: string) => void;
  type?: string;
  onTypeChange?: (type: string) => void;
}

export default function BuilderToolbar({
  templateName,
  onNameChange,
  onSave,
  onPublish,
  onPreview,
  isSaving,
  isPublishing,
  isPublished,
  backHref,
  category,
  onCategoryChange,
  type,
  onTypeChange,
}: BuilderToolbarProps) {
  const router = useRouter();

  return (
    <div className="bg-white border-b border-[#E5E9EF]">
      <div className="flex items-center gap-3.5 px-7 py-4">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2 rounded-full bg-[#F3F4F6] hover:bg-[#E5E9EF] transition-colors text-[#10365A] pl-2 pr-3 py-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[13px] font-semibold whitespace-nowrap">Missing Information Templates</span>
        </button>
        <label className="text-[13px] font-semibold text-[#1F2937] whitespace-nowrap">
          Template name:
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => onNameChange(e.target.value)}
          className="border border-[#E5E9EF] rounded-lg px-3 py-2 text-[13px] w-[260px] focus:outline-none focus:border-[#0B96D6]"
        />
        <div className="flex-1" />
        <button
          onClick={onPreview}
          className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors"
        >
          Preview
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="border border-[#E5E9EF] bg-white text-[#10365A] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#F9FAFB] transition-colors disabled:opacity-45"
        >
          {isSaving ? "Saving..." : "Save draft"}
        </button>
        {onPublish && (
          <button
            onClick={onPublish}
            disabled={isPublishing || isPublished}
            className="bg-[#0B96D6] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0a86c0] transition-colors disabled:opacity-45"
          >
            {isPublishing ? "Publishing..." : isPublished ? "Published" : "Publish template"}
          </button>
        )}
      </div>

      {/* Type + Category row */}
      <div className="flex items-center gap-4 px-7 pb-3">
        {onTypeChange && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Type:</span>
            <div className="flex bg-[#F3F4F6] rounded-lg p-0.5">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => onTypeChange(t.value)}
                  className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-colors ${
                    type === t.value
                      ? "bg-white text-[#10365A] shadow-sm"
                      : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {onCategoryChange && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Category:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => onCategoryChange(cat.value)}
                  className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                    category === cat.value
                      ? "bg-[#0B96D6] text-white"
                      : "bg-white text-[#1F2937] border border-[#E5E9EF] hover:border-[#0B96D6]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
