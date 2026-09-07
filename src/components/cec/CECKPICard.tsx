"use client";

import React from "react";

interface CECKPICardProps {
  label: string;
  value: string | number;
  hint?: string;
  bad?: boolean;
}

export default function CECKPICard({ label, value, hint, bad }: CECKPICardProps) {
  const isBad = bad && value && (typeof value === "number" ? value > 0 : true);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E9EEF3",
        borderRadius: "12px",
        padding: "14px 16px",
        minWidth: "160px",
      }}
    >
      <div style={{ fontSize: "11px", color: "#8A9AAB", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginTop: "6px",
          color: isBad ? "#C23434" : "#12202D",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: "11.5px", color: "#8A9AAB", marginTop: "2px" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
