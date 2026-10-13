"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Loader2,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompareResult, DiffCategory, DiffChange, DiffItem, DiffSeverity } from "./types";
import { CopyButton, Pill, SEVERITY_STYLES, SeverityPill, changeLabel } from "./ui";

const CATEGORY_LABELS: Record<DiffCategory, string> = {
  table: "Tables",
  view: "Views",
  column: "Columns",
  constraint: "Constraints",
  index: "Indexes",
  trigger: "Triggers",
  enum: "Enums",
  extension: "Extensions",
};

const CHANGE_FILTERS: { value: DiffChange | ""; label: string }[] = [
  { value: "", label: "All changes" },
  { value: "missing_in_target", label: "Missing in target" },
  { value: "extra_in_target", label: "Only in target" },
  { value: "modified", label: "Different" },
  { value: "renamed", label: "Renamed" },
  { value: "duplicate", label: "Duplicates" },
];

const SEVERITY_RANK: Record<DiffSeverity, number> = { critical: 0, warning: 1, info: 2 };

const ValueBlock = ({ label, value, tone }: { label: string; value?: string | null; tone: "source" | "target" }) => (
  <div className="min-w-0 flex-1">
    <div
      className={cn(
        "mb-1 text-[11px] font-semibold uppercase tracking-wide",
        tone === "source" ? "text-emerald-700" : "text-rose-700",
      )}
    >
      {label}
    </div>
    <pre
      className={cn(
        "max-h-60 overflow-auto whitespace-pre-wrap break-words rounded border p-2 font-mono text-xs",
        tone === "source" ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60",
        !value && "italic text-gray-400",
      )}
    >
      {value || "— not present —"}
    </pre>
  </div>
);

// Differences Database Modifications can fix: anything with generated SQL, except
// duplicates that live on the source side.
export const isFixable = (item: DiffItem) =>
  !!item.sql && !(item.change === "duplicate" && item.target === null);

const ItemRow = ({
  item,
  sourceLabel,
  targetLabel,
  selected,
  onToggle,
}: {
  item: DiffItem;
  sourceLabel: string;
  targetLabel: string;
  selected: boolean;
  onToggle: (item: DiffItem) => void;
}) => {
  const [open, setOpen] = useState(false);
  const change = changeLabel(item.change, sourceLabel, targetLabel);
  const hasDetail = item.source || item.target || item.sql;

  return (
    <li className="border-t border-gray-100 first:border-t-0">
      <div className="flex items-start">
      <label
        className={cn("flex shrink-0 items-center py-2.5 pl-3", isFixable(item) ? "cursor-pointer" : "invisible")}
        title={`Select to fix in ${targetLabel} via Database Modifications`}
      >
        <input type="checkbox" checked={selected} onChange={() => onToggle(item)} disabled={!isFixable(item)} className="h-3.5 w-3.5 rounded border-gray-300 accent-[#008ED3]" />
      </label>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2 px-3 py-2 text-left",
          hasDetail ? "hover:bg-gray-50" : "cursor-default",
        )}
      >
        <span className="mt-0.5 text-gray-400">
          {hasDetail ? open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="inline-block w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SeverityPill severity={item.severity} />
            {item.legacy && (
              <span title={item.legacy}>
                <Pill className="bg-slate-100 text-slate-600 ring-slate-200">
                  <Archive className="h-3 w-3" /> Unused by app
                </Pill>
              </span>
            )}
            <Pill className={change.className}>{change.text}</Pill>
            <Pill className="bg-gray-50 text-gray-600 ring-gray-200">{item.category}</Pill>
            {item.name !== item.object.split(".").pop() && (
              <code className="truncate rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-800">{item.name}</code>
            )}
            {item.destructive && (
              <span title="Fixing this means dropping something" className="text-gray-400">
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700">{item.message}</p>
        </div>
      </button>
      </div>

      {open && (
        <div className="space-y-3 px-9 pb-3">
          {(item.source || item.target) && (
            <div className="flex flex-col gap-2 md:flex-row">
              <ValueBlock label={`In ${sourceLabel} (source)`} value={item.source} tone="source" />
              <ValueBlock label={`In ${targetLabel} (target)`} value={item.target} tone="target" />
            </div>
          )}
          {item.sql && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Suggested SQL for the target {item.destructive && "(commented out — destructive)"}
                </span>
                <CopyButton text={item.sql} what="SQL copied" />
              </div>
              <pre className="overflow-auto rounded bg-slate-900 p-2 font-mono text-xs text-slate-100">{item.sql}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

interface DiffListProps {
  result: CompareResult;
  severityFilter: DiffSeverity[];
  setSeverityFilter: (s: DiffSeverity[]) => void;
  onMarkUnused: (table: string) => void;
  markingTable: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (item: DiffItem) => void;
}

const RELATION_CATEGORIES = new Set<DiffCategory>(["table", "view", "column", "constraint", "index", "trigger"]);

const DiffList = ({ result, severityFilter, setSeverityFilter, onMarkUnused, markingTable, selectedIds, onToggleSelect }: DiffListProps) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DiffCategory | "">("");
  const [change, setChange] = useState<DiffChange | "">("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const sourceLabel = result.source.database;
  const targetLabel = result.target.database;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return result.items.filter(
      (i) =>
        (severityFilter.length === 0 || severityFilter.includes(i.severity)) &&
        (!category || i.category === category) &&
        (!change || i.change === change) &&
        (!q ||
          i.object.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q)),
    );
  }, [result.items, search, category, change, severityFilter]);

  // Group by object, most severe objects first.
  const groups = useMemo(() => {
    const map = new Map<string, DiffItem[]>();
    for (const item of filtered) map.set(item.object, [...(map.get(item.object) || []), item]);
    return [...map.entries()]
      .map(([object, items]) => ({
        object,
        items,
        worst: items.reduce<DiffSeverity>(
          (w, i) => (SEVERITY_RANK[i.severity] < SEVERITY_RANK[w] ? i.severity : w),
          "info",
        ),
      }))
      .sort((a, b) => SEVERITY_RANK[a.worst] - SEVERITY_RANK[b.worst] || a.object.localeCompare(b.object));
  }, [filtered]);

  const filtersActive = !!search || !!category || !!change || severityFilter.length > 0;
  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setChange("");
    setSeverityFilter([]);
  };

  const toggleGroup = (object: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(object)) next.delete(object);
      else next.add(object);
      return next;
    });

  const categoriesPresent = (Object.keys(CATEGORY_LABELS) as DiffCategory[]).filter(
    (c) => result.summary.byCategory[c] > 0,
  );

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-gray-100 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables, columns, messages…"
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-3 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DiffCategory | "")}
            className="rounded-md border border-gray-300 bg-white py-1.5 pl-2 pr-7 text-sm"
          >
            <option value="">All object types</option>
            {categoriesPresent.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]} ({result.summary.byCategory[c]})
              </option>
            ))}
          </select>
          <select
            value={change}
            onChange={(e) => setChange(e.target.value as DiffChange | "")}
            className="rounded-md border border-gray-300 bg-white py-1.5 pl-2 pr-7 text-sm"
          >
            {CHANGE_FILTERS.filter((f) => !f.value || result.summary.byChange[f.value] > 0).map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
                {f.value ? ` (${result.summary.byChange[f.value]})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCollapsed(new Set())}
            title="Expand all groups"
            className="rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(new Set(groups.map((g) => g.object)))}
            title="Collapse all groups"
            className="rounded-md border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronsDownUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
        <span>
          Showing {filtered.length} of {result.items.length} differences in {groups.length} object
          {groups.length === 1 ? "" : "s"}
        </span>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="font-medium text-blue hover:text-blue/80">
            Clear filters
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-gray-500">
          <SearchX className="h-8 w-8 text-gray-300" />
          No differences match these filters.
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="font-medium text-blue">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2 px-3 pb-3">
          {groups.map((g) => {
            const isCollapsed = collapsed.has(g.object);
            return (
              <li key={g.object} className="overflow-hidden rounded-md border border-gray-200">
                <div className="group/head flex items-center bg-gray-50 hover:bg-gray-100">
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.object)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                    )}
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_STYLES[g.worst].dot)} />
                    <code className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{g.object}</code>
                    <span className="shrink-0 text-xs text-gray-500">
                      {g.items.length} difference{g.items.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  {g.items.every((i) => !i.legacy) && g.items.some((i) => RELATION_CATEGORIES.has(i.category)) && (
                    <button
                      type="button"
                      onClick={() => onMarkUnused(g.object.split(".").slice(1).join("."))}
                      disabled={markingTable !== null}
                      title="Treat this table as migrated/unused: its differences will be hidden from the results and the SQL"
                      className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-500 opacity-100 hover:bg-white hover:text-gray-800 disabled:opacity-40 sm:opacity-0 sm:group-hover/head:opacity-100 sm:focus:opacity-100"
                    >
                      {markingTable === g.object.split(".").slice(1).join(".") ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                      Mark as unused
                    </button>
                  )}
                </div>
                {!isCollapsed && (
                  <ul>
                    {g.items.map((item) => (
                      <ItemRow key={item.id} item={item} sourceLabel={sourceLabel} targetLabel={targetLabel} selected={selectedIds.has(item.id)} onToggle={onToggleSelect} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DiffList;
