"use client";

import { ArrowRight, CheckCircle2, Clock, Database, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompareResult, DiffSeverity, SideInfo } from "./types";
import { SEVERITY_HELP, SEVERITY_STYLES, formatMs, timeAgo } from "./ui";

const SideCard = ({ side, role }: { side: SideInfo; role: "Source" | "Target" }) => (
  <div className="flex-1 min-w-0 rounded-md border border-gray-200 bg-gray-50 p-3">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{role}</div>
    <div className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900" title={side.label}>
      <Database className="h-4 w-4 shrink-0 text-gray-400" />
      <span className="truncate">{side.label}</span>
    </div>
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600">
      <span>PostgreSQL {side.serverVersion.split(" ")[0]}</span>
      <span>
        {side.relationCount} tables/views · {side.enumCount} enums
      </span>
      <span className="inline-flex items-center gap-1" title={`Captured ${new Date(side.capturedAt).toLocaleString()}`}>
        {side.fromCache ? <Zap className="h-3 w-3 text-amber-500" /> : <Clock className="h-3 w-3" />}
        {side.fromCache ? `cached · read ${timeAgo(side.capturedAt)}` : `read in ${formatMs(side.durationMs)}`}
      </span>
    </div>
  </div>
);

interface ResultSummaryProps {
  result: CompareResult;
  severityFilter: DiffSeverity[];
  toggleSeverity: (s: DiffSeverity) => void;
  onRefresh: () => void;
  busy: boolean;
}

const ResultSummary = ({ result, severityFilter, toggleSeverity, onRefresh, busy }: ResultSummaryProps) => {
  const { summary } = result;
  const anyCached = result.source.fromCache || result.target.fromCache;

  return (
    <section className="rounded-md bg-white p-4 shadow-md sm:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
        <SideCard side={result.source} role="Source" />
        <div className="flex items-center justify-center text-gray-400">
          <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
        </div>
        <SideCard side={result.target} role="Target" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <span>
          Compared {result.schemas.length ? `schema${result.schemas.length > 1 ? "s" : ""} ${result.schemas.join(", ")}` : "all schemas"}{" "}
          · {timeAgo(result.comparedAt)} · took {formatMs(result.durationMs)}
          {anyCached && " · some data came from the 2-minute cache"}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className="inline-flex items-center gap-1 font-medium text-blue hover:text-blue/80 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
          Re-read both databases now
        </button>
      </div>

      {summary.identical ? (
        <div className="mt-4 flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-8 w-8 shrink-0" />
          <div>
            <div className="font-semibold">
              {result.legacy.hiddenDifferences > 0 ? "Every table the app uses matches" : "The schemas match"}
            </div>
            <div className="text-sm">
              No differences in tables, columns, constraints, indexes, triggers, views, enums or extensions across{" "}
              {summary.objectsCompared.source} objects
              {result.legacy.hiddenDifferences > 0
                ? ` — only migrated/unused tables differ (${result.legacy.hiddenDifferences} hidden differences, see below).`
                : "."}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-xs text-gray-600">
              differences across {summary.objectsAffected} object{summary.objectsAffected === 1 ? "" : "s"}
            </div>
          </div>
          {(["critical", "warning", "info"] as DiffSeverity[]).map((sev) => {
            const active = severityFilter.length === 0 || severityFilter.includes(sev);
            return (
              <button
                key={sev}
                type="button"
                onClick={() => toggleSeverity(sev)}
                title={`${SEVERITY_HELP[sev]} Click to filter.`}
                className={cn(
                  "rounded-md border p-3 text-left transition",
                  SEVERITY_STYLES[sev].tile,
                  !active && "opacity-40",
                  summary.bySeverity[sev] === 0 && "opacity-60",
                )}
              >
                <div className="text-2xl font-bold">{summary.bySeverity[sev]}</div>
                <div className="text-xs font-medium">{SEVERITY_STYLES[sev].label}</div>
                <div className="mt-0.5 hidden text-[11px] leading-snug opacity-80 sm:block">{SEVERITY_HELP[sev]}</div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ResultSummary;
