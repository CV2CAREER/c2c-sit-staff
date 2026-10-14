"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, KeyRound, Loader2, Lock, Plus, Search, Trash2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaChangeErrorMessage, useSchemaChangeRows } from "@/hooks/api/admin/schemaChange";
import SearchSelect from "./SearchSelect";
import { ROW_OPERATORS, type OperationInput, type RowCondition, type RowOperator, type RowsResponse, type Structure } from "./types";

const MAX_SELECTED = 1000;
const MAX_DELETE = 50_000;

const input =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25";

interface Props {
  structure: Structure;
  schema: string;
  table: string;
  onAdd: (op: OperationInput) => void;
}

// Browse a table's rows (read-only), filter them, and turn either a hand-picked
// selection or "everything matching" into a delete_rows operation.
const RowBrowser = ({ structure, schema, table, onAdd }: Props) => {
  const rowsQuery = useSchemaChangeRows();
  const tbl = structure.tables.find((t) => t.schema === schema && t.name === table)!;
  const [draft, setDraft] = useState<RowCondition[]>([]);
  const [applied, setApplied] = useState<RowCondition[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState<RowsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, Record<string, string>>>(new Map());
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(
    (conditions: RowCondition[], nextPage: number, size: number) => {
      setError(null);
      rowsQuery.mutate(
        { targetKey: structure.targetKey, schema, table, conditions, page: nextPage, pageSize: size },
        {
          onSuccess: (d) => {
            setData(d);
            setApplied(conditions);
            setPage(nextPage);
          },
          onError: (e) => setError(schemaChangeErrorMessage(e)),
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structure.targetKey, schema, table],
  );

  // New table → fresh state and first page.
  useEffect(() => {
    setDraft([]);
    setSelected(new Map());
    setConfirmAll(false);
    setData(null);
    load([], 1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, table]);

  const columnOptions = tbl.columns.map((c) => ({ value: c.name, label: c.name, description: c.type }));
  const opOptions = (Object.keys(ROW_OPERATORS) as RowOperator[]).map((k) => ({ value: k, label: ROW_OPERATORS[k].label }));
  const draftValid = draft.every((c) => c.column && c.op && (ROW_OPERATORS[c.op].arity === 0 || String(c.value ?? "").trim() !== ""));
  const draftChanged = JSON.stringify(draft) !== JSON.stringify(applied);

  const hasKey = !!data?.primaryKey.length;
  const keyId = (k: Record<string, string>) => JSON.stringify(k);
  const pageKeys = useMemo(() => (data?.rows ?? []).map((r) => r.key).filter(Boolean) as Record<string, string>[], [data]);
  const pageAllSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(keyId(k)));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const toggle = (k: Record<string, string>) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(keyId(k))) next.delete(keyId(k));
      else next.set(keyId(k), k);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const k of pageKeys) {
        if (pageAllSelected) next.delete(keyId(k));
        else next.set(keyId(k), k);
      }
      return next;
    });

  const addSelection = () => {
    onAdd({ kind: "delete_rows", schema, table, mode: "selection", keys: [...selected.values()] });
    setSelected(new Map());
  };

  const addBatch = () => {
    if (!data) return;
    onAdd({
      kind: "delete_rows",
      schema,
      table,
      mode: "filter",
      conditions: applied,
      allRows: applied.length === 0 ? true : undefined,
      matched: data.totalIsEstimate ? undefined : data.total,
    });
    setConfirmAll(false);
  };

  const tooManyForBatch = !!data && data.total > MAX_DELETE;

  return (
    <div className="space-y-3">
      {/* filters */}
      <div className="rounded-md border border-gray-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <Filter className="h-3.5 w-3.5" /> Find rows
        </div>
        <div className="space-y-2">
          {draft.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1.3fr_auto] md:items-center">
              <SearchSelect value={c.column} onChange={(v) => setDraft(draft.map((x, j) => (j === i ? { ...x, column: v } : x)))} options={columnOptions} placeholder="Column…" />
              <SearchSelect value={c.op} onChange={(v) => setDraft(draft.map((x, j) => (j === i ? { ...x, op: v as RowOperator } : x)))} options={opOptions} />
              {ROW_OPERATORS[c.op].arity === 0 ? (
                <span className="text-xs text-gray-400">no value needed</span>
              ) : (
                <input
                  className={input}
                  value={Array.isArray(c.value) ? c.value.join(", ") : (c.value ?? "")}
                  onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  onKeyDown={(e) => e.key === "Enter" && draftValid && load(draft, 1, pageSize)}
                  placeholder={c.op === "in" ? "a, b, c" : "value"}
                />
              )}
              <button type="button" onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="justify-self-end rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Remove condition">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDraft([...draft, { column: tbl.columns[0]?.name ?? "", op: "eq", value: "" }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue hover:text-blue/80"
          >
            <Plus className="h-3.5 w-3.5" /> Add condition {draft.length > 0 && <span className="text-gray-400">(all must match)</span>}
          </button>
          <button
            type="button"
            disabled={!draftValid || rowsQuery.isPending}
            onClick={() => load(draft, 1, pageSize)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold",
              draftChanged ? "bg-blue text-white hover:bg-blue/90" : "border border-gray-300 text-gray-700 hover:bg-gray-50",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {rowsQuery.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {draftChanged ? "Apply filter" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* results */}
      {data && (
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-600">
            <span>
              <strong className="text-gray-900">{data.total.toLocaleString()}</strong> row(s) {data.totalIsEstimate ? "(estimate — counting took too long)" : ""}
              {applied.length ? " match the filter" : " in the table"}
              {selected.size > 0 && (
                <>
                  {" · "}
                  <strong className="text-blue">{selected.size} selected</strong>{" "}
                  <button type="button" className="underline" onClick={() => setSelected(new Map())}>
                    clear
                  </button>
                </>
              )}
            </span>
            {!hasKey && <span className="text-amber-700">No primary key — rows can only be deleted by filter.</span>}
          </div>

          <div className={cn("max-h-[420px] overflow-auto", rowsQuery.isPending && "opacity-50")}>
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  {hasKey && (
                    <th className="w-8 border-b border-gray-200 px-3 py-2">
                      <input type="checkbox" className="accent-[#008ED3]" checked={pageAllSelected} onChange={togglePage} title="Select this page" />
                    </th>
                  )}
                  {data.columns.map((c) => (
                    <th key={c.name} className="whitespace-nowrap border-b border-gray-200 px-3 py-2 font-semibold text-gray-700" title={c.type}>
                      <span className="inline-flex items-center gap-1">
                        {c.isKey && <KeyRound className="h-3 w-3 text-amber-500" />}
                        {c.sensitive && <Lock className="h-3 w-3 text-gray-400" />}
                        {c.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr>
                    <td colSpan={data.columns.length + 1} className="px-3 py-8 text-center text-gray-500">
                      No rows match.
                    </td>
                  </tr>
                )}
                {data.rows.map((r, i) => {
                  const on = !!r.key && selected.has(keyId(r.key));
                  return (
                    <tr key={r.key ? keyId(r.key) : i} className={cn("border-b border-gray-100", on ? "bg-red-50" : "hover:bg-gray-50")}>
                      {hasKey && (
                        <td className="px-3 py-1.5">
                          <input type="checkbox" className="accent-red-600" checked={on} onChange={() => r.key && toggle(r.key)} />
                        </td>
                      )}
                      {r.values.map((v, j) => (
                        <td key={j} className={cn("max-w-[240px] truncate whitespace-nowrap px-3 py-1.5", v === null ? "italic text-gray-300" : "text-gray-800", data.columns[j].isKey && "font-mono")} title={v ?? "NULL"}>
                          {v ?? "NULL"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1 || rowsQuery.isPending} onClick={() => load(applied, page - 1, pageSize)} className="rounded border border-gray-300 p-1 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <button type="button" disabled={page >= totalPages || rowsQuery.isPending} onClick={() => load(applied, page + 1, pageSize)} className="rounded border border-gray-300 p-1 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <label className="flex items-center gap-1.5">
              Rows per page
              <select
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value);
                  setPageSize(size);
                  load(applied, 1, size);
                }}
                className="rounded border border-gray-300 px-1.5 py-0.5"
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {/* actions */}
      {data && (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-sm font-semibold text-gray-900">Delete the rows you ticked</div>
            <p className="mt-0.5 text-xs text-gray-500">
              {hasKey ? `Pick rows on any page (up to ${MAX_SELECTED}). They're matched by primary key.` : "Not available: this table has no primary key."}
            </p>
            <button
              type="button"
              disabled={!hasKey || selected.size === 0 || selected.size > MAX_SELECTED}
              onClick={addSelection}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Trash2 className="h-4 w-4" /> Delete {selected.size || ""} selected row{selected.size === 1 ? "" : "s"}
            </button>
            {selected.size > MAX_SELECTED && <p className="mt-1 text-xs text-red-600">Too many — use “all matching” with a filter instead.</p>}
          </div>

          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-sm font-semibold text-gray-900">Delete everything that matches (batch)</div>
            <p className="mt-0.5 text-xs text-gray-500">
              {applied.length ? "Uses the filter above, as applied." : "No filter applied — this means EVERY row in the table."} Up to {MAX_DELETE.toLocaleString()} rows per operation.
            </p>
            {applied.length === 0 && (
              <label className="mt-2 flex items-center gap-2 text-xs text-red-700">
                <input type="checkbox" className="accent-red-600" checked={confirmAll} onChange={(e) => setConfirmAll(e.target.checked)} />
                Yes, I mean every row in {table}
              </label>
            )}
            <button
              type="button"
              disabled={data.total === 0 || tooManyForBatch || draftChanged || (applied.length === 0 && !confirmAll)}
              onClick={addBatch}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <Trash2 className="h-4 w-4" /> Delete all {data.total.toLocaleString()} matching
            </button>
            {draftChanged && <p className="mt-1 text-xs text-amber-700">Apply the filter first so you see exactly what will be deleted.</p>}
            {tooManyForBatch && <p className="mt-1 text-xs text-red-600">Too many rows — narrow the filter and delete in batches.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default RowBrowser;
