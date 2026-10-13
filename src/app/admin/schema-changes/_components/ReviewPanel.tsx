"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  FlaskConical,
  Loader2,
  MonitorSmartphone,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaChangeErrorMessage, useSchemaChangeExplain } from "@/hooks/api/admin/schemaChange";
import { CopyButton, DownloadButton, Pill, downloadFile, fileStamp, timeAgo } from "../../schema-compare/_components/ui";
import MarkdownText from "../../schema-compare/_components/MarkdownText";
import type { CheckResult, ImpactLevel, PlanResult, PlannedOperation, Risk } from "./types";

export const RISK_STYLE: Record<Risk, { label: string; className: string }> = {
  safe: { label: "Safe", className: "bg-green-50 text-green-700 ring-green-200" },
  caution: { label: "Caution", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  destructive: { label: "Destructive", className: "bg-red-50 text-red-700 ring-red-200" },
};

export const IMPACT_STYLE: Record<ImpactLevel, { label: string; className: string }> = {
  none: { label: "No code impact", className: "bg-gray-50 text-gray-600 ring-gray-200" },
  low: { label: "Low impact", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  medium: { label: "Medium impact", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  high: { label: "High impact", className: "bg-orange-50 text-orange-700 ring-orange-200" },
  blocker: { label: "Breaks the app", className: "bg-red-50 text-red-700 ring-red-200" },
};

const DRY_STYLE: Record<PlannedOperation["dryRun"]["status"], { label: string; className: string }> = {
  passed: { label: "Dry run passed", className: "bg-green-50 text-green-700 ring-green-200" },
  failed: { label: "Dry run failed", className: "bg-red-50 text-red-700 ring-red-200" },
  skipped: { label: "Dry run skipped", className: "bg-gray-100 text-gray-600 ring-gray-200" },
  not_run: { label: "Not dry-run", className: "bg-gray-100 text-gray-500 ring-gray-200" },
};

const CheckIcon = ({ status }: { status: CheckResult["status"] }) =>
  status === "pass" ? (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
  ) : status === "warn" ? (
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
  ) : (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
  );

const APP_LABEL = { staff: "Staff portal", customer: "Customer portal" } as const;

const ScreenChips = ({ screens, more }: { screens: PlannedOperation["impact"]["screens"]; more?: number }) => {
  const byApp = (["staff", "customer"] as const).map((app) => ({ app, list: screens.filter((s) => s.app === app) }));
  return (
    <div className="space-y-2">
      {byApp
        .filter((g) => g.list.length)
        .map((g) => (
          <div key={g.app}>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {g.app === "staff" ? <Users className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
              {APP_LABEL[g.app]} · {g.list.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {g.list.map((s) => (
                <code
                  key={`${s.app}${s.route}`}
                  title={s.direct ? "The page (or its own components) calls an affected endpoint" : "Reached through shared hooks/components — may or may not use the affected data"}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px]",
                    s.direct ? "bg-violet-100 font-semibold text-violet-800" : "bg-gray-100 text-gray-600",
                  )}
                >
                  {s.route}
                </code>
              ))}
            </div>
          </div>
        ))}
      {!!more && <p className="text-[11px] text-gray-500">…and {more} more screen(s).</p>}
    </div>
  );
};

const Section = ({ title, icon, children, defaultOpen = false, badge }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50">
        {open ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
        {icon}
        {title}
        {badge}
      </button>
      {open && <div className="px-4 pb-3 pl-10">{children}</div>}
    </div>
  );
};

const OperationCard = ({ op }: { op: PlannedOperation }) => {
  const fails = op.checks.filter((c) => c.status === "fail").length;
  const warns = op.checks.filter((c) => c.status === "warn").length;
  const blocked = fails > 0 || op.dryRun.status === "failed";
  return (
    <li className={cn("overflow-hidden rounded-md border bg-white", blocked ? "border-red-300" : "border-gray-200")}>
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", blocked ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700")}>
          {op.index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900">{op.title}</div>
          {op.origin && <div className="mt-0.5 text-xs text-gray-500">{op.origin}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill className={RISK_STYLE[op.risk].className}>{RISK_STYLE[op.risk].label}</Pill>
            <Pill className={IMPACT_STYLE[op.impact.level].className}>{IMPACT_STYLE[op.impact.level].label}</Pill>
            <Pill className={DRY_STYLE[op.dryRun.status].className}>
              <FlaskConical className="h-3 w-3" /> {DRY_STYLE[op.dryRun.status].label}
            </Pill>
            {op.backups.length > 0 && (
              <Pill className="bg-slate-100 text-slate-700 ring-slate-200">
                <Archive className="h-3 w-3" /> Backed up first
              </Pill>
            )}
          </div>
          {op.impact.headline && (
            <p className={cn("mt-2 text-sm", op.impact.level === "blocker" ? "font-medium text-red-700" : "text-gray-700")}>{op.impact.headline}</p>
          )}
          {op.dryRun.message && op.dryRun.status !== "passed" && (
            <p className={cn("mt-1 text-xs", op.dryRun.status === "failed" ? "text-red-700" : "text-gray-500")}>{op.dryRun.message}</p>
          )}
        </div>
      </div>

      {op.preview && (
        <Section title={`Rows that will be deleted${op.expectedRows !== undefined ? ` (first ${op.preview.rows.length} of ${op.expectedRows.toLocaleString()})` : ""}`} icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />} defaultOpen>
          <div className="max-h-56 overflow-auto rounded border border-gray-200">
            <table className="min-w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {op.preview.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap border-b border-gray-200 px-2 py-1 font-semibold text-gray-700">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {op.preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {row.map((v, j) => (
                      <td key={j} className={cn("max-w-[200px] truncate whitespace-nowrap px-2 py-1", v === null ? "italic text-gray-300" : "text-gray-800")} title={v ?? "NULL"}>
                        {v ?? "NULL"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">Sensitive columns (passwords, tokens…) are masked. All of these rows are copied to a backup table before the delete.</p>
        </Section>
      )}

      <Section
        title="Pre-flight checks"
        icon={<ShieldAlert className="h-3.5 w-3.5 text-gray-400" />}
        defaultOpen={fails > 0 || warns > 0}
        badge={
          <span className="ml-1 font-normal text-gray-500">
            {fails ? <span className="text-red-600">{fails} failed</span> : warns ? <span className="text-amber-600">{warns} warning(s)</span> : "all passed"}
          </span>
        }
      >
        {(() => {
          // Big tables (e.g. users) produce dozens of "no rows affected"
          // checks — show what matters, fold the rest.
          const important = op.checks.filter((c) => c.status !== "pass" || /^Rows to|^Row to/.test(c.label));
          const passed = op.checks.filter((c) => !important.includes(c));
          const item = (c: CheckResult, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckIcon status={c.status} />
              <span>
                <span className="font-medium text-gray-800">{c.label}:</span> <span className="text-gray-600">{c.message}</span>
              </span>
            </li>
          );
          return (
            <>
              <ul className="space-y-1.5">{(important.length ? important : passed.slice(0, 6)).map(item)}</ul>
              {important.length > 0 && passed.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">{passed.length} other check(s) passed</summary>
                  <ul className="mt-1.5 space-y-1">{passed.map(item)}</ul>
                </details>
              )}
              {!important.length && passed.length > 6 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">{passed.length - 6} more passed</summary>
                  <ul className="mt-1.5 space-y-1">{passed.slice(6).map(item)}</ul>
                </details>
              )}
            </>
          );
        })()}
      </Section>

      <Section
        title="Code impact"
        icon={<Boxes className="h-3.5 w-3.5 text-gray-400" />}
        defaultOpen={op.impact.level === "blocker" || op.impact.level === "high"}
        badge={<span className="ml-1 font-normal text-gray-500">{op.impact.endpoints.length} endpoint(s) · {op.impact.screens.length + op.impact.moreScreens} screen(s)</span>}
      >
        {op.impact.notes.map((n, i) => (
          <p key={i} className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-900">{n}</p>
        ))}
        {op.impact.models.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Models</div>
            <ul className="space-y-0.5 text-xs text-gray-700">
              {op.impact.models.map((m, i) => (
                <li key={i}>
                  <code className="font-semibold">{m.className}</code>
                  {m.attribute && <code>.{m.attribute}</code>} — {m.app === "staff" ? "staff" : "customer"} backend, <code className="text-gray-500">{m.file}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        {op.impact.screens.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Screens</div>
            <ScreenChips screens={op.impact.screens} more={op.impact.moreScreens} />
          </div>
        )}
        {op.impact.endpoints.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold uppercase tracking-wide text-gray-500">API endpoints ({op.impact.endpoints.length})</summary>
            <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto">
              {op.impact.endpoints.map((e, i) => (
                <li key={i} className="font-mono text-[11px] text-gray-700">
                  <span className="inline-block w-14 font-semibold">{e.method}</span>
                  {e.path} <span className="text-gray-400">({e.app})</span>
                  {e.mentionsColumn && <span className="ml-1 text-violet-700">· uses column</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
        {!op.impact.models.length && !op.impact.endpoints.length && !op.impact.screens.length && (
          <p className="text-xs text-gray-500">No model, endpoint or screen depends on this.</p>
        )}
      </Section>

      <Section title="SQL that will run" icon={<FlaskConical className="h-3.5 w-3.5 text-gray-400" />}>
        {op.backupStatements.length > 0 && (
          <>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Backup (runs first, same transaction)</div>
            <pre className="mb-2 overflow-auto rounded bg-slate-800 p-2 text-[11px] text-slate-100">{op.backupStatements.join("\n")}</pre>
          </>
        )}
        <pre className="overflow-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">{op.statements.join("\n")}</pre>
        {op.backups.map((b) => (
          <p key={b.table} className="mt-1 text-xs text-gray-600">
            Backup table <code>{b.table}</code>: {b.description}
          </p>
        ))}
      </Section>

      <Section title="How to undo" icon={<Undo2 className="h-3.5 w-3.5 text-gray-400" />}>
        {op.undoStatements.length ? (
          <pre className="overflow-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">{op.undoStatements.join("\n")}</pre>
        ) : (
          <p className="text-xs text-gray-500">No automatic undo.</p>
        )}
        {op.undoNote && <p className="mt-1 text-xs text-amber-800">{op.undoNote}</p>}
        {op.notes.map((n, i) => (
          <p key={i} className="mt-1 text-xs text-gray-500">{n}</p>
        ))}
      </Section>
    </li>
  );
};

interface ReviewPanelProps {
  plan: PlanResult;
  requestId?: string;
}

const ReviewPanel = ({ plan, requestId }: ReviewPanelProps) => {
  const [tab, setTab] = useState<"ops" | "sql" | "undo">("ops");
  const explain = useSchemaChangeExplain();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);
  const { summary } = plan;

  const allScreens = useMemo(() => {
    const map = new Map<string, PlannedOperation["impact"]["screens"][number]>();
    for (const op of plan.operations) {
      for (const s of op.impact.screens) {
        const key = `${s.app}${s.route}`;
        const prev = map.get(key);
        if (!prev || (s.direct && !prev.direct)) map.set(key, s);
      }
    }
    return [...map.values()].sort((a, b) => Number(b.direct) - Number(a.direct) || a.route.localeCompare(b.route));
  }, [plan]);

  const verdict = !summary.canApply
    ? { tone: "red", icon: <CircleSlash className="h-6 w-6" />, title: "Blocked — this change can't be applied", text: summary.reasonsBlocked.join(" ") }
    : summary.warnings || summary.destructive || summary.impactLevel === "medium" || summary.impactLevel === "high"
      ? { tone: "amber", icon: <AlertTriangle className="h-6 w-6" />, title: "Can be applied — read the warnings first", text: plan.dryRun.message }
      : { tone: "green", icon: <CheckCircle2 className="h-6 w-6" />, title: "Safe to apply", text: plan.dryRun.message };

  return (
    <div className="space-y-4">
      <section
        className={cn(
          "rounded-md border p-4",
          verdict.tone === "red" && "border-red-200 bg-red-50 text-red-900",
          verdict.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900",
          verdict.tone === "green" && "border-green-200 bg-green-50 text-green-900",
        )}
      >
        <div className="flex items-start gap-3">
          {verdict.icon}
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{verdict.title}</div>
            <p className="mt-0.5 text-sm">{verdict.text}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill className={RISK_STYLE[summary.risk].className}>Risk: {RISK_STYLE[summary.risk].label}</Pill>
              <Pill className={IMPACT_STYLE[summary.impactLevel].className}>{IMPACT_STYLE[summary.impactLevel].label}</Pill>
              <Pill className="bg-white text-gray-700 ring-gray-200">
                {plan.operations.length} operation(s) · {summary.blockers} blocker(s) · {summary.warnings} warning(s)
              </Pill>
              {summary.backups > 0 && <Pill className="bg-white text-gray-700 ring-gray-200">{summary.backups} automatic backup(s)</Pill>}
              {summary.requiresApproval && (
                <Pill className="bg-red-600 text-white ring-red-600">
                  <ShieldAlert className="h-3 w-3" /> Protected — needs a 2nd admin
                </Pill>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Screens that may be affected</h3>
          <span className="text-[11px] text-gray-500">
            From a scan of all four repos, {timeAgo(plan.codeIndex.generatedAt)}. <span className="font-semibold text-violet-700">Bold</span> = the screen calls an affected endpoint directly.
          </span>
        </div>
        {allScreens.length ? (
          <ScreenChips screens={allScreens} />
        ) : (
          <p className="text-sm text-gray-500">No staff or customer screen depends on what's being changed.</p>
        )}
        {plan.codeIndex.missingRepos.length > 0 && (
          <p className="mt-2 text-xs text-amber-800">Not scanned (repo not found when the index was built): {plan.codeIndex.missingRepos.join(", ")}.</p>
        )}
      </section>

      <section className="rounded-md border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Sparkles className="h-4 w-4 text-violet-500" /> AI review
          </h3>
          <button
            type="button"
            disabled={explain.isPending}
            onClick={() => {
              setExplainError(null);
              explain.mutate(requestId ? { requestId } : { plan }, {
                onSuccess: (d) => setExplanation(d.explanation),
                onError: (e) => setExplainError(schemaChangeErrorMessage(e)),
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-violet-300"
          >
            {explain.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : explanation ? <RotateCcw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {explain.isPending ? "Thinking…" : explanation ? "Ask again" : "Explain in plain English"}
          </button>
        </div>
        {explainError && <p className="mt-2 text-sm text-red-700">{explainError}</p>}
        {explanation && <MarkdownText text={explanation} className="mt-2" />}
        {!explanation && !explainError && (
          <p className="mt-1 text-xs text-gray-600">Only the plan (names, SQL, check results, impact) is sent — never any row data. Treat it as a second opinion.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3">
          <nav className="-mb-px flex">
            {(
              [
                ["ops", `Operations (${plan.operations.length})`],
                ["sql", "Full SQL"],
                ["undo", "Undo script"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn("border-b-2 px-3 py-2.5 text-sm font-medium", tab === id ? "border-blue text-blue" : "border-transparent text-gray-500 hover:text-gray-800")}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab !== "ops" && (
            <div className="flex gap-2 py-2">
              <CopyButton text={tab === "sql" ? plan.sql : plan.undoSql} what="SQL copied" />
              <DownloadButton
                label="Download"
                onClick={() =>
                  downloadFile(`schema-${tab === "sql" ? "change" : "undo"}_${plan.targetDatabase}_${fileStamp()}.sql`, tab === "sql" ? plan.sql : plan.undoSql, "application/sql")
                }
              />
            </div>
          )}
        </div>
        {tab === "ops" && (
          <ul className="space-y-3 bg-gray-50 p-3">
            {plan.operations.map((op) => (
              <OperationCard key={op.index} op={op} />
            ))}
          </ul>
        )}
        {tab !== "ops" && <pre className="max-h-[60vh] overflow-auto bg-slate-900 p-3 text-xs text-slate-100">{tab === "sql" ? plan.sql : plan.undoSql}</pre>}
      </section>
    </div>
  );
};

export default ReviewPanel;
