"use client";

import React, { useState, useEffect } from "react";
import CECDatePicker from "@/components/cec/CECDatePicker";

export interface DrawerField {
  key: string;
  label: string;
  type: "static" | "input" | "select" | "area" | "date";
  options?: string[];
}

export interface DrawerSection {
  title: string;
  fields: DrawerField[];
}

interface CECDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  pills?: { text: string; style: React.CSSProperties }[];
  sections: DrawerSection[];
  data: Record<string, any>;
  onChange?: (key: string, value: string) => void;
  onSave?: () => void | Promise<void>;
  onDelete?: () => void;
  linkedRecords?: React.ReactNode;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: "36px",
  border: "1px solid #E1E8EF",
  borderRadius: "9px",
  padding: "0 10px",
  fontSize: "13px",
  color: "#12202D",
  background: "#fff",
  outline: "none",
};

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  height: "36px",
  border: "1px solid #E1E8EF",
  borderRadius: "9px",
  padding: "0 8px",
  fontSize: "13px",
  color: "#12202D",
  background: "#fff",
  outline: "none",
};

const AREA_STYLE: React.CSSProperties = {
  width: "100%",
  border: "1px solid #E1E8EF",
  borderRadius: "9px",
  padding: "9px 10px",
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#12202D",
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
};

export default function CECDetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  pills,
  sections,
  data,
  onChange,
  onSave,
  onDelete,
  linkedRecords,
}: CECDetailDrawerProps) {
  const [localData, setLocalData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalData({ ...data });
  }, [data]);

  // Every edit is reflected in the table immediately (onChange updates the row
  // in place); the accumulated changes are only written to the server on Done.
  const handleChange = (key: string, value: string) => {
    setLocalData((prev) => ({ ...prev, [key]: value }));
    onChange?.(key, value);
  };

  const handleDone = async () => {
    setSaving(true);
    try {
      await onSave?.();
    } finally {
      setSaving(false);
      onClose();
    }
  };

  // Overlay / X also commit, so an edit is never silently lost on close.
  const handleClose = () => {
    if (saving) return;
    void handleDone();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", justifyContent: "flex-end" }}
        onClick={handleClose}
      >
        <div style={{ position: "absolute", inset: 0, background: "rgba(18,32,45,0.32)" }} />
      </div>

      {/* Drawer panel */}
      <section
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          width: "min(560px, 100%)",
          height: "100%",
          background: "#fff",
          boxShadow: "-16px 0 48px rgba(20,40,70,0.16)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          animation: "cecSlideIn 0.22s ease",
        }}
      >
        <style>{`@keyframes cecSlideIn { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E9EEF3", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title || "Untitled row"}
            </div>
            {subtitle && (
              <div style={{ fontSize: "12.5px", color: "#8A9AAB", marginTop: "3px" }}>{subtitle}</div>
            )}
            {pills && pills.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
                {pills.map((p, i) => (
                  <span key={i} style={p.style}>{p.text}</span>
                ))}
              </div>
            )}
          </div>
          <div
            onClick={handleClose}
            style={{
              flexShrink: 0,
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "1px solid #E1E8EF",
              background: "#F5F8FB",
              color: "#55697D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            &#x2715;
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 28px", display: "flex", flexDirection: "column", gap: "22px" }}>
          {sections.map((section, si) => (
            <div key={si}>
              <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#8A9AAB", marginBottom: "12px" }}>
                {section.title}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                {section.fields.map((field) => {
                  const val = localData[field.key] == null ? "" : String(localData[field.key]);
                  const wrapStyle: React.CSSProperties = field.type === "area" ? { gridColumn: "1 / -1" } : {};

                  return (
                    <div key={field.key} style={wrapStyle}>
                      <div style={{ fontSize: "11.5px", color: "#8A9AAB", marginBottom: "5px" }}>{field.label}</div>
                      {field.type === "static" && (
                        <div style={{ fontSize: "13px", color: "#12202D", lineHeight: "1.5", wordBreak: "break-word" }}>
                          {val || "---"}
                        </div>
                      )}
                      {field.type === "input" && (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          style={INPUT_STYLE}
                        />
                      )}
                      {field.type === "date" && (
                        <CECDatePicker
                          value={val}
                          onChange={(v) => handleChange(field.key, v)}
                          placeholder="Select date"
                        />
                      )}
                      {field.type === "select" && (
                        <select
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          style={SELECT_STYLE}
                        >
                          <option value="">---</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      {field.type === "area" && (
                        <textarea
                          value={val}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          rows={3}
                          style={AREA_STYLE}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {linkedRecords}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: "14px 24px", borderTop: "1px solid #E9EEF3", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FBFCFE" }}>
          {onDelete && (
            <div
              onClick={onDelete}
              style={{ fontSize: "12.5px", fontWeight: 500, color: "#C23434", cursor: "pointer", padding: "8px 10px", borderRadius: "8px" }}
            >
              Delete row
            </div>
          )}
          {!onDelete && <div />}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ fontSize: "11.5px", color: "#8A9AAB" }}>{saving ? "Saving..." : "Changes save when you click Done"}</div>
            <div
              onClick={() => { if (!saving) void handleDone(); }}
              style={{
                height: "36px",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                borderRadius: "9px",
                background: "#008ED3",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: 500,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Saving..." : "Done"}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
