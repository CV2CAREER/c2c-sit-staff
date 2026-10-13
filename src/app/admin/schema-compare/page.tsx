"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCode2, GitCompareArrows, ListTree, Loader2, Sparkles, Wrench, X, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader/PageHeader";
import { cn } from "@/lib/utils";
import {
  schemaDiffErrorMessage,
  useSchemaDiffCompare,
  useSchemaDiffTableUsage,
  useSchemaDiffTargets,
} from "@/hooks/api/admin/schemaDiff";
import TargetPicker from "./_components/TargetPicker";
import ResultSummary from "./_components/ResultSummary";
import DiffList, { isFixable } from "./_components/DiffList";
import { DIFF_DRAFT_KEY, type DiffDraft } from "../schema-changes/_components/types";
import SqlPanel from "./_components/SqlPanel";
import AiPanel from "./_components/AiPanel";
import LegacyPanel from "./_components/LegacyPanel";
import type { CompareRequest, CompareResult, DiffItem, DiffSeverity } from "./_components/types";
import { DownloadButton, downloadFile, fileStamp } from "./_components/ui";

type Tab = "differences" | "sql" | "ai";

const STORAGE_KEY = "c2c-staff-schema-compare";

const loadSaved = (): {
  sourceKey: string;
  targetKey: string;
  schemas: string[];
  showAllDatabases?: boolean;
  hideLegacy?: boolean;
} | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const ProgressPanel = ({ sourceLabel, targetLabel }: { sourceLabel: string; targetLabel: string }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-md bg-white p-6 shadow-md">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue" />
        <div className="flex-1">
          <div className="font-semibold text-gray-900">
            Comparing {sourceLabel} → {targetLabel}
          </div>
          <div className="text-sm text-gray-500">
            Reading both catalogs (read-only) and computing differences · {elapsed}s
          </div>
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-blue/15">
        <div className="h-full w-1/3 animate-[schema-compare-slide_1.2s_ease-in-out_infinite] rounded-full bg-blue" />
      </div>
      {elapsed >= 15 && (
        <p className="mt-3 text-xs text-gray-500">
          Still working — large schemas or a busy cluster can take up to a minute. Reads time out on their own, so
          you&apos;ll get a clear message rather than an endless spinner.
        </p>
      )}
      <style>{`@keyframes schema-compare-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </section>
  );
};

const SchemaComparePage = () => {
  const targetsQuery = useSchemaDiffTargets();
  const compare = useSchemaDiffCompare();

  const [sourceKey, setSourceKey] = useState("");
  const [targetKey, setTargetKey] = useState("");
  const [schemas, setSchemas] = useState<string[]>(["public"]);
  // Only C2C databases by default; other products' DBs are opt-in.
  const [showAllDatabases, setShowAllDatabases] = useState(false);
  // Migrated tables (UAT/PROD) that the app doesn't use are hidden by default.
  const [hideLegacy, setHideLegacy] = useState(true);
  const [markingTable, setMarkingTable] = useState<string | null>(null);
  // Differences picked to fix in the target via Database Modifications.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [quietRun, setQuietRun] = useState(false);
  const tableUsage = useSchemaDiffTableUsage();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [lastRequest, setLastRequest] = useState<CompareRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("differences");
  const [severityFilter, setSeverityFilter] = useState<DiffSeverity[]>([]);
  const restored = useRef(false);

  const targets = useMemo(() => targetsQuery.data?.data?.targets ?? [], [targetsQuery.data]);
  const warnings = useMemo(() => targetsQuery.data?.data?.warnings ?? [], [targetsQuery.data]);
  const labelOf = (key: string) => targets.find((t) => t.key === key)?.database || key;

  // Restore the last selection once the list arrives, keeping only keys that
  // still exist and are usable.
  useEffect(() => {
    if (restored.current || !targets.length) return;
    restored.current = true;
    const saved = loadSaved();
    const usable = (k?: string) => !!k && targets.some((t) => t.key === k && t.available);
    if (saved) {
      if (usable(saved.sourceKey)) setSourceKey(saved.sourceKey);
      if (usable(saved.targetKey) && saved.targetKey !== saved.sourceKey) setTargetKey(saved.targetKey);
      if (Array.isArray(saved.schemas)) setSchemas(saved.schemas);
      setShowAllDatabases(saved.showAllDatabases === true);
      setHideLegacy(saved.hideLegacy !== false);
    } else {
      const current = targets.find((t) => t.isCurrent && t.available);
      if (current) setSourceKey(current.key);
    }
  }, [targets]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sourceKey, targetKey, schemas, showAllDatabases, hideLegacy }),
      );
    } catch {
      /* storage unavailable — selection just won't be remembered */
    }
  }, [sourceKey, targetKey, schemas, showAllDatabases, hideLegacy]);

  // `quiet` = re-running the same comparison with different display options
  // (served from the 2-minute snapshot cache): keep the tab/filters, no toast.
  const runCompare = (
    refresh: boolean,
    request?: CompareRequest,
    opts: { quiet?: boolean; includeLegacy?: boolean } = {},
  ) => {
    const body: CompareRequest = request ?? { sourceKey, targetKey, schemas, refresh };
    const includeLegacy = opts.includeLegacy ?? !hideLegacy;
    setError(null);
    setQuietRun(Boolean(opts.quiet));
    compare.mutate(
      { ...body, refresh, includeLegacy },
      {
        onSettled: () => setQuietRun(false),
        onSuccess: (data) => {
          setResult(data);
          setSelectedIds(new Set());
          setLastRequest({ sourceKey: body.sourceKey, targetKey: body.targetKey, schemas: body.schemas, includeLegacy });
          if (opts.quiet) return;
          setSeverityFilter([]);
          setTab("differences");
          if (data.summary.identical)
            toast.success(
              data.legacy.hiddenDifferences
                ? "Every table the app uses matches (only migrated tables differ)"
                : "No differences — the schemas match",
            );
          else
            toast(
              `${data.summary.total} difference(s): ${data.summary.bySeverity.critical} critical, ${data.summary.bySeverity.warning} warning`,
              { icon: data.summary.bySeverity.critical ? "⚠️" : "ℹ️" },
            );
        },
        onError: (err) => {
          const message = schemaDiffErrorMessage(err);
          setError(message);
          toast.error("Comparison failed");
        },
      },
    );
  };

  const changeHideLegacy = (hide: boolean) => {
    setHideLegacy(hide);
    if (lastRequest) runCompare(false, lastRequest, { quiet: true, includeLegacy: !hide });
  };

  const markUnused = (table: string) => {
    setMarkingTable(table);
    tableUsage.mutate(
      { table, usage: "unused" },
      {
        onSuccess: () => {
          toast.success(`${table} is now treated as unused`);
          if (lastRequest) runCompare(false, lastRequest, { quiet: true });
        },
        onError: (err) => toast.error(schemaDiffErrorMessage(err)),
        onSettled: () => setMarkingTable(null),
      },
    );
  };

  const toggleSeverity = (sev: DiffSeverity) =>
    setSeverityFilter((prev) => {
      if (prev.length === 1 && prev[0] === sev) return [];
      return [sev];
    });

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = result
    ? [
        { id: "differences", label: "Differences", icon: <ListTree className="h-4 w-4" />, count: result.summary.total },
        { id: "sql", label: "Sync SQL", icon: <FileCode2 className="h-4 w-4" /> },
        { id: "ai", label: "AI review", icon: <Sparkles className="h-4 w-4" /> },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Database Evaluation"
        description="See exactly how two databases' structures differ — tables, columns, constraints, indexes, triggers, views, enums and extensions."
      />

      <TargetPicker
        targets={targets}
        warnings={warnings}
        loadingTargets={targetsQuery.isLoading || targetsQuery.isFetching}
        targetsError={targetsQuery.isError ? targetsQuery.error?.message || "Unknown error" : null}
        onReloadTargets={() => targetsQuery.refetch()}
        sourceKey={sourceKey}
        targetKey={targetKey}
        setSourceKey={setSourceKey}
        setTargetKey={setTargetKey}
        schemas={schemas}
        setSchemas={setSchemas}
        availableSchemas={result?.availableSchemas ?? []}
        busy={compare.isPending}
        onCompare={(refresh) => runCompare(refresh)}
        showAllDatabases={showAllDatabases}
        setShowAllDatabases={setShowAllDatabases}
      />

      {compare.isPending && !quietRun && <ProgressPanel sourceLabel={labelOf(sourceKey)} targetLabel={labelOf(targetKey)} />}

      {!compare.isPending && error && (
        <section className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">The comparison could not be completed</div>
            <div className="mt-0.5 text-sm">{error}</div>
            <div className="mt-2 text-xs text-red-700">
              Tip: use the <strong>Test</strong> button next to each database to see which side is failing.
            </div>
          </div>
          <button
            type="button"
            onClick={() => runCompare(true)}
            className="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Retry
          </button>
        </section>
      )}

      {!compare.isPending && !result && !error && (
        <section className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <GitCompareArrows className="h-10 w-10 text-gray-300" />
          <div className="font-semibold text-gray-700">Pick two databases to compare</div>
          <p className="max-w-lg text-sm text-gray-500">
            The <strong>source</strong> is the reference (e.g. the environment a release was tested on); the{" "}
            <strong>target</strong> is checked against it (e.g. PROD). You&apos;ll get every structural difference,
            ranked by how likely it is to break the app, plus a SQL script and an optional AI review.
          </p>
        </section>
      )}

      {result && (!compare.isPending || quietRun) && (
        <div className={cn("relative flex flex-col gap-4 transition-opacity", quietRun && "pointer-events-none opacity-60")}>
          {quietRun && (
            <div className="absolute left-1/2 top-3 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-lg ring-1 ring-gray-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue" /> Updating…
            </div>
          )}
          <ResultSummary
            result={result}
            severityFilter={severityFilter}
            toggleSeverity={(sev) => {
              toggleSeverity(sev);
              setTab("differences");
            }}
            onRefresh={() => lastRequest && runCompare(true, lastRequest)}
            busy={compare.isPending}
          />

          <LegacyPanel
            result={result}
            hideLegacy={hideLegacy}
            setHideLegacy={changeHideLegacy}
            onUsageChanged={() => lastRequest && runCompare(false, lastRequest, { quiet: true })}
            busy={compare.isPending}
          />

          {!result.summary.identical && lastRequest && (
            <section className="overflow-hidden rounded-md bg-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3">
                <nav className="-mb-px flex">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium",
                        tab === t.id
                          ? "border-blue text-blue"
                          : "border-transparent text-gray-500 hover:text-gray-800",
                      )}
                    >
                      {t.icon}
                      {t.label}
                      {t.count !== undefined && (
                        <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-700">{t.count}</span>
                      )}
                    </button>
                  ))}
                </nav>
                <div className="py-2">
                  <DownloadButton
                    label="Export report (JSON)"
                    onClick={() =>
                      downloadFile(
                        `schema-compare_${result.source.database}_vs_${result.target.database}_${fileStamp()}.json`,
                        JSON.stringify(result, null, 2),
                        "application/json",
                      )
                    }
                  />
                </div>
              </div>

              {tab === "differences" && (
                <DiffList
                  result={result}
                  severityFilter={severityFilter}
                  setSeverityFilter={setSeverityFilter}
                  onMarkUnused={markUnused}
                  markingTable={markingTable}
                  selectedIds={selectedIds}
                  onToggleSelect={(item: DiffItem) =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                />
              )}
              {tab === "sql" && <SqlPanel result={result} />}
              {/* Kept mounted so the AI review/thread survive tab switches. */}
              <div className={tab === "ai" ? "" : "hidden"}>
                <AiPanel result={result} request={lastRequest} />
              </div>
            </section>
          )}
        </div>
      )}
      {result && lastRequest && !compare.isPending && (() => {
        const fixable = result.items.filter(isFixable);
        const criticalFixable = fixable.filter((i) => i.severity === "critical" && !i.legacy);
        if (!fixable.length) return null;
        const selected = result.items.filter((i) => selectedIds.has(i.id));
        const openInSchemaChanges = () => {
          const draft: DiffDraft = {
            sourceKey: lastRequest.sourceKey,
            targetKey: lastRequest.targetKey,
            items: selected.map((i) => ({
              object: i.object,
              category: i.category,
              change: i.change,
              name: i.name,
              label: `${i.object.replace(/^public\./, "")}${i.name !== i.object.split(".").pop() ? `.${i.name}` : ""} — ${i.message}`,
            })),
          };
          try {
            window.sessionStorage.setItem(DIFF_DRAFT_KEY, JSON.stringify(draft));
          } catch {
            toast.error("Your browser blocked session storage — add the operations manually in Database Modifications.");
            return;
          }
          router.push("/admin/schema-changes/new");
        };
        return (
          <div className="sticky bottom-3 z-20 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
            <Wrench className="h-4 w-4 text-blue" />
            <span className="text-sm font-medium text-gray-800">
              {selected.length ? `${selected.length} difference(s) selected` : `${fixable.length} difference(s) can be fixed in ${result.target.database}`}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {!selected.length && criticalFixable.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(criticalFixable.map((i) => i.id)))}
                  className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Select all {criticalFixable.length} critical
                </button>
              )}
              {selected.length > 0 && (
                <>
                  <button type="button" onClick={() => setSelectedIds(new Set())} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                  <button
                    type="button"
                    onClick={openInSchemaChanges}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue/90"
                  >
                    <Wrench className="h-4 w-4" /> Fix in {result.target.database}
                  </button>
                </>
              )}
              {!selected.length && <span className="text-xs text-gray-500">or tick differences in the list</span>}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default SchemaComparePage;
