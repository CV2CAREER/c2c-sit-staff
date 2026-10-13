"use client";

import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { Check, ChevronsUpDown, Database, SearchX, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaTarget } from "./types";

// --- C2C filter --------------------------------------------------------------

// The shared cluster also hosts other products (acm_*, fls_*, kfx_*, khs_*…).
// "C2C" = anything with c2c in its name, plus the shared `sandbox` DB (used
// by the c2c sandbox scripts), the DB this server runs on, and anything
// configured explicitly via SCHEMA_DIFF_EXTRA_TARGETS.
export const isC2cTarget = (t: SchemaTarget) =>
  t.source === "configured" || t.isCurrent || /c2c/i.test(t.database) || t.database.toLowerCase() === "sandbox";

// --- environment badge -------------------------------------------------------

interface EnvInfo {
  label: string;
  rank: number;
  className: string;
}

const ENV_RULES: { test: RegExp; env: EnvInfo }[] = [
  { test: /archive/, env: { label: "Archive", rank: 8, className: "bg-gray-100 text-gray-600 ring-gray-200" } },
  { test: /shadow/, env: { label: "Shadow", rank: 7, className: "bg-gray-100 text-gray-600 ring-gray-200" } },
  { test: /(^|[_-])test|test([_-]|$)/, env: { label: "Test", rank: 6, className: "bg-gray-100 text-gray-600 ring-gray-200" } },
  { test: /(^|[_-])prod([_-]|$)/, env: { label: "PROD", rank: 0, className: "bg-red-50 text-red-700 ring-red-200" } },
  { test: /(^|[_-])uat([_-]|$)/, env: { label: "UAT", rank: 1, className: "bg-amber-50 text-amber-800 ring-amber-200" } },
  { test: /(^|[_-])sit([_-]|$)/, env: { label: "SIT", rank: 2, className: "bg-violet-50 text-violet-700 ring-violet-200" } },
  { test: /(^|[_-])iat([_-]|$)/, env: { label: "IAT", rank: 3, className: "bg-sky-50 text-sky-700 ring-sky-200" } },
  { test: /(^|[_-])rat([_-]|$)/, env: { label: "RAT", rank: 4, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" } },
  // sand?box also matches the khs_sanbox typo
  { test: /sand?box/, env: { label: "Sandbox", rank: 5, className: "bg-slate-100 text-slate-700 ring-slate-200" } },
];

export const envOf = (database: string): EnvInfo | null =>
  ENV_RULES.find((r) => r.test.test(database.toLowerCase()))?.env ?? null;

export const EnvBadge = ({ database }: { database: string }) => {
  const env = envOf(database);
  if (!env) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        env.className,
      )}
    >
      {env.label}
    </span>
  );
};

// --- grouping ----------------------------------------------------------------

const OTHER = "Other databases";

const groupTargets = (list: SchemaTarget[]) => {
  const prefixOf = (t: SchemaTarget) =>
    t.source === "configured" ? "configured" : isC2cTarget(t) ? "c2c" : t.database.split(/[_-]/)[0].toLowerCase();
  const counts = new Map<string, number>();
  for (const t of list) counts.set(prefixOf(t), (counts.get(prefixOf(t)) || 0) + 1);

  const groups = new Map<string, SchemaTarget[]>();
  for (const t of list) {
    const prefix = prefixOf(t);
    const label =
      prefix === "configured"
        ? "Other clusters (configured)"
        : prefix === "c2c"
          ? "C2C"
          : (counts.get(prefix) || 0) > 1
            ? prefix.toUpperCase()
            : OTHER;
    groups.set(label, [...(groups.get(label) || []), t]);
  }

  const rank = (label: string) => (label === "C2C" ? 0 : label === OTHER ? 3 : label.startsWith("Other clusters") ? 1 : 2);
  const envRank = (t: SchemaTarget) => envOf(t.database)?.rank ?? 9;
  return [...groups.entries()]
    .map(([label, items]) => ({
      label,
      items: [...items].sort(
        (a, b) => Number(b.isCurrent) - Number(a.isCurrent) || envRank(a) - envRank(b) || a.database.localeCompare(b.database),
      ),
    }))
    .sort((a, b) => rank(a.label) - rank(b.label) || a.label.localeCompare(b.label));
};

// --- component ---------------------------------------------------------------

interface DatabaseSelectProps {
  value: string;
  otherValue: string;
  otherRole: "source" | "target";
  targets: SchemaTarget[];
  disabled: boolean;
  onChange: (key: string) => void;
}

const DatabaseSelect = ({ value, otherValue, otherRole, targets, disabled, onChange }: DatabaseSelectProps) => {
  const [query, setQuery] = useState("");
  const selected = targets.find((t) => t.key === value) ?? null;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q
      ? targets.filter(
          (t) =>
            t.database.toLowerCase().includes(q) ||
            t.label.toLowerCase().includes(q) ||
            (envOf(t.database)?.label.toLowerCase() ?? "").includes(q),
        )
      : targets;
    return groupTargets(matching);
  }, [targets, query]);

  const disabledReason = (t: SchemaTarget) =>
    !t.available ? t.unavailableReason || "Unavailable" : t.key === otherValue ? `Already the ${otherRole}` : null;

  return (
    <Combobox
      value={selected}
      by="key"
      immediate
      disabled={disabled}
      onChange={(t: SchemaTarget | null) => {
        if (t) onChange(t.key);
      }}
      onClose={() => setQuery("")}
    >
      <div className="group relative">
        <Database className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <ComboboxInput
          aria-label="Database"
          displayValue={(t: SchemaTarget | null) => t?.database ?? ""}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selected ? "Search databases…" : "Select a database…"}
          className={cn(
            "w-full rounded-md border border-gray-300 bg-white py-2 pl-9 text-sm font-medium text-gray-900 shadow-sm",
            "placeholder:font-normal placeholder:text-gray-400",
            "focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25",
            "data-[disabled]:cursor-not-allowed data-[disabled]:bg-gray-50",
            selected ? "pr-24" : "pr-9",
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-8 flex items-center gap-1">
          {selected?.isCurrent && (
            <span title="The database this staff server runs on" className="text-gray-400">
              <Server className="h-3.5 w-3.5" />
            </span>
          )}
          {selected && <EnvBadge database={selected.database} />}
        </div>
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600">
          <ChevronsUpDown className="h-4 w-4" />
        </ComboboxButton>
      </div>

      <ComboboxOptions
        anchor="bottom start"
        transition
        className={cn(
          "z-[1300] w-[var(--input-width)] min-w-[280px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl [--anchor-gap:6px] [--anchor-max-height:22rem]",
          "origin-top transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0",
        )}
      >
        {groups.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
            <SearchX className="h-4 w-4" /> No databases match “{query}”.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="py-0.5">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 backdrop-blur">
                <span>{g.label}</span>
                <span>{g.items.length}</span>
              </div>
              {g.items.map((t) => {
                const reason = disabledReason(t);
                return (
                  <ComboboxOption
                    key={t.key}
                    value={t}
                    disabled={!!reason}
                    className={cn(
                      "group/opt flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2",
                      "data-[focus]:bg-blue/10 data-[selected]:bg-blue/5",
                      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                    )}
                  >
                    <Database className="h-4 w-4 shrink-0 text-gray-400 group-data-[selected]/opt:text-blue" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-gray-900">{t.database}</span>
                        <EnvBadge database={t.database} />
                      </div>
                      <div className="truncate text-[11px] text-gray-500">
                        {reason
                          ? reason
                          : t.isCurrent
                            ? "This staff server's database"
                            : t.source === "configured"
                              ? `${t.label} · ${t.hostHint}`
                              : t.hostHint}
                      </div>
                    </div>
                    <Check className="invisible h-4 w-4 shrink-0 text-blue group-data-[selected]/opt:visible" />
                  </ComboboxOption>
                );
              })}
            </div>
          ))
        )}
      </ComboboxOptions>
    </Combobox>
  );
};

export default DatabaseSelect;
