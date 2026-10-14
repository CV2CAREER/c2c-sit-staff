"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Eye,
  GitCompareArrows,
  Loader2,
  Plug,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { schemaDiffErrorMessage, useSchemaDiffPing } from "@/hooks/api/admin/schemaDiff";
import type { PingResult, SchemaTarget } from "./types";
import { formatMs } from "./ui";
import DatabaseSelect, { isC2cTarget } from "./DatabaseSelect";

type PingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; result: PingResult }
  | { status: "error"; message: string };

interface SideSelectProps {
  role: "source" | "target";
  value: string;
  otherValue: string;
  targets: SchemaTarget[];
  disabled: boolean;
  onChange: (key: string) => void;
}

const SideSelect = ({ role, value, otherValue, targets, disabled, onChange }: SideSelectProps) => {
  const ping = useSchemaDiffPing();
  const [pingState, setPingState] = useState<PingState>({ status: "idle" });
  const selected = targets.find((t) => t.key === value);


  const testConnection = () => {
    if (!value) return;
    setPingState({ status: "loading" });
    ping.mutate(value, {
      onSuccess: (result) => setPingState({ status: "ok", result }),
      onError: (err) => setPingState({ status: "error", message: schemaDiffErrorMessage(err) }),
    });
  };

  return (
    <div className="flex-1 min-w-0">
      <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {role === "source" ? "Source — the reference" : "Target — the database to check"}
      </label>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1 min-w-0">
          <DatabaseSelect
            value={value}
            otherValue={otherValue}
            otherRole={role === "source" ? "target" : "source"}
            targets={targets}
            disabled={disabled}
            onChange={(key) => {
              setPingState({ status: "idle" });
              onChange(key);
            }}
          />
        </div>
        <button
          type="button"
          onClick={testConnection}
          disabled={!value || disabled || pingState.status === "loading"}
          title="Test the connection (read-only)"
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pingState.status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Test</span>
        </button>
      </div>

      <div className="mt-1.5 min-h-[20px] text-xs">
        {pingState.status === "ok" && (
          <span className="inline-flex items-center gap-1 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected in {formatMs(pingState.result.latencyMs)} · PostgreSQL{" "}
            {pingState.result.serverVersion.split(" ")[0]} · {pingState.result.publicTables} public tables
          </span>
        )}
        {pingState.status === "error" && (
          <span className="inline-flex items-start gap-1 text-red-700">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {pingState.message}
          </span>
        )}
        {pingState.status === "idle" && selected && (
          <span className="text-gray-500">
            {selected.database} on {selected.hostHint}
            {selected.isCurrent ? " · the database this staff server runs on" : ""}
          </span>
        )}
      </div>
    </div>
  );
};

interface TargetPickerProps {
  targets: SchemaTarget[];
  warnings: string[];
  loadingTargets: boolean;
  targetsError: string | null;
  onReloadTargets: () => void;
  sourceKey: string;
  targetKey: string;
  setSourceKey: (k: string) => void;
  setTargetKey: (k: string) => void;
  schemas: string[];
  setSchemas: (s: string[]) => void;
  availableSchemas: string[];
  busy: boolean;
  onCompare: (refresh: boolean) => void;
  showAllDatabases: boolean;
  setShowAllDatabases: (v: boolean) => void;
}

const TargetPicker = ({
  targets,
  warnings,
  loadingTargets,
  targetsError,
  onReloadTargets,
  sourceKey,
  targetKey,
  setSourceKey,
  setTargetKey,
  schemas,
  setSchemas,
  availableSchemas,
  busy,
  onCompare,
  showAllDatabases,
  setShowAllDatabases,
}: TargetPickerProps) => {
  const [schemaInput, setSchemaInput] = useState("");
  const [forceFresh, setForceFresh] = useState(false);
  const allSchemas = schemas.length === 0;

  // Non-C2C databases are hidden unless asked for — but never hide one that is
  // already selected (e.g. restored from a previous visit).
  const visibleTargets = useMemo(
    () =>
      showAllDatabases
        ? targets
        : targets.filter((t) => isC2cTarget(t) || t.key === sourceKey || t.key === targetKey),
    [targets, showAllDatabases, sourceKey, targetKey],
  );
  const hiddenCount = targets.filter((t) => !isC2cTarget(t)).length;
  const unavailable = useMemo(() => visibleTargets.filter((t) => !t.available), [visibleTargets]);

  const validation = useMemo(() => {
    if (!sourceKey || !targetKey) return "Pick a database on both sides.";
    if (sourceKey === targetKey) return "Source and target must be different databases.";
    return null;
  }, [sourceKey, targetKey]);

  const addSchema = (raw: string) => {
    const names = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return;
    setSchemas([...new Set([...schemas, ...names])].sort());
    setSchemaInput("");
  };

  const suggestions = availableSchemas.filter((s) => !schemas.includes(s));

  return (
    <section className="rounded-md bg-white p-4 shadow-md sm:p-5">
      {targetsError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <span className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Could not load the list of databases: {targetsError}
          </span>
          <button onClick={onReloadTargets} className="shrink-0 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {(warnings.length > 0 || unavailable.length > 0) && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Configuration notes
          </div>
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
            {unavailable.map((t) => (
              <li key={t.key}>
                <strong>{t.label}</strong> is unavailable: {t.unavailableReason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Databases to compare</h3>
        {hiddenCount > 0 && (
          <label
            className={cn(
              "inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
              showAllDatabases
                ? "border-blue/40 bg-blue/10 text-blue"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            )}
            title="The cluster also hosts other products' databases (ACM, FLS, KFX, KHS…)"
          >
            <input
              type="checkbox"
              checked={showAllDatabases}
              disabled={busy}
              onChange={(e) => setShowAllDatabases(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 accent-[#008ED3]"
            />
            <Eye className="h-3.5 w-3.5" />
            Show other products&apos; databases
            <span className={cn("rounded-full px-1.5", showAllDatabases ? "bg-blue/15" : "bg-gray-100 text-gray-500")}>
              {hiddenCount}
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <SideSelect
          role="source"
          value={sourceKey}
          otherValue={targetKey}
          targets={visibleTargets}
          disabled={busy || loadingTargets}
          onChange={setSourceKey}
        />
        <button
          type="button"
          onClick={() => {
            setSourceKey(targetKey);
            setTargetKey(sourceKey);
          }}
          disabled={busy || (!sourceKey && !targetKey)}
          title="Swap source and target"
          className="mx-auto mt-0 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 lg:mt-6"
        >
          <ArrowLeftRight className="h-4 w-4 rotate-90 lg:rotate-0" />
        </button>
        <SideSelect
          role="target"
          value={targetKey}
          otherValue={sourceKey}
          targets={visibleTargets}
          disabled={busy || loadingTargets}
          onChange={setTargetKey}
        />
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Schemas</span>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={allSchemas}
              disabled={busy}
              onChange={(e) => setSchemas(e.target.checked ? [] : ["public"])}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            Compare all schemas
          </label>
        </div>

        {allSchemas ? (
          <p className="text-xs text-gray-500">Every non-system schema in both databases will be compared.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {schemas.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-blue/10 px-2.5 py-1 text-xs font-medium text-blue"
              >
                {s}
                <button
                  type="button"
                  disabled={busy || schemas.length === 1}
                  onClick={() => setSchemas(schemas.filter((x) => x !== s))}
                  title={schemas.length === 1 ? "At least one schema is needed (or tick ‘all schemas’)" : `Remove ${s}`}
                  className="rounded-full hover:text-blue/80 disabled:opacity-40"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={schemaInput}
              disabled={busy}
              onChange={(e) => setSchemaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addSchema(schemaInput);
                }
              }}
              onBlur={() => addSchema(schemaInput)}
              placeholder="add schema…"
              className="w-28 rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs focus:border-blue focus:outline-none"
            />
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy}
                onClick={() => addSchema(s)}
                className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
          <label className="inline-flex cursor-pointer items-center gap-1.5" title="Ignore schema snapshots cached in the last 2 minutes">
            <input
              type="checkbox"
              checked={forceFresh}
              disabled={busy}
              onChange={(e) => setForceFresh(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300"
            />
            Force a fresh read (skip 2-minute cache)
          </label>
          <button
            type="button"
            onClick={onReloadTargets}
            disabled={busy || loadingTargets}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loadingTargets && "animate-spin")} />
            Reload database list
          </button>
          <span className="text-gray-400">Read-only — nothing is ever changed on either database.</span>
        </div>

        <div className="flex items-center gap-3">
          {validation && !loadingTargets && <span className="text-xs text-gray-500">{validation}</span>}
          <button
            type="button"
            onClick={() => onCompare(forceFresh)}
            disabled={busy || !!validation}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue/90 disabled:cursor-not-allowed disabled:bg-blue/40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
            {busy ? "Comparing…" : "Compare schemas"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default TargetPicker;
