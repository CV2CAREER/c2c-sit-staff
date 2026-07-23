"use client";

import { useDrag } from "react-dnd";

const FIELD_ITEM_TYPE = "field_type";

interface DraggableFieldTypeProps {
  fieldType: string;
  label: string;
  onDrop: (type: string) => void;
}

export default function DraggableFieldType({ fieldType, label, onDrop }: DraggableFieldTypeProps) {
  const [{ isDragging }, drag] = useDrag({
    type: FIELD_ITEM_TYPE,
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
      className="border border-[#E5E9EF] rounded-lg px-3 py-2.5 text-[13px] text-[#1F2937] cursor-move hover:border-[#0B96D6] hover:bg-[#EAF6FF] transition-colors mb-2 select-none"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {label}
    </div>
  );
}
