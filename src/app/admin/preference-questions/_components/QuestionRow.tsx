"use client";

import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { EyeOff, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PreferenceQuestion, PreferenceQuestionVisibility } from "@/hooks/api/preference-question.api";

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  radio: "Radio",
  date: "Date",
  checkbox: "Yes / No",
};

export const QUESTION_DRAG_TYPE = "preference-question";

export interface QuestionDragItem {
  id: string;
  group: PreferenceQuestionVisibility;
  index: number;
}

export interface QuestionMoveLocation {
  group: PreferenceQuestionVisibility;
  index: number;
}

interface QuestionRowProps {
  question: PreferenceQuestion;
  index: number;
  group: PreferenceQuestionVisibility;
  onMove: (from: QuestionMoveLocation, to: QuestionMoveLocation) => void;
  onToggleActive: (question: PreferenceQuestion) => void;
  togglingActive: boolean;
  onEdit: (question: PreferenceQuestion) => void;
  onDelete: (question: PreferenceQuestion) => void;
}

export function QuestionRow({
  question,
  index,
  group,
  onMove,
  onToggleActive,
  togglingActive,
  onEdit,
  onDelete,
}: QuestionRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: QUESTION_DRAG_TYPE,
    item: (): QuestionDragItem => ({ id: question.id, group, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: QUESTION_DRAG_TYPE,
    drop: (item: QuestionDragItem, monitor) => {
      if (monitor.didDrop()) return;
      if (item.group === group && item.index === index) return;
      onMove({ group: item.group, index: item.index }, { group, index });
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border bg-white p-3.5 shadow-sm transition-all ${
        isOver ? "border-primary border-dashed" : "border-primary/10"
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <span className="hidden sm:block cursor-move text-gray-400 select-none shrink-0" title="Drag to reorder">
        ☰
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-semibold text-gray-900 break-words">{question.label}</h4>
          {question.isSystem && (
            <span
              className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
              title="Bound to a dedicated profile field — label and visibility can be edited, field type and deletion are locked"
            >
              <Lock size={11} /> System
            </span>
          )}
          {!question.isActive && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <EyeOff size={11} /> Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {FIELD_TYPE_LABELS[question.fieldType] ?? question.fieldType}
          </span>
          {question.options && question.options.length > 0 && (
            <span className="text-xs text-gray-400 truncate max-w-xs">{question.options.join(" · ")}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {togglingActive ? (
          <div
            className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin"
            title="Updating..."
          />
        ) : (
          <Switch checked={question.isActive} onCheckedChange={() => onToggleActive(question)} />
        )}
        <button
          title="Edit"
          className="p-2 text-gray-600 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
          onClick={() => onEdit(question)}
        >
          <FaEdit />
        </button>
        {!question.isSystem && (
          <button
            title="Delete"
            className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
            onClick={() => onDelete(question)}
          >
            <FaTrashAlt />
          </button>
        )}
      </div>
    </div>
  );
}

interface GroupDropZoneProps {
  group: PreferenceQuestionVisibility;
  endIndex: number;
  onMove: (from: QuestionMoveLocation, to: QuestionMoveLocation) => void;
  children: React.ReactNode;
}

// Lets a question be dropped into an empty group, or past the last row of a
// group, since row-level drop targets alone can't cover either case.
export function GroupDropZone({ group, endIndex, onMove, children }: GroupDropZoneProps) {
  const [{ isOver }, drop] = useDrop({
    accept: QUESTION_DRAG_TYPE,
    drop: (item: QuestionDragItem, monitor) => {
      if (monitor.didDrop()) return;
      onMove({ group: item.group, index: item.index }, { group, index: endIndex });
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  return (
    <div ref={drop as any} className={isOver ? "rounded-lg ring-2 ring-primary/40" : ""}>
      {children}
    </div>
  );
}
