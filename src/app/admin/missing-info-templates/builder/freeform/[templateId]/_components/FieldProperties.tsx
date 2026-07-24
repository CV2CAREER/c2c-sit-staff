"use client";

import { Input } from "@/components/ui/input";
import { REFEREE_DEFAULT_FIELDS } from "@/constants/missing-info-field-types";

export interface FreeFormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  helpText: string | null;
  isRefereeBlock: boolean;
  refereeBlockIndex: number | null;
  options: { label: string; value: string }[] | null;
  isRepeatable: boolean;
  validation: Record<string, any> | null;
}

interface FieldPropertiesProps {
  field: FreeFormField | null;
  onChange: (field: FreeFormField) => void;
  onDelete: () => void;
  templateId: string;
  onSwitchToReferee?: () => void;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  date: "Date picker",
  select: "Dropdown",
  checkbox: "Multi-select",
  file: "File upload",
  number: "Number",
  phone: "Phone",
  email: "Email",
  referee_block: "Referee block",
};

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-[38px] h-[22px] rounded-full border-0 padding-0 cursor-pointer transition-colors ${
        checked ? "bg-[#0B96D6]" : "bg-[#D9DEE5]"
      }`}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all ${
          checked ? "left-[18px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

export default function FieldProperties({ field, onChange, onDelete, templateId, onSwitchToReferee }: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4 flex items-center justify-center h-full min-h-[200px]">
        <p className="text-[12px] text-[#9CA3AF] text-center">
          Select a field from the preview to edit its properties.
        </p>
      </div>
    );
  }

  if (field.isRefereeBlock) {
    return (
      <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4">
        <div className="text-[12px] font-semibold text-[#0B96D6] mb-3">
          Editing: {field.fieldLabel}
        </div>
        <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
          Field type
        </div>
        <div className="text-[13px] text-[#1F2937] mb-3">Referee block ({REFEREE_DEFAULT_FIELDS.length} sub-fields)</div>
        <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
          Sub-fields
        </div>
        <div className="text-[12px] text-[#6B7280] mb-3">
          Referee blocks contain predefined fields.
        </div>
        <button
          onClick={onSwitchToReferee}
          className="text-[#0B96D6] font-semibold hover:underline text-[12px] mb-3"
        >
          Edit in Referee Block builder →
        </button>
        <button
          onClick={onDelete}
          className="w-full border border-[#FCA5A5] text-[#DC2626] bg-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-50 transition-colors"
        >
          Delete field
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-4">
      <div className="text-[12px] font-semibold text-[#0B96D6] mb-3">
        Editing: {field.fieldLabel}
      </div>

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Field type
      </div>
      <div className="text-[13px] text-[#1F2937] mb-3">
        {FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
      </div>

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Field label
      </div>
      <Input
        type="text"
        value={field.fieldLabel}
        onChange={(e) => onChange({ ...field, fieldLabel: e.target.value })}
        className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
      />

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Help text
      </div>
      <Input
        type="text"
        value={field.helpText || ""}
        onChange={(e) => onChange({ ...field, helpText: e.target.value || null })}
        placeholder="e.g. Amazon Web Services"
        className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
      />

      {(field.fieldType === "select" || field.fieldType === "checkbox") && (
        <div className="mb-3">
          <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
            {field.fieldType === "select" ? "Dropdown options" : "Multi-select options"}
          </div>
          <div className="space-y-1.5">
            {(field.options || []).map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-1.5">
                <Input
                  type="text"
                  value={opt.label}
                  onChange={(e) => {
                    const updated = [...(field.options || [])];
                    updated[optIdx] = { ...updated[optIdx], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                    onChange({ ...field, options: updated });
                  }}
                  placeholder="Label"
                  className="w-full text-[13px] border border-[#E5E9EF] rounded-md"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = (field.options || []).filter((_, i) => i !== optIdx);
                    onChange({ ...field, options: updated.length > 0 ? updated : null });
                  }}
                  className="text-[#9CA3AF] hover:text-[#DC2626] text-lg leading-none px-1"
                  title="Remove option"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const newOption = { label: "", value: "" };
              onChange({ ...field, options: [...(field.options || []), newOption] });
            }}
            className="mt-1.5 text-[12px] text-[#0B96D6] font-semibold hover:underline"
          >
            + Add option
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] text-[#6B7280] font-medium">Required</div>
          <div className="text-[11px] text-[#9CA3AF]">Client must fill in</div>
        </div>
        <Toggle
          checked={field.isRequired}
          onToggle={() => onChange({ ...field, isRequired: !field.isRequired })}
        />
      </div>

      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] text-[#6B7280] font-medium">Multiple entries</div>
          <div className="text-[11px] text-[#9CA3AF]">Repeatable field</div>
        </div>
        <Toggle
          checked={field.isRepeatable}
          onToggle={() => onChange({ ...field, isRepeatable: !field.isRepeatable })}
        />
      </div>

      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1.5">
        Validation
      </div>
      <div className="flex items-center gap-2 mb-3">
        <select
          value={field.validation?.type || "none"}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "none") {
              onChange({ ...field, validation: null });
            } else if (val === "regex") {
              onChange({ ...field, validation: { type: "regex", pattern: "" } });
            } else if (val === "min_max") {
              onChange({ ...field, validation: { type: "min_max", min: 0, max: 999 } });
            } else if (val === "extensions") {
              onChange({ ...field, validation: { type: "extensions", allowed: [".pdf", ".doc"] } });
            }
          }}
          className="flex-1 text-[13px] border border-[#E5E9EF] rounded-md px-2.5 py-1.5 bg-white text-[#1F2937]"
        >
          <option value="none">None</option>
          {field.fieldType === "text" && <option value="regex">Regex pattern</option>}
          {field.fieldType === "text" && <option value="min_max">Min / Max length</option>}
          {field.fieldType === "textarea" && <option value="min_max">Min / Max length</option>}
          {field.fieldType === "number" && <option value="min_max">Min / Max value</option>}
          {field.fieldType === "file" && <option value="extensions">Allowed extensions</option>}
        </select>
      </div>
      {field.validation?.type === "regex" && (
        <Input
          type="text"
          value={field.validation!.pattern || ""}
          onChange={(e) => onChange({ ...field, validation: { type: "regex", pattern: e.target.value } })}
          placeholder="e.g. ^[a-zA-Z]+$"
          className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
        />
      )}
      {field.validation?.type === "min_max" && (
        <div className="flex items-center gap-2 mb-3">
          <Input
            type="number"
            value={field.validation!.min ?? ""}
            onChange={(e) => onChange({ ...field, validation: { type: "min_max", min: Number(e.target.value), max: field.validation!.max ?? 999 } })}
            placeholder="Min"
            className="w-full text-[13px] border border-[#E5E9EF] rounded-md"
          />
          <span className="text-[#9CA3AF] text-xs">to</span>
          <Input
            type="number"
            value={field.validation!.max ?? ""}
            onChange={(e) => onChange({ ...field, validation: { type: "min_max", min: field.validation!.min ?? 0, max: Number(e.target.value) } })}
            placeholder="Max"
            className="w-full text-[13px] border border-[#E5E9EF] rounded-md"
          />
        </div>
      )}
      {field.validation?.type === "extensions" && (
        <Input
          type="text"
          value={field.validation!.allowed?.join(", ") || ""}
          onChange={(e) => onChange({ ...field, validation: { type: "extensions", allowed: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) } })}
          placeholder="e.g. .pdf, .doc, .png"
          className="w-full text-[13px] mb-3 border border-[#E5E9EF] rounded-md"
        />
      )}

      <button
        onClick={onDelete}
        className="w-full border border-[#FCA5A5] text-[#DC2626] bg-white rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-50 transition-colors"
      >
        Delete field
      </button>
    </div>
  );
}
