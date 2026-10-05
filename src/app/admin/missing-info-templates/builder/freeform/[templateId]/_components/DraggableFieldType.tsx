"use client";

import { useDrag } from "react-dnd";

const FIELD_ITEM_TYPE = "field_type";

interface DraggableFieldTypeProps {
  fieldType: string;
  label: string;
  onDrop: (type: string) => void;
  /** Greyed out and not draggable (e.g. a template can only have one External Action block). */
  disabled?: boolean;
  /** Highlighted style for action-type blocks. */
  highlight?: boolean;
  title?: string;
}

export default function DraggableFieldType({
  fieldType,
  label,
  onDrop,
  disabled = false,
  highlight = false,
  title,
}: DraggableFieldTypeProps) {
  const [{ isDragging }, drag] = useDrag({
    type: FIELD_ITEM_TYPE,
    canDrag: !disabled,
    item: { fieldType, label },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        onDrop(item.fieldType);
      }
    },
  });

  return (
    <div
      ref={drag as any}
      title={title}
      className={`border rounded-lg px-3 py-2.5 text-[13px] transition-colors mb-2 select-none ${
        disabled
          ? "border-[#E5E9EF] text-[#9CA3AF] bg-[#F9FAFB] cursor-not-allowed"
          : highlight
            ? "border-[#9ED7F1] bg-[#F3FBFF] text-[#0B96D6] font-semibold cursor-move hover:border-[#0B96D6] hover:bg-[#EAF6FF]"
            : "border-[#E5E9EF] text-[#1F2937] cursor-move hover:border-[#0B96D6] hover:bg-[#EAF6FF]"
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {label}
    </div>
  );
}
