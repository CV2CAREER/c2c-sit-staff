"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatabaseZap, FileSpreadsheet, KeyRound, Loader2, Plus, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { cn } from "@/lib/utils";
import { schemaChangeErrorMessage, useSchemaChanges } from "@/hooks/api/admin/schemaChange";
import { EnvBadge } from "../schema-compare/_components/DatabaseSelect";
import { RISK_STYLE } from "./_components/ReviewPanel";
import StatusBadge from "./_components/StatusBadge";
import type { ChangeRequest } from "./_components/types";
import { Pill, timeAgo } from "../schema-compare/_components/ui";

type Tab = "action" | "history";

const NEEDS_ACTION = new Set(["pending_approval", "approved", "ready", "running"]);

const SchemaChangesPage = () => {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("action");
  const query = useSchemaChanges();
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const actionable = rows.filter((r) => NEEDS_ACTION.has(r.status));
  const history = rows.filter((r) => !NEEDS_ACTION.has(r.status));
  const list = tab === "action" ? actionable : history;
  const awaitingApproval = actionable.filter((r) => r.status === "pending_approval").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Database Modifications"
        description="Change a database's structure with a full review first: pre-flight checks, a dry run, automatic backups and the screens each change affects."
        renderJSX={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/schema-changes/import" className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <FileSpreadsheet className="h-4 w-4 text-green-600" /> Import from sheet
            </Link>
            <Link href="/admin/schema-changes/new" className="inline-flex items-center gap-1.5 rounded-md bg-blue px-3 py-2 text-sm font-semibold text-white hover:bg-blue/90">
              <Plus className="h-4 w-4" /> New change
            </Link>
          </div>
        }
      />

      {awaitingApproval > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {awaitingApproval} change(s) to a protected database are waiting for a second admin&apos;s approval.
        </div>
      )}

      <section className="overflow-hidden rounded-md bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-gray-200 px-3">
          <nav className="-mb-px flex">
            {(
              [
                ["action", `Open (${actionable.length})`],
                ["history", `History (${history.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn("border-b-2 px-3 py-3 text-sm font-medium", tab === id ? "border-blue text-blue" : "border-transparent text-gray-500 hover:text-gray-800")}
              >
                {label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => query.refetch()} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
            <RefreshCw className={cn("h-3.5 w-3.5", query.isFetching && "animate-spin")} /> Refresh
          </button>
        </div>

        {query.isLoading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading changes…
          </div>
        ) : query.isError ? (
          <div className="flex items-center gap-2 p-6 text-sm text-red-700">
            <XCircle className="h-4 w-4" /> {schemaChangeErrorMessage(query.error)}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <DatabaseZap className="h-10 w-10 text-gray-300" />
            <div className="font-semibold text-gray-700">{tab === "action" ? "Nothing waiting" : "No past changes yet"}</div>
            <p className="max-w-md text-sm text-gray-500">
              Start a change here, or use <strong>Fix in target</strong> on differences in Database Evaluation.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((r: ChangeRequest) => (
              <li key={r.id}>
                <button type="button" onClick={() => router.push(`/admin/schema-changes/${r.id}`)} className="flex w-full flex-col gap-1.5 px-4 py-3 text-left hover:bg-gray-50 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-gray-900">{r.title}</span>
                      {r.kind === "revert" && <Pill className="bg-slate-100 text-slate-700 ring-slate-200">Revert</Pill>}
                      {r.approvalMethod === "master_key" && (
                        <Pill className="bg-amber-50 text-amber-800 ring-amber-200">
                          <KeyRound className="h-3 w-3" /> Master key
                        </Pill>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      <code>{r.targetDatabase}</code>
                      <EnvBadge database={r.targetDatabase} />
                      <span>· by {r.createdByName || r.createdByEmail || "an admin"} · {timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Pill className={RISK_STYLE[r.riskLevel].className}>{RISK_STYLE[r.riskLevel].label}</Pill>
                    <StatusBadge status={r.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SchemaChangesPage;
