"use client";

import { FIELD_TYPES, REFEREE_BLOCK_FIELD_TYPE } from "@/constants/missing-info-field-types";
import DraggableFieldType from "./DraggableFieldType";

interface FieldTypePanelProps {
  onAddField: (fieldType: string) => void;
}

export default function FieldTypePanel({ onAddField }: FieldTypePanelProps) {
  return (
    <div className="bg-white border border-[#E5E9EF] rounded-[10px] p-3.5">
      <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2">
        Field types
      </div>
      {FIELD_TYPES.map((ft) => (
        <DraggableFieldType
          key={ft.type}
          fieldType={ft.type}
          label={ft.label}
          onDrop={onAddField}
        />
      ))}
      <div className="border-t border-[#E5E9EF] mt-2 pt-2">
        <DraggableFieldType
          fieldType={REFEREE_BLOCK_FIELD_TYPE.type}
          label={REFEREE_BLOCK_FIELD_TYPE.label}
          onDrop={onAddField}
        />
      </div>
    </div>
  );
}
