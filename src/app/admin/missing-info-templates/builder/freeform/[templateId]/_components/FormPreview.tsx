"use client";

import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  REFEREE_DEFAULT_FIELDS,
  readExternalActionConfig,
  readInstructionsBody,
} from "@/constants/missing-info-field-types";
import { FreeFormField } from "./FieldProperties";

const FIELD_ITEM_TYPE = "field_type";
const REORDER_TYPE = "form_field";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "SHORT TEXT",
  textarea: "LONG TEXT",
  date: "DATE",
  select: "DROPDOWN",
  checkbox: "MULTI-SELECT",
  file: "FILE",
  number: "NUMBER",
  phone: "PHONE",
  email: "EMAIL",
  external_action: "EXTERNAL ACTION",
  instructions: "INSTRUCTIONS",
};

interface FormPreviewProps {
  fields: FreeFormField[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

interface DraggableFieldCardProps {
  field: FreeFormField;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
}

function DraggableFieldCard({ field, index, isSelected, onSelect, onMoveField }: DraggableFieldCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: REORDER_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: REORDER_TYPE,
    drop: (item: { index: number }) => {
      if (item.index !== index) {
        onMoveField(item.index, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onClick={() => onSelect(index)}
      className={`border rounded-lg px-3.5 py-3 mb-2.5 cursor-pointer transition-all ${
        isSelected
          ? "border-[#0B96D6] shadow-[0_0_0_1px_#0B96D6]"
          : "border-[#E5E9EF] hover:border-[#D9E5F5]"
      } ${isDragging ? "opacity-40" : "opacity-100"} ${isOver ? "border-[#0B96D6] border-dashed" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[#9CA3AF] cursor-move shrink-0 text-sm select-none" title="Drag to reorder">☰</span>
          <span className="text-[13px] font-semibold text-[#1F2937] truncate">
            {field.fieldLabel}
            {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
          </span>
        </div>
        <span className="text-[10px] text-[#9CA3AF] font-semibold tracking-wider uppercase shrink-0">
          {field.isRefereeBlock ? `REFEREE × ${REFEREE_DEFAULT_FIELDS.length}` : FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}
        </span>
      </div>
      <div className="mt-1.5 bg-[#F9FAFB] rounded-md px-2.5 py-2 text-[12px] text-[#9CA3AF] ml-6">
        {field.isRefereeBlock
          ? `Expands to ${REFEREE_DEFAULT_FIELDS.length} referee fields on the client form`
          : field.fieldType === "instructions"
            ? readInstructionsBody(field.options).trim().slice(0, 140) || "Add the instructions text"
            : field.fieldType === "external_action"
            ? (() => {
                const cfg = readExternalActionConfig(field.options);
                return `Button: "${cfg.actionLabel}" · Confirmation: "${cfg.completionLabel}"${cfg.showGuide ? " · Guide shown" : ""}`;
              })()
            : field.helpText || (field.fieldType === "file" ? "Choose file · max 10MB" : field.fieldType === "date" ? "Date picker" : "Placeholder")}
      </div>
    </div>
  );
}

export default function FormPreview({ fields, selectedIndex, onSelect, onMoveField }: FormPreviewProps) {
  const [, drop] = useDrop({
    accept: FIELD_ITEM_TYPE,
  });

  return (
    <div ref={drop as any} className="bg-white border border-[#E5E9EF] rounded-[10px] p-4 min-h-[300px]">
      <div className="text-[12px] text-[#9CA3AF] mb-2.5">Client will see ↓</div>
      {fields.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-[#9CA3AF]">
          <p className="text-[13px] m-0">Drag field types here to build your form</p>
          <p className="text-[12px] mt-1 m-0">or click a field type to add it</p>
        </div>
      ) : (
        fields.map((field, index) => (
          <DraggableFieldCard
            key={`${field.fieldName}-${index}`}
            field={field}
            index={index}
            isSelected={selectedIndex === index}
            onSelect={onSelect}
            onMoveField={onMoveField}
          />
        ))
      )}
    </div>
  );
}
