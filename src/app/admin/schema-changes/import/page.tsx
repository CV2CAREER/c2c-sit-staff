"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  FileSpreadsheet,
  Link2,
  Loader2,
  MinusCircle,
  Pencil,
  SearchX,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader/PageHeader";
import { cn } from "@/lib/utils";
import { useSchemaDiffTargets } from "@/hooks/api/admin/schemaDiff";
import { schemaChangeErrorMessage, useImportInterpret, useImportLoad } from "@/hooks/api/admin/schemaChange";
import DatabaseSelect, { isC2cTarget } from "../../schema-compare/_components/DatabaseSelect";
import SearchSelect from "../_components/SearchSelect";
import { describeOperation } from "../_components/StatusBadge";
import {
  IMPORT_DRAFT_KEY,
  ROLE_LABELS,
  type ImportAnswers,
  type ImportDraft,
  type ImportQuestion,
  type Interpretation,
  type LoadedWorkbook,
  type ParsedSheet,
  type Role,
  type RowState,
} from "../_components/import-types";

const card = "rounded-md bg-white p-4 shadow-md sm:p-5";

const STATE_STYLE: Record<RowState, { label: string; className: string; icon: React.ReactNode }> = {
  ready: { label: "Ready", className: "bg-green-50 text-green-700 ring-green-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  not_found: { label: "Not found", className: "bg-gray-100 text-gray-600 ring-gray-200", icon: <SearchX className="h-3.5 w-3.5" /> },
  mismatch: { label: "Doesn't match", className: "bg-red-50 text-red-700 ring-red-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  skipped: { label: "Skipped", className: "bg-gray-100 text-gray-500 ring-gray-200", icon: <MinusCircle className="h-3.5 w-3.5" /> },
  unresolved: { label: "Needs answer", className: "bg-amber-50 text-amber-800 ring-amber-200", icon: <CircleHelp className="h-3.5 w-3.5" /> },
  invalid: { label: "Incomplete", className: "bg-orange-50 text-orange-700 ring-orange-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  duplicate: { label: "Duplicate", className: "bg-gray-100 text-gray-500 ring-gray-200", icon: <MinusCircle className="h-3.5 w-3.5" /> },
};

// Where each question's answer is stored in ImportAnswers.
const applyAnswer = (answers: ImportAnswers, q: ImportQuestion, value: string): ImportAnswers => {
  switch (q.kind) {
    case "role":
      return { ...answers, roleColumns: { ...answers.roleColumns, [q.key]: Number(value) } };
    case "action":
      return { ...answers, actions: { ...answers.actions, [q.key]: value as "delete_row" | "update_value" | "skip" } };
    case "table":
      return { ...answers, tables: { ...answers.tables, [q.key]: value } };
    case "idColumn":
      return { ...answers, idColumns: { ...answers.idColumns, [q.key]: value } };
    case "verify":
      return { ...answers, verifyColumns: { ...answers.verifyColumns, [q.key]: value } };
    case "updateColumn":
      return { ...answers, updateColumns: { ...answers.updateColumns, [q.key]: value } };
  }
};

const ImportPage = () => {
  const router = useRouter();
  const targetsQuery = useSchemaDiffTargets();
  const targets = useMemo(() => (targetsQuery.data?.data?.targets ?? []).filter(isC2cTarget), [targetsQuery.data]);
  const load = useImportLoad();
  const interpret = useImportInterpret();

  const [targetKey, setTargetKey] = useState("");
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const [workbook, setWorkbook] = useState<LoadedWorkbook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [answers, setAnswers] = useState<ImportAnswers>({});
  const [pending, setPending] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Interpretation | null>(null);
  const [interpretError, setInterpretError] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (nextAnswers: ImportAnswers, s = sheet, key = targetKey) => {
    if (!s || !key || !workbook) return;
    setInterpretError(null);
    interpret.mutate(
      { targetKey: key, source: workbook.source, sheetName: s.name, headers: s.headers, rows: s.rows, answers: nextAnswers },
      {
        onSuccess: (r) => {
          setResult(r);
          setPending(Object.fromEntries(r.questions.filter((q) => q.suggested !== undefined).map((q) => [q.id, q.suggested!])));
        },
        onError: (e) => setInterpretError(schemaChangeErrorMessage(e)),
      },
    );
  };

  const updateAnswers = (next: ImportAnswers) => {
    setAnswers(next);
    run(next);
  };

  // Re-read when the database changes.
  useEffect(() => {
    if (sheet && targetKey) run(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const chooseSheet = (s: ParsedSheet, wb = workbook) => {
    setSheet(s);
    setAnswers({});
    setResult(null);
    if (targetKey && wb) {
      setInterpretError(null);
      interpret.mutate(
        { targetKey, source: wb.source, sheetName: s.name, headers: s.headers, rows: s.rows, answers: {} },
        {
          onSuccess: (r) => {
            setResult(r);
            setPending(Object.fromEntries(r.questions.filter((q) => q.suggested !== undefined).map((q) => [q.id, q.suggested!])));
          },
          onError: (e) => setInterpretError(schemaChangeErrorMessage(e)),
        },
      );
    }
  };

  const loadSource = (input: { file?: File; url?: string }) => {
    setLoadError(null);
    setWorkbook(null);
    setSheet(null);
    setResult(null);
    load.mutate(input, {
      onSuccess: (wb) => {
        setWorkbook(wb);
        const withRows = wb.sheets.filter((s) => s.rows.length);
        const requestSheets = withRows.filter((s) => s.looksLikeRequests);
        if (!withRows.length) setLoadError("None of the sheets have any rows under their header.");
        else if (withRows.length === 1) chooseSheet(withRows[0], wb);
        else if (requestSheets.length === 1) {
          toast(`“${requestSheets[0].name}” looks like the change-request sheet — confirm it below.`, { icon: "📋" });
        }
      },
      onError: (e) => setLoadError(schemaChangeErrorMessage(e)),
    });
  };

  const onFile = (file?: File | null) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Use an .xlsx, .xls or .csv file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("The file is larger than 20 MB.");
      return;
    }
    loadSource({ file });
  };

  const submitAnswers = () => {
    if (!result) return;
    let next = answers;
    for (const q of result.questions) {
      if (pending[q.id] !== undefined) next = applyAnswer(next, q, pending[q.id]);
    }
    updateAnswers(next);
  };

  const handOff = () => {
    if (!result?.plan || !workbook || !sheet) return;
    const draft: ImportDraft = { targetKey, operations: result.plan.operations, title: result.plan.title, reason: result.plan.reason, source: `${workbook.source} › ${sheet.name}` };
    try {
      window.sessionStorage.setItem(IMPORT_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      toast.error("Your browser blocked session storage — can't hand the change over.");
      return;
    }
    router.push("/admin/schema-changes/new");
  };

  const unanswered = result ? result.questions.filter((q) => pending[q.id] === undefined).length : 0;
  const busy = interpret.isPending;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Import changes from a sheet" description="Paste a Google Sheets link or upload a file. I'll read each row, ask about anything unclear, then build a change for review." />

      {/* 1. source */}
      <section className={card}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">1. Database and sheet</h3>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Apply to database</label>
            <DatabaseSelect value={targetKey} otherValue="" otherRole="source" targets={targets} disabled={targetsQuery.isLoading} onChange={setTargetKey} />
            <p className="mt-1 text-[11px] text-gray-500">Rows are looked up and checked in this database.</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Google Sheets (or any file) link</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && url.trim() && loadSource({ url: url.trim() })}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25"
                  />
                </div>
                <button
                  type="button"
                  disabled={!url.trim() || load.isPending}
                  onClick={() => loadSource({ url: url.trim() })}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue px-4 text-sm font-semibold text-white hover:bg-blue/90 disabled:bg-blue/40"
                >
                  {load.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Read
                </button>
              </div>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                onFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-5 text-center text-sm transition",
                dragging ? "border-blue bg-blue/10" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
              )}
            >
              <Upload className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">
                or <span className="font-semibold text-blue">drop / choose a file</span> (.xlsx, .xls, .csv — up to 20 MB)
              </span>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
          </div>
        </div>

        {load.isPending && (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading the sheet…
          </p>
        )}
        {loadError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}
      </section>

      {/* 2. sheet picker */}
      {workbook && workbook.sheets.filter((s) => s.rows.length).length > 1 && (
        <section className={card}>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">2. Which sheet?</h3>
          <p className="mb-3 text-xs text-gray-500">“{workbook.source}” has {workbook.sheets.length} sheets.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...workbook.sheets].sort((a, b) => Number(b.looksLikeRequests) - Number(a.looksLikeRequests)).map((s) => (
              <button
                key={s.name}
                type="button"
                disabled={!s.rows.length}
                onClick={() => chooseSheet(s)}
                className={cn(
                  "rounded-md border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  sheet?.name === s.name ? "border-blue bg-blue/10 ring-1 ring-blue" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" /> {s.name}
                </div>
                {s.looksLikeRequests && (
                  <span className="mt-1 inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-inset ring-green-200">
                    Looks like change requests
                  </span>
                )}
                <div className="mt-0.5 text-xs text-gray-500">
                  {s.rows.length ? `${s.rows.length.toLocaleString()} row(s)${s.truncated ? " (first 5,000)" : ""}` : "empty"}
                </div>
                {s.rows.length > 0 && <div className="mt-1 truncate text-[11px] text-gray-400">{s.headers.slice(0, 6).join(" · ")}</div>}
              </button>
            ))}
          </div>
        </section>
      )}

      {sheet && !targetKey && <p className="text-sm text-amber-700">Pick the database above to continue.</p>}

      {busy && !result && (
        <section className={cn(card, "flex items-center gap-2 text-sm text-gray-600")}>
          <Loader2 className="h-4 w-4 animate-spin" /> Reading “{sheet?.name}” and checking each row against the database…
        </section>
      )}
      {interpretError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {interpretError}
        </div>
      )}

      {/* 3. understanding */}
      {result && sheet && (
        <div className={cn("flex flex-col gap-4", busy && "pointer-events-none opacity-60")}>
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Sparkles className="h-4 w-4 text-violet-500" /> 3. What I understood from “{sheet.name}”
              </h3>
              <button type="button" onClick={() => setEditRoles((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-blue hover:text-blue/80">
                <Pencil className="h-3.5 w-3.5" /> {editRoles ? "Done" : "Change column meanings"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.roles
                .filter((r) => r.role !== "ignore")
                .map((r) => (
                  <span key={r.index} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    <strong>{r.header}</strong> → {ROLE_LABELS[r.role]}
                    {r.source === "memory" && <span className="text-[10px] text-violet-600">(remembered)</span>}
                  </span>
                ))}
            </div>

            {editRoles && (
              <div className="mt-3 grid gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.roles.map((r) => (
                  <div key={r.index}>
                    <label className="mb-0.5 block truncate text-[11px] font-semibold text-gray-600">{r.header}</label>
                    <SearchSelect
                      value={r.role}
                      onChange={(role) => {
                        const roleColumns: Partial<Record<Role, number>> = { ...answers.roleColumns };
                        for (const k of Object.keys(roleColumns) as Role[]) if (roleColumns[k] === r.index) delete roleColumns[k];
                        if (role !== "ignore") roleColumns[role as Role] = r.index;
                        updateAnswers({ ...answers, roleColumns });
                      }}
                      options={(Object.keys(ROLE_LABELS) as Role[]).map((k) => ({ value: k, label: ROLE_LABELS[k] }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {result.notes.length > 0 && (
              <ul className="mt-3 space-y-0.5 text-xs text-gray-600">
                {result.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}

            {result.statuses.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Process rows with status</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.statuses.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateAnswers({ ...answers, statuses: { ...answers.statuses, [s.value]: !s.include } })}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                        s.include ? "bg-blue/10 text-blue ring-blue/30" : "bg-white text-gray-400 ring-gray-200 line-through",
                      )}
                    >
                      {s.value || "(blank)"} · {s.count}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {result.questions.length > 0 && (
            <section className={cn(card, "border-l-4 border-amber-400")}>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <CircleHelp className="h-4 w-4 text-amber-500" /> {result.questions.length === 1 ? "One question" : `${result.questions.length} questions`} before I continue
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">Your answers are remembered, so the next sheet in this format won&apos;t need them.</p>
              <div className="mt-3 space-y-4">
                {result.questions.map((q) => (
                  <div key={q.id}>
                    <div className="text-sm font-medium text-gray-900">{q.prompt}</div>
                    {q.detail && <div className="mb-1.5 text-xs text-gray-500">{q.detail}</div>}
                    <div className="max-w-md">
                      <SearchSelect value={pending[q.id] ?? ""} onChange={(v) => setPending({ ...pending, [q.id]: v })} options={q.options} placeholder="Choose…" />
                    </div>
                    {q.suggested !== undefined && pending[q.id] === q.suggested && <div className="mt-1 text-[11px] text-violet-700">Best guess pre-selected — change it if it&apos;s wrong.</div>}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={submitAnswers}
                disabled={unanswered > 0 || busy}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue/90 disabled:bg-blue/40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {unanswered ? `Answer ${unanswered} more` : "Continue"}
              </button>
            </section>
          )}

          {result.rows.length > 0 && result.questions.every((q) => q.kind !== "role") && (
            <section className={card}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">Rows ({result.summary.total})</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATE_STYLE) as RowState[])
                    .filter((s) => result.summary[s])
                    .map((s) => (
                      <span key={s} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", STATE_STYLE[s].className)}>
                        {STATE_STYLE[s].icon} {result.summary[s]} {STATE_STYLE[s].label.toLowerCase()}
                      </span>
                    ))}
                </div>
              </div>
              <div className="max-h-[420px] overflow-auto rounded border border-gray-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2 font-semibold text-gray-700">Row</th>
                      <th className="px-3 py-2 font-semibold text-gray-700">Request</th>
                      <th className="px-3 py-2 font-semibold text-gray-700">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.rowNumber} className={cn("border-t border-gray-100", r.include ? "bg-white" : "bg-gray-50/60")}>
                        <td className="px-3 py-1.5">
                          {r.state === "ready" && (
                            <input
                              type="checkbox"
                              className="accent-[#008ED3]"
                              checked={r.include}
                              title={r.include ? "Leave this row out" : "Include this row"}
                              onChange={() => {
                                const excluded = new Set(answers.excludeRows ?? []);
                                if (r.include) excluded.add(r.rowNumber);
                                else excluded.delete(r.rowNumber);
                                updateAnswers({ ...answers, excludeRows: [...excluded] });
                              }}
                            />
                          )}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-gray-500">{r.rowNumber}</td>
                        <td className="max-w-[280px] truncate px-3 py-1.5 text-gray-800" title={r.summary}>
                          {r.summary}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={cn("mr-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", STATE_STYLE[r.state].className)}>
                            {STATE_STYLE[r.state].icon} {STATE_STYLE[r.state].label}
                          </span>
                          <span className="text-gray-600">{r.message}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {result.understood && (
            <section className={cn(card, result.plan ? "border-l-4 border-green-500" : "border-l-4 border-gray-300")}>
              {result.plan ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-900">4. The change I&apos;ll prepare</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {result.plan.operations.map((op, i) => (
                      <li key={i}>• {describeOperation(op)}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-gray-500">
                    Next you&apos;ll see the full review — exact row counts, rows in other tables that would be affected, the screens affected, backups — before anything is applied.
                  </p>
                  <button type="button" onClick={handOff} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                    Review this change <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Nothing to change: no row is ready{result.summary.not_found ? ` — ${result.summary.not_found} ID(s) aren't in this database (are you on the right one?)` : ""}.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportPage;
