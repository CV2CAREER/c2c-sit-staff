"use client";

import { useState } from "react";
import { FIELD_TYPES } from "@/constants/missing-info-field-types";

export interface FieldToggleRow {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  helpText: string | null;
}

interface FieldToggleTableProps {
  fields: FieldToggleRow[];
  onChange: (fields: FieldToggleRow[]) => void;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "SHORT TEXT",
  email: "EMAIL",
  phone: "PHONE",
  date: "DATE",
  select: "DROPDOWN",
  textarea: "LONG TEXT",
  number: "NUMBER",
  file: "FILE",
  checkbox: "CHECKBOX",
};

function toFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

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

export default function FieldToggleTable({ fields, onChange }: FieldToggleTableProps) {
  const [newFieldType, setNewFieldType] = useState("text");

  const updateField = (index: number, patch: Partial<FieldToggleRow>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const addField = () => {
    const label = FIELD_TYPE_LABELS[newFieldType] || newFieldType;
    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    const newRow: FieldToggleRow = {
      fieldName: toFieldName(displayLabel),
      fieldLabel: displayLabel,
      fieldType: newFieldType,
      isRequired: false,
      isVisible: true,
      helpText: null,
    };
    onChange([...fields, newRow]);
  };

  return (
    <div className="bg-white border border-[#E5E9EF] rounded-[10px] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#E5E9EF]">
            <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wide px-4 py-2.5 font-semibold">
              Field label
            </th>
            <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wide px-4 py-2.5 font-semibold">
              Type
            </th>
            <th className="text-center text-[11px] text-[#6B7280] uppercase tracking-wide px-4 py-2.5 font-semibold w-[100px]">
              Required
            </th>
            <th className="text-center text-[11px] text-[#6B7280] uppercase tracking-wide px-4 py-2.5 font-semibold w-[100px]">
              Show
            </th>
            <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wide px-4 py-2.5 font-semibold">
              Help text
            </th>
            <th className="w-[50px]" />
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr
              key={`${field.fieldName}-${index}`}
              className={`border-b border-[#E5E9EF] last:border-b-0 transition-colors ${
                !field.isVisible ? "bg-[#F9FAFB] opacity-60" : ""
              }`}
            >
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={field.fieldLabel}
                  onChange={(e) => updateField(index, { fieldLabel: e.target.value })}
                  className="w-full text-[13px] text-[#1F2937] font-medium bg-transparent border border-transparent hover:border-[#D9DEE5] focus:border-[#0B96D6] rounded px-1.5 py-0.5 outline-none transition-colors"
                />
              </td>
              <td className="px-4 py-3">
                <select
                  value={field.fieldType}
                  onChange={(e) => updateField(index, { fieldType: e.target.value })}
                  className="text-[13px] text-[#6B7280] font-semibold uppercase tracking-wider bg-transparent border border-transparent hover:border-[#D9DEE5] focus:border-[#0B96D6] rounded px-1.5 py-0.5 outline-none transition-colors cursor-pointer"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.type} value={ft.type}>
                      {FIELD_TYPE_LABELS[ft.type] || ft.type}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Toggle
                    checked={field.isRequired}
                    onToggle={() => updateField(index, { isRequired: !field.isRequired })}
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Toggle
                    checked={field.isVisible}
                    onToggle={() => updateField(index, { isVisible: !field.isVisible })}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={field.helpText || ""}
                  onChange={(e) => updateField(index, { helpText: e.target.value || null })}
                  placeholder="—"
                  className="w-full text-[13px] text-[#9CA3AF] bg-transparent border border-transparent hover:border-[#D9DEE5] focus:border-[#0B96D6] rounded px-1.5 py-0.5 outline-none transition-colors italic"
                />
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-[#9CA3AF] hover:text-[#DC2626] text-lg leading-none px-1 transition-colors"
                  title="Remove field"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
          <tr className="border-t border-[#E5E9EF] bg-[#F9FAFB]">
            <td className="px-4 py-3" colSpan={6}>
              <div className="flex items-center gap-2">
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="text-[13px] border border-[#E5E9EF] rounded-md px-2.5 py-1.5 bg-white text-[#1F2937]"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.type} value={ft.type}>
                      {ft.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addField}
                  className="text-[13px] text-white bg-[#0B96D6] hover:bg-[#0A85C0] rounded-md px-3 py-1.5 font-medium transition-colors"
                >
                  + Add field
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
