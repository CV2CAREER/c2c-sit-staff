"use client";

import React, { useRef } from "react";

function parseDate(val: string): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    if (!isNaN(d.getTime())) return d;
    d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function toISODate(val: string): string {
  const d = parseDate(val);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDisplay(val: string): string {
  const d = parseDate(val);
  if (!d) return val || "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface CECDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function CECDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  style,
}: CECDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.showPicker?.();
      inputRef.current.focus();
    }
  };

  const isoValue = toISODate(value);
  const displayValue = fmtDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      const d = new Date(iso + "T00:00:00");
      onChange(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
    } else {
      onChange("");
    }
  };

  return (
    <div
      onClick={openPicker}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        cursor: disabled ? "default" : "pointer",
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="date"
        value={isoValue}
        onChange={handleChange}
        disabled={disabled}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          width: "100%",
          cursor: disabled ? "default" : "pointer",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "8px",
          border: "1px solid #E1E8EF",
          background: disabled ? "#F5F7FA" : "#fff",
          fontSize: "12.5px",
          color: value ? "#12202D" : "#9AA5B4",
          minWidth: "130px",
          userSelect: "none",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A9AAB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {displayValue || placeholder}
      </div>
    </div>
  );
}
