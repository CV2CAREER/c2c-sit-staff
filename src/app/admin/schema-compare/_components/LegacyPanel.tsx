"use client";

import { useMemo, useState } from "react";
import { Archive, ChevronDown, ChevronRight, Info, Loader2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { schemaDiffErrorMessage, useSchemaDiffTableUsage } from "@/hooks/api/admin/schemaDiff";
import type { CompareResult, TableUsage } from "./types";
import { Pill, timeAgo } from "./ui";

interface LegacyPanelProps {
  result: CompareResult;
  hideLegacy: boolean;
  setHideLegacy: (v: boolean) => void;
  onUsageChanged: () => void;
  busy: boolean;
}

// Migrated tables (UAT/PROD carry tables from the old platform that nothing
// uses any more) are hidden from the results and the SQL by default. This
// panel says what was hidden and why, and lets an admin correct the
// automatic detection per table.
const LegacyPanel = ({ result, hideLegacy, setHideLegacy, onUsageChanged, busy }: LegacyPanelProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingTable, setPendingTable] = useState<string | null>(null);
  const usageMutation = useSchemaDiffTableUsage();

  const { objects } = result.legacy;
  const overrides = Object.entries(result.usage.overrides);
  const totalDiffs = objects.reduce((n, o) => n + o.differences, 0);
  const tableCount = new Set(objects.map((o) => o.table)).size;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? objects.filter((o) => o.object.toLowerCase().includes(q) || o.reason.toLowerCase().includes(q)) : objects;
  }, [objects, search]);

  if (!objects.length && !overrides.length) return null;

  const setUsage = (table: string, usage: TableUsage | null) => {
    setPendingTable(table);
    usageMutation.mutate(
      { table, usage },
      {
        onSuccess: () => {
          toast.success(
            usage === "used"
              ? `${table} will be compared like any other table`
              : usage === "unused"
                ? `${table} is now treated as unused`
                : `${table} is back to automatic detection`,
          );
          onUsageChanged();
        },
        onError: (err) => toast.error(schemaDiffErrorMessage(err)),
        onSettled: () => setPendingTable(null),
      },
    );
  };

  const presence = (inSource: boolean, inTarget: boolean) =>
    inSource && inTarget
      ? { text: "In both", className: "bg-gray-50 text-gray-600 ring-gray-200" }
      : inTarget
        ? { text: `Only in ${result.target.database}`, className: "bg-violet-50 text-violet-700 ring-violet-200" }
        : { text: `Only in ${result.source.database}`, className: "bg-sky-50 text-sky-700 ring-sky-200" };

  return (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-md">
      <div className="flex flex-col gap-3 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-start gap-3 text-left"
          disabled={!objects.length}
        >
          <span className="mt-0.5 rounded-md bg-slate-200 p-1.5 text-slate-700">
            <Archive className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              Migrated / unused tables
              {objects.length > 0 &&
                (open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />)}
            </span>
            <span className="block text-xs text-gray-600">
              {objects.length ? (
                <>
                  {tableCount} table{tableCount === 1 ? "" : "s"} the app doesn&apos;t use ({totalDiffs} difference
                  {totalDiffs === 1 ? "" : "s"}) —{" "}
                  {hideLegacy ? "hidden from the results and the sync SQL." : "shown in the results as info, never in the sync SQL."}
                </>
              ) : (
                "No unused tables differ between these databases."
              )}
            </span>
          </span>
        </button>

        {objects.length > 0 && (
          <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 text-xs font-medium text-gray-700">
            <span>Show in results</span>
            <button
              type="button"
              role="switch"
              aria-checked={!hideLegacy}
              disabled={busy}
              onClick={() => setHideLegacy(!hideLegacy)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50",
                hideLegacy ? "bg-gray-300" : "bg-blue",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow transition",
                  hideLegacy ? "translate-x-0.5" : "translate-x-[18px]",
                )}
              />
            </button>
          </label>
        )}
      </div>

      {open && objects.length > 0 && (
        <div className="border-t border-slate-200">
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-1.5 text-xs text-gray-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Detected automatically: no model or SQL query in the staff or customer backend references these tables
              (code scanned {timeAgo(result.usage.scanGeneratedAt)}). If one is actually used, mark it as used.
            </p>
            <div className="relative sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter tables…"
                className="w-full rounded-md border border-gray-300 py-1 pl-8 pr-2 text-xs focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
              />
            </div>
          </div>
          <ul className="max-h-[420px] divide-y divide-gray-100 overflow-auto border-t border-gray-100">
            {filtered.map((o) => {
              const where = presence(o.inSource, o.inTarget);
              const isOverride = result.usage.overrides[o.table.toLowerCase()] === "unused";
              return (
                <li key={o.object} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <code className="truncate text-sm font-semibold text-gray-900">{o.object.replace(/^public\./, "")}</code>
                      {o.kind !== "table" && <Pill className="bg-gray-50 text-gray-600 ring-gray-200">{o.kind}</Pill>}
                      <Pill className={where.className}>{where.text}</Pill>
                      {o.rowEstimate > 0 && (
                        <span className="text-[11px] text-gray-500">~{o.rowEstimate.toLocaleString()} rows</span>
                      )}
                      <span className="text-[11px] text-gray-500">
                        · {o.differences} difference{o.differences === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{o.reason}</p>
                  </div>
                  {o.kind !== "enum" && (
                    <button
                      type="button"
                      onClick={() => setUsage(o.table, isOverride ? null : "used")}
                      disabled={busy || usageMutation.isPending}
                      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:self-center"
                    >
                      {pendingTable === o.table ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isOverride ? (
                        <RotateCcw className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {isOverride ? "Undo (automatic)" : "Mark as used"}
                    </button>
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-xs text-gray-500">No tables match.</li>}
          </ul>
        </div>
      )}

      {overrides.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Set manually by an admin
          </div>
          <div className="flex flex-wrap gap-1.5">
            {overrides.map(([table, usage]) => (
              <span
                key={table}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2.5 pr-1 text-xs ring-1 ring-inset",
                  usage === "used" ? "bg-green-50 text-green-800 ring-green-200" : "bg-slate-100 text-slate-700 ring-slate-200",
                )}
              >
                <code>{table}</code> · {usage}
                <button
                  type="button"
                  title="Back to automatic detection"
                  disabled={busy || usageMutation.isPending}
                  onClick={() => setUsage(table, null)}
                  className="rounded-full p-0.5 hover:bg-black/5 disabled:opacity-50"
                >
                  {pendingTable === table ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default LegacyPanel;
