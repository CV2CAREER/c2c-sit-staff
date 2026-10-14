"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, FileSpreadsheet, GitCompareArrows, Loader2, ShieldAlert, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader/PageHeader";
import { cn } from "@/lib/utils";
import { useSchemaDiffTargets } from "@/hooks/api/admin/schemaDiff";
import {
  schemaChangeErrorMessage,
  useCreateSchemaChange,
  useSchemaChangePreview,
  useSchemaChangeStructure,
} from "@/hooks/api/admin/schemaChange";
import DatabaseSelect, { isC2cTarget } from "../../schema-compare/_components/DatabaseSelect";
import OperationEditor from "../_components/OperationEditor";
import ReviewPanel from "../_components/ReviewPanel";
import { describeOperation } from "../_components/StatusBadge";
import { DIFF_DRAFT_KEY, DiffDraft, OperationInput, PlanResult } from "../_components/types";
import { IMPORT_DRAFT_KEY, type ImportDraft } from "../_components/import-types";

const card = "rounded-md bg-white p-4 shadow-md sm:p-5";

const NewSchemaChangePage = () => {
  const router = useRouter();
  const targetsQuery = useSchemaDiffTargets();
  const targets = useMemo(() => (targetsQuery.data?.data?.targets ?? []).filter(isC2cTarget), [targetsQuery.data]);

  const [targetKey, setTargetKey] = useState("");
  const [operations, setOperations] = useState<OperationInput[]>([]);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [fromCompare, setFromCompare] = useState<string | null>(null);
  const [fromImport, setFromImport] = useState<string | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const structure = useSchemaChangeStructure(targetKey);
  const preview = useSchemaChangePreview();
  const create = useCreateSchemaChange();

  // Pick up a change prepared by the sheet import.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(IMPORT_DRAFT_KEY);
      if (!raw) return;
      window.sessionStorage.removeItem(IMPORT_DRAFT_KEY);
      const draft = JSON.parse(raw) as ImportDraft;
      if (!draft?.targetKey || !Array.isArray(draft.operations) || !draft.operations.length) return;
      setTargetKey(draft.targetKey);
      setOperations(draft.operations);
      setTitle(draft.title);
      setReason(draft.reason);
      setFromImport(draft.source);
    } catch {
      /* ignore a malformed draft */
    }
  }, []);

  // Pick up differences queued from Database Evaluation ("Fix in target").
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DIFF_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as DiffDraft;
      window.sessionStorage.removeItem(DIFF_DRAFT_KEY);
      if (!draft?.targetKey || !Array.isArray(draft.items) || !draft.items.length) return;
      setTargetKey(draft.targetKey);
      setFromCompare(draft.sourceKey);
      setOperations(
        draft.items.map((item) => ({
          kind: "apply_diff",
          sourceKey: draft.sourceKey,
          schemas: [],
          item: { object: item.object, category: item.category, change: item.change, name: item.name },
          label: item.label,
        })),
      );
      setTitle(`Sync ${draft.items.length} difference(s) from ${draft.sourceKey.replace(/^db:|^cfg:/, "")}`);
    } catch {
      /* ignore a malformed draft */
    }
  }, []);

  // Any edit invalidates the review — you always submit exactly what was reviewed.
  useEffect(() => {
    setPlan(null);
    setPlanError(null);
  }, [operations, targetKey]);

  const target = targets.find((t) => t.key === targetKey);
  const isProtected = structure.data?.isProtected ?? false;

  const runReview = () => {
    setPlanError(null);
    preview.mutate(
      { targetKey, operations },
      {
        onSuccess: (p) => {
          setPlan(p);
          setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        },
        onError: (e) => setPlanError(schemaChangeErrorMessage(e)),
      },
    );
  };

  const submit = () => {
    create.mutate(
      { targetKey, operations, title: title.trim(), reason: reason.trim() },
      {
        onSuccess: (request) => {
          toast.success(request.isProtected ? "Submitted for approval" : "Saved — review it once more and apply");
          router.push(`/admin/schema-changes/${request.id}`);
        },
        onError: (e) => toast.error(schemaChangeErrorMessage(e)),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="New database modification" description="Build the change, review its impact, then submit it." />

      <section className={card}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">1. Database to change</h3>
        <div className="max-w-xl">
          <DatabaseSelect
            value={targetKey}
            otherValue=""
            otherRole="source"
            targets={targets}
            disabled={targetsQuery.isLoading || operations.length > 0}
            onChange={setTargetKey}
          />
          {operations.length > 0 && <p className="mt-1 text-xs text-gray-500">Remove all operations to switch database.</p>}
        </div>
        {target && isProtected && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{target.database}</strong> is protected. After you submit, a <strong>different admin</strong> must approve the change before anyone can apply it.
            </span>
          </div>
        )}
        {structure.isError && <p className="mt-2 text-sm text-red-700">{schemaChangeErrorMessage(structure.error)}</p>}
      </section>

      {targetKey && (
        <section className={card}>
          <h3 className="mb-3 text-sm font-semibold text-gray-900">2. Operations</h3>
          {fromImport && (
            <p className="mb-3 flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs text-gray-700">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Prepared from <strong>{fromImport}</strong> — only the rows that were found and verified are included.
            </p>
          )}
          {fromCompare && (
            <p className="mb-3 flex items-center gap-1.5 rounded-md bg-blue/10 px-3 py-2 text-xs text-gray-700">
              <GitCompareArrows className="h-4 w-4 text-blue" />
              Queued from Database Evaluation — definitions are read from <code>{fromCompare.replace(/^db:|^cfg:/, "")}</code> on the server.
            </p>
          )}
          {operations.length > 0 ? (
            <ol className="mb-4 space-y-1.5">
              {operations.map((op, i) => (
                <li key={i} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-700">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{describeOperation(op)}</span>
                  <button type="button" title="Remove" onClick={() => setOperations(operations.filter((_, j) => j !== i))} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mb-4 text-sm text-gray-500">No operations yet — add one below. Operations run in order, in one transaction.</p>
          )}

          <div className="rounded-md border border-dashed border-gray-300 p-4">
            {structure.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading {target?.database ?? "the database"}&apos;s structure…
              </div>
            ) : structure.data ? (
              <OperationEditor structure={structure.data} onAdd={(op) => setOperations([...operations, op])} />
            ) : null}
          </div>
        </section>
      )}

      {operations.length > 0 && (
        <section className={card}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">3. Review</h3>
              <p className="text-xs text-gray-500">
                Runs every pre-flight check and a dry run (in a transaction that is rolled back) on {target?.database}, and maps the impact on screens. Nothing is changed.
              </p>
            </div>
            <button
              type="button"
              onClick={runReview}
              disabled={preview.isPending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue px-5 py-2 text-sm font-semibold text-white hover:bg-blue/90 disabled:bg-blue/40"
            >
              {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
              {preview.isPending ? "Reviewing… (10–30s)" : plan ? "Review again" : "Review change"}
            </button>
          </div>
          {planError && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {planError}
            </div>
          )}
        </section>
      )}

      {plan && (
        <div ref={reviewRef} className="flex flex-col gap-4">
          <ReviewPanel plan={plan} />

          <section className={cn(card, !plan.summary.canApply && "opacity-60")}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">4. Submit</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Add referralSource to users"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Why (for the approver and the audit trail)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={4000}
                  placeholder="e.g. Needed by release 19.17 — the model already declares it"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col-reverse items-start justify-between gap-2 sm:flex-row sm:items-center">
              <span className="text-xs text-gray-500">
                {!plan.summary.canApply
                  ? "Fix the blockers above first."
                  : plan.isProtected
                    ? "Submitting sends it for approval — nothing runs yet."
                    : "Submitting saves it; you'll apply it from the next screen."}
              </span>
              <button
                type="button"
                onClick={submit}
                disabled={!plan.summary.canApply || title.trim().length < 3 || create.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {plan.isProtected ? "Submit for approval" : "Save change"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default NewSchemaChangePage;
