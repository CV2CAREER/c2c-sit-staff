"use client";

import { ChevronDown, ChevronUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DropdownOptionRow } from "@/hooks/api/dropdown-option.api";

interface OptionRowProps {
  option: DropdownOptionRow;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  allowChildren: boolean;
  togglingId: string | null;
  onMoveUp: (option: DropdownOptionRow) => void;
  onMoveDown: (option: DropdownOptionRow) => void;
  onToggleActive: (option: DropdownOptionRow) => void;
  onEdit: (option: DropdownOptionRow) => void;
  onDelete: (option: DropdownOptionRow) => void;
  onAddChild: (parent: DropdownOptionRow) => void;
}

export function OptionRow({
  option,
  depth,
  isFirst,
  isLast,
  allowChildren,
  togglingId,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onEdit,
  onDelete,
  onAddChild,
}: OptionRowProps) {
  const children = option.children ?? [];
  const sortedChildren = [...children].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={depth > 0 ? "border-l-2 border-gray-100 pl-4" : ""}>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5">
        <div className="flex flex-col shrink-0">
          <button
            title="Move up"
            disabled={isFirst}
            onClick={() => onMoveUp(option)}
            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            title="Move down"
            disabled={isLast}
            onClick={() => onMoveDown(option)}
            className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 truncate">{option.label}</p>
            {option.isSystem && (
              <span title="System option — value is protected">
                <Lock size={12} className="text-indigo-500 shrink-0" />
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{option.value}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {allowChildren && (
            <button
              title="Add nested option"
              onClick={() => onAddChild(option)}
              className="p-1.5 text-gray-500 hover:text-primary rounded-full hover:bg-primary/10"
            >
              <Plus size={15} />
            </button>
          )}
          {togglingId === option.id ? (
            <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
          ) : (
            <Switch checked={option.isActive} onCheckedChange={() => onToggleActive(option)} />
          )}
          <button
            title="Edit"
            onClick={() => onEdit(option)}
            className="p-1.5 text-gray-500 hover:text-blue-700 rounded-full hover:bg-blue-50"
          >
            <Pencil size={14} />
          </button>
          <button
            title="Delete"
            onClick={() => onDelete(option)}
            className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {sortedChildren.length > 0 && (
        <div className="mt-2 grid gap-2 pl-3">
          {sortedChildren.map((child, index) => (
            <OptionRow
              key={child.id}
              option={child}
              depth={depth + 1}
              isFirst={index === 0}
              isLast={index === sortedChildren.length - 1}
              allowChildren={false}
              togglingId={togglingId}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
