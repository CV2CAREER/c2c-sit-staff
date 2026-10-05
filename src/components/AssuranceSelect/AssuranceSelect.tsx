"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AssuranceStatus = "ASSURED" | "FAILED";

/** The two results a staff member can record, plus a way back to blank. */
const OPTIONS: { value: AssuranceStatus | "CLEAR"; label: string; className: string }[] = [
  { value: "ASSURED", label: "Assured", className: "text-emerald-700" },
  { value: "FAILED", label: "Failed assurance", className: "text-red-600" },
  { value: "CLEAR", label: "Clear", className: "text-gray-500" },
];

type AssuranceSelectProps = {
  /** Stored value: 'ASSURED' | 'FAILED', or empty when no decision has been recorded. */
  value?: string | null;
  /** Called with the chosen result, or null when the row is cleared. */
  onChange: (next: AssuranceStatus | null) => void;
  disabled?: boolean;
  /** Tooltip, e.g. to explain why the control is read-only. */
  title?: string;
};

/**
 * Inline assurance control for table rows (SPR-21-58-001). Always visible, so it does
 * not depend on a grid's edit mode. The server records who chose and when.
 */
export default function AssuranceSelect({ value, onChange, disabled, title }: AssuranceSelectProps) {
  const current = value === "ASSURED" || value === "FAILED" ? value : undefined;
  const tone =
    current === "ASSURED"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : current === "FAILED"
        ? "border-red-300 bg-red-50 text-red-600"
        : "border-gray-200 bg-white text-gray-500";

  return (
    <div
      title={title}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="w-full"
    >
      <Select
        value={current}
        disabled={disabled}
        onValueChange={(next) => onChange(next === "CLEAR" ? null : (next as AssuranceStatus))}
      >
        <SelectTrigger className={`h-8 w-full min-w-[150px] text-xs font-medium ${tone}`}>
          <SelectValue placeholder="Set assurance" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.filter((o) => o.value !== "CLEAR" || current).map((o) => (
            <SelectItem key={o.value} value={o.value} className={`text-xs ${o.className}`}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
