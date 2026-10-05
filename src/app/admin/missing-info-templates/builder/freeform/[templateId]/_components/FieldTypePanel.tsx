"use client";

import {
  EXTERNAL_ACTION_FIELD_TYPE,
  FIELD_TYPES,
  INSTRUCTIONS_FIELD_TYPE,
  REFEREE_BLOCK_FIELD_TYPE,
} from "@/constants/missing-info-field-types";
import DraggableFieldType from "./DraggableFieldType";

interface FieldTypePanelProps {
  onAddField: (fieldType: string) => void;
  /** A template can hold only one External Action block. */
  hasExternalAction?: boolean;
}

export default function FieldTypePanel({ onAddField, hasExternalAction = false }: FieldTypePanelProps) {
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
        <DraggableFieldType
          fieldType={INSTRUCTIONS_FIELD_TYPE.type}
          label={INSTRUCTIONS_FIELD_TYPE.label}
          onDrop={onAddField}
          title="Free text for the customer to read. Links are clickable. No answer is collected."
        />
        <DraggableFieldType
          fieldType={EXTERNAL_ACTION_FIELD_TYPE.type}
          label={EXTERNAL_ACTION_FIELD_TYPE.label}
          onDrop={onAddField}
          highlight
          disabled={hasExternalAction}
          title={hasExternalAction ? "This template already has an External action" : undefined}
        />
      </div>
    </div>
  );
}
