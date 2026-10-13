"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  KeyRound,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader/PageHeader";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/user.store";
import { schemaChangeErrorMessage, useSchemaChange, useSchemaChangeAction } from "@/hooks/api/admin/schemaChange";
import { EnvBadge } from "../../schema-compare/_components/DatabaseSelect";
import { timeAgo } from "../../schema-compare/_components/ui";
import ReviewPanel from "../_components/ReviewPanel";
import StatusBadge from "../_components/StatusBadge";
import type { ChangeRequest } from "../_components/types";

const card = "rounded-md bg-white p-4 shadow-md sm:p-5";

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Timeline = ({ r }: { r: ChangeRequest }) => {
  const steps = [
    { label: "Requested", done: true, who: r.createdByName || r.createdByEmail, when: r.createdAt },
    ...(r.isProtected
      ? [{ label: r.approvalMethod === "master_key" ? "Approved via master key" : "Approved", done: !!r.approvedAt, who: r.approvedByName || r.approvedByEmail, when: r.approvedAt }]
      : []),
    {
      label: r.status === "failed" ? "Failed — rolled back" : "Applied",
      done: r.status === "applied" || r.status === "failed",
      who: r.appliedByName || r.appliedByEmail,
      when: r.appliedAt ?? (r.status === "failed" ? r.updatedAt : null),
      bad: r.status === "failed",
    },
  ];
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:gap-6">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          {s.done ? (
            "bad" in s && s.bad ? <XCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Clock className="h-5 w-5 text-gray-300" />
          )}
          <div className="text-xs">
            <div className={cn("font-semibold", s.done ? "text-gray-900" : "text-gray-400")}>{s.label}</div>
            {s.done && (s.who || s.when) && (
              <div className="text-gray-500">
                {s.who ?? ""} {s.when ? `· ${timeAgo(s.when)}` : ""}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

const SchemaChangeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const myId = (user as { _id?: string; id?: string } | null)?._id || (user as { id?: string } | null)?.id || "";
  const query = useSchemaChange(id);
  const action = useSchemaChangeAction(id);
  const [modal, setModal] = useState<null | "apply" | "approve" | "reject" | "cancel" | "revert">(null);
  const [confirmation, setConfirmation] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [useMasterKey, setUseMasterKey] = useState(false);

  const r = query.data;
  const plan = r?.plan;

  const run = (kind: "apply" | "approve" | "reject" | "cancel" | "revert") => {
    action.mutate(
      { action: kind, confirmation, reason: rejectReason, masterKey: kind === "approve" && useMasterKey ? masterKey : undefined },
      {
        onSuccess: (res) => {
          setModal(null);
          setConfirmation("");
          setMasterKey("");
          setUseMasterKey(false);
          if (kind === "revert") {
            toast.success("Revert prepared — review it before applying");
            router.push(`/admin/schema-changes/${res.id}`);
            return;
          }
          if (kind === "apply") {
            if (res.status === "applied") toast.success("Applied and verified");
            else toast.error("The change failed and was rolled back — the database is unchanged");
          } else {
            toast.success(kind === "approve" ? "Approved" : kind === "reject" ? "Rejected" : "Cancelled");
          }
        },
        onError: (e) => {
          toast.error(schemaChangeErrorMessage(e));
          setModal(null);
          query.refetch();
        },
      },
    );
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (query.isError || !r) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-red-700">
        <XCircle className="h-4 w-4" /> {schemaChangeErrorMessage(query.error)}
      </div>
    );
  }

  const isCreator = !!myId && myId === r.createdById;
  const canApply = (r.status === "ready" && !r.isProtected) || (r.status === "approved" && r.isProtected);
  const needsTyped = !!plan?.summary.requiresTypedConfirmation;
  const verificationFailed = (r.verification || []).some((v) => !v.ok);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={r.title} description={r.kind === "revert" ? "Revert of an earlier change" : "Database modification"} renderJSX={<StatusBadge status={r.status} />} />

      <section className={card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-gray-500">Database</span>
              <code className="font-semibold">{r.targetDatabase}</code>
              <EnvBadge database={r.targetDatabase} />
              {r.isProtected && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <ShieldAlert className="h-3 w-3" /> Protected
                </span>
              )}
            </div>
            {r.reason && <p className="text-sm text-gray-700">“{r.reason}”</p>}
            <Timeline r={r} />
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {r.status === "pending_approval" &&
              (isCreator ? (
                <>
                  <span className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Waiting for a different admin to approve.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUseMasterKey(true);
                      setModal("approve");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
                  >
                    <KeyRound className="h-4 w-4" /> Approve with master key
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setModal("approve")} className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">
                    <ThumbsUp className="h-4 w-4" /> Approve
                  </button>
                  <button type="button" onClick={() => setModal("reject")} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <ThumbsDown className="h-4 w-4" /> Reject
                  </button>
                </>
              ))}
            {canApply && (
              <button type="button" onClick={() => setModal("apply")} className="inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue/90">
                <Play className="h-4 w-4" /> Apply to {r.targetDatabase}
              </button>
            )}
            {["ready", "pending_approval", "approved"].includes(r.status) && (
              <button type="button" onClick={() => setModal("cancel")} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancel request
              </button>
            )}
            {r.status === "applied" && !r.revertedById && r.kind !== "revert" && (
              <button type="button" onClick={() => setModal("revert")} className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <RotateCcw className="h-4 w-4" /> Revert…
              </button>
            )}
          </div>
        </div>
      </section>

      {r.status === "running" && (
        <section className={cn(card, "flex items-center gap-3")}>
          <Loader2 className="h-6 w-6 animate-spin text-blue" />
          <div>
            <div className="font-semibold">Applying to {r.targetDatabase}…</div>
            <div className="text-sm text-gray-500">One transaction: it either fully applies or changes nothing. This page updates by itself.</div>
          </div>
        </section>
      )}

      {r.status === "rejected" && r.rejectedReason && (
        <section className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <strong>Rejected{r.rejectedByName ? ` by ${r.rejectedByName}` : ""}:</strong> {r.rejectedReason}
        </section>
      )}

      {r.status === "failed" && (
        <section className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">The change did not apply — the database is unchanged</div>
            <p className="mt-0.5 text-sm">{r.error}</p>
          </div>
        </section>
      )}

      {r.status === "applied" && (
        <section className={cn("rounded-md border p-4", verificationFailed ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50")}>
          <div className="flex items-start gap-3">
            {verificationFailed ? <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" /> : <ShieldCheck className="mt-0.5 h-5 w-5 text-green-600" />}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{verificationFailed ? "Applied — but some checks after the change didn't match" : "Applied and verified"}</div>
              <ul className="mt-1 space-y-0.5 text-sm">
                {(r.verification || []).map((v, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    {v.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <XCircle className="h-3.5 w-3.5 text-red-600" />}
                    {v.message}
                  </li>
                ))}
              </ul>
              {r.revertedById && (
                <p className="mt-2 text-sm">
                  Reverted by{" "}
                  <button type="button" className="font-medium underline" onClick={() => router.push(`/admin/schema-changes/${r.revertedById}`)}>
                    this change
                  </button>
                  .
                </p>
              )}
            </div>
          </div>
          {!!r.backups?.length && (
            <div className="mt-3 rounded-md bg-white/70 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-gray-800">
                <Archive className="h-4 w-4" /> Backups kept in {r.targetDatabase}
              </div>
              <ul className="space-y-0.5 text-xs text-gray-700">
                {r.backups.map((b) => (
                  <li key={b.table}>
                    <code>{b.table}</code> — {b.description}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-gray-500">They show up as migrated/unused tables in Database Evaluation. Drop them once you&apos;re sure.</p>
            </div>
          )}
        </section>
      )}

      {!!r.executionLog?.length && (
        <details className={card}>
          <summary className="cursor-pointer text-sm font-semibold text-gray-900">Execution log ({r.executionLog.length} statements)</summary>
          <ul className="mt-2 space-y-1">
            {r.executionLog.map((l, i) => (
              <li key={i} className={cn("rounded px-2 py-1 font-mono text-[11px]", l.ok ? "bg-gray-50 text-gray-700" : "bg-red-50 text-red-800")}>
                {l.ok ? "✓" : "✗"} {l.durationMs}ms — {l.sql}
                {l.error && <div className="mt-0.5 font-sans">{l.error}</div>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {plan && (
        <>
          <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Review {r.status === "applied" ? "as applied" : "(re-checked against the live database before anything runs)"}
          </h2>
          <ReviewPanel plan={plan} requestId={r.id} />
        </>
      )}

      {modal === "apply" && plan && (
        <Modal title={`Apply to ${r.targetDatabase}?`} onClose={() => setModal(null)}>
          <ul className="mb-3 space-y-1 text-sm text-gray-700">
            <li>• {plan.operations.length} operation(s), in one transaction — all or nothing.</li>
            <li>• The plan is re-checked against the live database first; if anything changed, nothing runs.</li>
            {plan.summary.backups > 0 && <li>• {plan.summary.backups} backup table(s) are created first.</li>}
            {plan.operations.some((o) => o.impact.screens.length) && (
              <li>• Affects {new Set(plan.operations.flatMap((o) => o.impact.screens.map((s) => s.app + s.route))).size} screen(s) — see the review.</li>
            )}
          </ul>
          {needsTyped && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Type <code className="rounded bg-gray-100 px-1">{r.targetDatabase}</code> to confirm
              </label>
              <input
                autoFocus
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 font-mono text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              Not now
            </button>
            <button
              type="button"
              disabled={action.isPending || (needsTyped && confirmation.trim() !== r.targetDatabase)}
              onClick={() => run("apply")}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue/90 disabled:bg-blue/40"
            >
              {action.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {action.isPending ? "Applying…" : "Apply now"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "approve" && (
        <Modal
          title={useMasterKey ? "Approve with the master key" : "Approve this change?"}
          onClose={() => {
            setModal(null);
            setMasterKey("");
            setUseMasterKey(false);
          }}
        >
          <p className="mb-3 text-sm text-gray-700">
            The plan is re-checked against <strong>{r.targetDatabase}</strong> now. If the database or code changed since it was requested, you&apos;ll be asked to review the refreshed plan instead.
          </p>
          {useMasterKey ? (
            <div className="mb-4 space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This skips the second-admin review. It&apos;s recorded as <strong>approved via master key</strong> by you, added to the Audit Trail, and posted to Slack. 5 wrong attempts lock it for 15 minutes.
                </span>
              </div>
              <label className="block text-xs font-semibold text-gray-600">Master key</label>
              <input
                type="password"
                autoFocus
                autoComplete="off"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && masterKey && !action.isPending && run("approve")}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
              />
            </div>
          ) : (
            <button type="button" onClick={() => setUseMasterKey(true)} className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900">
              <KeyRound className="h-3.5 w-3.5" /> Use the master key instead
            </button>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModal(null);
                setMasterKey("");
                setUseMasterKey(false);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              disabled={action.isPending || (useMasterKey && !masterKey)}
              onClick={() => run("approve")}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {action.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {useMasterKey ? "Approve with master key" : "Approve"}
            </button>
          </div>
        </Modal>
      )}

      {modal === "reject" && (
        <Modal title="Reject this change" onClose={() => setModal(null)}>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Why?</label>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="mb-4 w-full rounded-md border border-gray-300 p-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">Back</button>
            <button type="button" disabled={action.isPending || rejectReason.trim().length < 3} onClick={() => run("reject")} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              Reject
            </button>
          </div>
        </Modal>
      )}

      {modal === "cancel" && (
        <Modal title="Cancel this request?" onClose={() => setModal(null)}>
          <p className="mb-4 text-sm text-gray-700">Nothing has been applied. It will move to History.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">Keep it</button>
            <button type="button" disabled={action.isPending} onClick={() => run("cancel")} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Cancel request</button>
          </div>
        </Modal>
      )}

      {modal === "revert" && (
        <Modal title="Prepare a revert?" onClose={() => setModal(null)}>
          <p className="mb-4 text-sm text-gray-700">
            This builds a new change from the undo steps recorded before this one ran (restoring from backups where needed), and dry-runs it. It goes through the same review{r.isProtected ? " and approval" : ""} before anything runs.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">Back</button>
            <button type="button" disabled={action.isPending} onClick={() => run("revert")} className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {action.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Prepare revert
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SchemaChangeDetailPage;
