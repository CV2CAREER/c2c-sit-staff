import { cn } from "@/lib/utils";
import { ROW_OPERATORS, type ChangeStatus, type OperationInput } from "./types";

export const STATUS_STYLE: Record<ChangeStatus, { label: string; className: string }> = {
  ready: { label: "Ready to apply", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  pending_approval: { label: "Needs approval", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  approved: { label: "Approved", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  rejected: { label: "Rejected", className: "bg-gray-100 text-gray-600 ring-gray-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-500 ring-gray-200" },
  running: { label: "Applying…", className: "bg-blue/10 text-blue ring-blue/30" },
  applied: { label: "Applied", className: "bg-green-50 text-green-700 ring-green-200" },
  failed: { label: "Failed (rolled back)", className: "bg-red-50 text-red-700 ring-red-200" },
};

const StatusBadge = ({ status }: { status: ChangeStatus }) => (
  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", STATUS_STYLE[status].className)}>
    {STATUS_STYLE[status].label}
  </span>
);

export default StatusBadge;

export const describeOperation = (raw: OperationInput): string => {
  // Show the schema only when it isn't the usual "public".
  const op = raw.kind !== "apply_diff" && "table" in raw && raw.schema && raw.schema !== "public" ? { ...raw, table: `${raw.schema}.${raw.table}` } : raw;
  switch (op.kind) {
    case "add_column":
      return `Add column ${op.table}.${op.column} (${op.type}${op.nullable ? "" : ", required"})`;
    case "drop_column":
      return `Drop column ${op.table}.${op.column}`;
    case "alter_column_type":
      return `Change ${op.table}.${op.column} to ${op.type}`;
    case "set_nullable":
      return `Make ${op.table}.${op.column} ${op.nullable ? "optional" : "required"}`;
    case "set_default":
      return op.default.kind === "none" ? `Remove default of ${op.table}.${op.column}` : `Set default of ${op.table}.${op.column} to ${op.default.value}`;
    case "create_index":
      return `Add ${op.unique ? "unique " : ""}index ${op.name} on ${op.table} (${op.columns.join(", ")})`;
    case "drop_index":
      return `Drop index ${op.name} on ${op.table}`;
    case "add_unique":
      return `Add unique ${op.name} on ${op.table} (${op.columns.join(", ")})`;
    case "add_foreign_key":
      return `Add foreign key ${op.table}.${op.columns[0]} → ${op.refTable}.${op.refColumns[0]}`;
    case "drop_constraint":
      return `Drop constraint ${op.name} on ${op.table}`;
    case "create_table":
      return `Create table ${op.table} (${op.columns.length} columns)`;
    case "drop_table":
      return `Drop table ${op.table}`;
    case "add_enum_value":
      return `Add '${op.value}' to enum ${op.enum}`;
    case "update_value":
      return `Set ${op.table}.${op.column} = ${op.newValue === null ? "empty" : `"${op.newValue}"`} where ${op.keyColumn} = ${op.keyValue}`;
    case "delete_rows":
      return op.mode === "selection"
        ? `Delete ${op.keys?.length ?? 0} selected row(s) from ${op.table}`
        : op.conditions?.length
          ? `Delete ${op.matched !== undefined ? `${op.matched.toLocaleString()} ` : ""}row(s) from ${op.table} where ${op.conditions
              .map((c) => {
                const v = Array.isArray(c.value) ? (c.value.length > 3 ? `${c.value.slice(0, 3).join(", ")} +${c.value.length - 3} more` : c.value.join(", ")) : c.value;
                return `${c.column} ${Array.isArray(c.value) ? "is one of" : ROW_OPERATORS[c.op].label}${ROW_OPERATORS[c.op].arity ? ` "${v}"` : ""}`;
              })
              .join(" and ")}`
          : `Delete EVERY row from ${op.table}`;
    case "apply_diff":
      return op.label || `Fix: ${op.item.category} ${op.item.name} on ${op.item.object}`;
  }
};
