"use client";

import React from "react";

type PillVariant = "good" | "bad" | "warn" | "neutral" | "empty";

const pillStyles: Record<PillVariant, { bg: string; fg: string }> = {
  good: { bg: "#F0FFF1", fg: "#12873B" },
  bad: { bg: "#FDEEEE", fg: "#C23434" },
  warn: { bg: "#FFFAF5", fg: "#B26A22" },
  neutral: { bg: "#F1F5F9", fg: "#4A5B6B" },
  empty: { bg: "#F7F9FB", fg: "#A9B6C2" },
};

const GOOD = [
  "no issue", "verified", "uploaded", "completed", "resolved", "satisfied",
  "advocate", "active-inflight", "yes", "yes-5mins", "yes — within 5 mins",
  "not required", "done", "no",
];
const BAD = [
  "has issue", "not verified", "not yet uploaded", "critical", "open",
  "expired", "n", "missing", "high",
];
const WARN = [
  "in progress", "waiting on client", "pending migration", "tbd", "paused",
  "active-paused", "campaign on hold", "medium", "yes-late", "not started", "low",
];

interface CECPillProps {
  label: string;
  variant?: PillVariant;
}

export default function CECPill({ label, variant }: CECPillProps) {
  const v = variant || getPillVariant(label);
  const style = pillStyles[v] || pillStyles.empty;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: 500,
        whiteSpace: "nowrap",
        background: style.bg,
        color: style.fg,
      }}
    >
      {label || "---"}
    </span>
  );
}

export function getPillVariant(value: string | undefined | null): PillVariant {
  if (!value || value === "") return "empty";
  const lower = value.toLowerCase().trim();
  if (GOOD.some((w) => lower === w || lower.includes(w))) return "good";
  if (BAD.some((w) => lower === w || lower.includes(w))) return "bad";
  if (WARN.some((w) => lower === w || lower.includes(w))) return "warn";
  return "neutral";
}

export function getPillStyle(value: string | undefined | null): React.CSSProperties {
  const v = getPillVariant(value);
  const style = pillStyles[v] || pillStyles.empty;
  return {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: "999px",
    fontSize: "11.5px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    background: style.bg,
    color: style.fg,
  };
}
