'use client';
import { useMemo } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";

export type ClientOption = {
  value: string;
  label: string;
  /** Second line under the name, e.g. "20231125341 · DPC Client". */
  detail?: string;
};

/** Shape of one entry from GET /assistant/clients-assigned → clientDetails. */
export type AssignedClient = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  uniqueId?: string;
  displayName?: string;
  assignmentTypeDisplay?: string;
};

export const toClientOptions = (clients: AssignedClient[] = []): ClientOption[] =>
  clients.map((c) => ({
    value: c.id,
    label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.displayName || c.email || c.id,
    detail: [c.uniqueId || c.email, c.assignmentTypeDisplay].filter(Boolean).join(" · "),
  }));

// Blue/grey palette of the chat widget.
const styles = {
  control: (provided: object, state: { isFocused: boolean }) => ({
    ...provided,
    minHeight: 36,
    fontSize: 12,
    borderRadius: 6,
    borderColor: state.isFocused ? "#0B96D6" : "#E5E7EB",
    boxShadow: state.isFocused ? "0 0 0 1px #0B96D6" : "none",
    "&:hover": { borderColor: "#0B96D6" },
  }),
  placeholder: (provided: object) => ({ ...provided, color: "#94A3B8" }),
  singleValue: (provided: object) => ({ ...provided, color: "#10365A", fontWeight: 600 }),
  option: (provided: object, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...provided,
    padding: "7px 10px",
    cursor: "pointer",
    backgroundColor: state.isSelected ? "#E0F2FE" : state.isFocused ? "#F0F9FF" : "white",
    color: "#0F172A",
  }),
  menu: (provided: object) => ({
    ...provided,
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(9,13,24,0.18)",
    overflow: "hidden",
  }),
  menuList: (provided: object) => ({ ...provided, maxHeight: 240 }),
  // Rendered in <body> — above the chat window, which clips its own content.
  menuPortal: (provided: object) => ({ ...provided, zIndex: 10000 }),
  noOptionsMessage: (provided: object) => ({ ...provided, fontSize: 11.5, color: "#64748B" }),
  loadingMessage: (provided: object) => ({ ...provided, fontSize: 11.5, color: "#64748B" }),
};

interface ClientSelectProps {
  value: ClientOption | null;
  onChange: (value: ClientOption | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  /** Fixed list, filtered in the browser (PCs: their assigned clients). */
  options?: ClientOption[];
  isLoading?: boolean;
  /** Server-side search instead of a fixed list (admins: every client). */
  loadOptions?: (input: string) => Promise<ClientOption[]>;
}

const formatOptionLabel = (option: ClientOption, { context }: { context: "menu" | "value" }) =>
  context === "value" ? (
    option.label
  ) : (
    <span className="block leading-tight">
      <span className="block text-[12px] font-semibold text-[#10365A]">{option.label}</span>
      {option.detail && <span className="block text-[10.5px] text-[#64748B]">{option.detail}</span>}
    </span>
  );

export default function ClientSelect({
  value,
  onChange,
  placeholder = "Search clients…",
  emptyMessage = "No clients assigned to you.",
  options = [],
  isLoading,
  loadOptions,
}: ClientSelectProps) {
  // Stable across renders so the debounce timer isn't reset on every render.
  const debouncedLoad = useMemo(
    () => (loadOptions ? debouncedLoader(loadOptions) : undefined),
    [loadOptions],
  );

  const shared = {
    styles,
    value,
    onChange,
    placeholder,
    formatOptionLabel,
    // Rendered in <body> so the chat window doesn't clip the menu.
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    menuPosition: "fixed" as const,
    menuPlacement: "auto" as const,
    loadingMessage: () => "Loading clients…",
  };

  if (debouncedLoad) {
    return (
      <AsyncSelect<ClientOption, false>
        {...shared}
        cacheOptions
        defaultOptions
        loadOptions={debouncedLoad}
        noOptionsMessage={({ inputValue }) =>
          inputValue ? `No client matches "${inputValue}".` : "No clients found."
        }
      />
    );
  }

  return (
    <Select<ClientOption, false>
      {...shared}
      options={options}
      isLoading={isLoading}
      noOptionsMessage={({ inputValue }) => (inputValue ? `No client matches "${inputValue}".` : emptyMessage)}
      filterOption={(option, input) => {
        const query = input.trim().toLowerCase();
        if (!query) return true;
        return (
          option.data.label.toLowerCase().includes(query) ||
          (option.data.detail ?? "").toLowerCase().includes(query)
        );
      }}
    />
  );
}

/** Waits for a short pause in typing so each keystroke doesn't hit the server. */
function debouncedLoader(load: (input: string) => Promise<ClientOption[]>, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (input: string) =>
    new Promise<ClientOption[]>((resolve) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        load(input).then(resolve).catch(() => resolve([]));
      }, delay);
    });
}
