"use client";

import { useMemo, useState } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { Check, ChevronsUpDown, Plus, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

interface SearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  // Lets the admin type a value that isn't in the list (e.g. varchar(100)).
  allowCustom?: { label: (typed: string) => string; validate?: (typed: string) => boolean };
  emptyText?: string;
  className?: string;
}

// Searchable, grouped picker used everywhere in the Database Modifications builder.
const SearchSelect = ({ value, onChange, options, placeholder = "Choose…", disabled, allowCustom, emptyText = "Nothing matches", className }: SearchSelectProps) => {
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value) ?? (value ? { value, label: value } : null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q) || o.group?.toLowerCase().includes(q))
      : options;
    const map = new Map<string, SelectOption[]>();
    for (const o of filtered) map.set(o.group ?? "", [...(map.get(o.group ?? "") || []), o]);
    return [...map.entries()];
  }, [options, query]);

  const typed = query.trim();
  const showCustom = !!allowCustom && !!typed && !options.some((o) => o.value === typed) && (allowCustom.validate?.(typed) ?? true);
  const total = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <Combobox
      value={selected}
      by="value"
      immediate
      disabled={disabled}
      onChange={(o: SelectOption | null) => {
        if (o && !o.disabled) onChange(o.value);
      }}
      onClose={() => setQuery("")}
    >
      <div className={cn("relative", className)}>
        <ComboboxInput
          displayValue={(o: SelectOption | null) => o?.label ?? ""}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm text-gray-900 shadow-sm",
            "placeholder:text-gray-400 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25",
            "data-[disabled]:cursor-not-allowed data-[disabled]:bg-gray-50 data-[disabled]:text-gray-400",
          )}
        />
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600">
          <ChevronsUpDown className="h-4 w-4" />
        </ComboboxButton>
      </div>

      <ComboboxOptions
        anchor="bottom start"
        transition
        className={cn(
          "z-[1300] w-[var(--input-width)] min-w-[260px] rounded-lg border border-gray-200 bg-white p-1 shadow-xl [--anchor-gap:6px] [--anchor-max-height:20rem]",
          "origin-top transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0",
        )}
      >
        {showCustom && (
          <ComboboxOption value={{ value: typed, label: typed }} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm data-[focus]:bg-blue/10">
            <Plus className="h-4 w-4 text-blue" />
            {allowCustom!.label(typed)}
          </ComboboxOption>
        )}
        {total === 0 && !showCustom && (
          <div className="flex items-center gap-2 px-3 py-5 text-sm text-gray-500">
            <SearchX className="h-4 w-4" /> {emptyText}
          </div>
        )}
        {groups.map(([group, list]) => (
          <div key={group || "_"} className="py-0.5">
            {group && (
              <div className="sticky top-0 z-10 flex justify-between bg-white/95 px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 backdrop-blur">
                <span>{group}</span>
                <span>{list.length}</span>
              </div>
            )}
            {list.map((o) => (
              <ComboboxOption
                key={o.value}
                value={o}
                disabled={o.disabled}
                className="group/opt flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 data-[disabled]:cursor-not-allowed data-[focus]:bg-blue/10 data-[selected]:bg-blue/5 data-[disabled]:opacity-50"
              >
                {o.icon && <span className="shrink-0 text-gray-400">{o.icon}</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-gray-900">{o.label}</span>
                    {o.badge}
                  </div>
                  {(o.disabledReason || o.description) && (
                    <div className="truncate text-[11px] text-gray-500">{o.disabled ? o.disabledReason : o.description}</div>
                  )}
                </div>
                <Check className="invisible h-4 w-4 shrink-0 text-blue group-data-[selected]/opt:visible" />
              </ComboboxOption>
            ))}
          </div>
        ))}
      </ComboboxOptions>
    </Combobox>
  );
};

export default SearchSelect;
