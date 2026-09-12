"use client";

import React from "react";

interface CECTrackerHeaderProps {
  title: string;
  subtitle: string;
  onGuideOpen?: () => void;
}

export default function CECTrackerHeader({ title, subtitle, onGuideOpen }: CECTrackerHeaderProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0066B2 0%, #00BFF2 100%)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        width: "100%",
        color: "#fff",
        padding: "14px 20px",
        borderRadius: "12px",
        boxShadow: "0 1px 10px rgba(0,142,211,0.10)",
      }}
    >
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", margin: "2px 0 0" }}>{subtitle}</p>
      </div>
      {onGuideOpen && (
        <button
          onClick={onGuideOpen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: "12.5px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Way of working
        </button>
      )}
    </div>
  );
}
