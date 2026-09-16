"use client";

import React, { useState, useEffect, useRef } from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECDataTable from "@/components/cec/CECDataTable";
import CECDetailDrawer, { DrawerSection } from "@/components/cec/CECDetailDrawer";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import CECPill, { getPillStyle } from "@/components/cec/CECPill";
import { OPTS } from "@/components/cec/cec-constants";
import { useCecRowEditor, useCecTracker } from "@/hooks/api/cec/cec-tracker";
import { ADMIN_CEC_SALES_OUTREACH } from "@/constants/apiEndpoints/admin.endpoint";

interface SalesOutreach {
  id: string;
  hasLog?: boolean;
  logId?: string | null;
  persona: string;
  state: string;
  sentiment: string;
  available: string;
  reached: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean }[] = [
  { key: "persona", label: "Persona" },
  { key: "state", label: "State" },
  { key: "sentiment", label: "Sentiment" },
  { key: "available", label: "Available" },
  { key: "reached", label: "Reached" },
];

const PILL_KEYS = ["sentiment", "state"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "guest", label: "Guest" },
  { key: "client", label: "Client" },
  { key: "alumni", label: "Alumni" },
  { key: "dormant", label: "Dormant" },
  { key: "active", label: "Active" },
  { key: "lapsed", label: "Lapsed" },
  { key: "critical", label: "Critical" },
  { key: "satisfied", label: "Satisfied" },
  { key: "advocate", label: "Advocate" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Segment",
    fields: [
      { key: "persona", label: "Persona", type: "select", options: OPTS.persona },
      { key: "state", label: "State", type: "select", options: OPTS.state },
      { key: "sentiment", label: "Sentiment", type: "select", options: OPTS.sentiment },
      { key: "available", label: "Available", type: "input" },
      { key: "reached", label: "Reached", type: "input" },
    ],
  },
];

function renderCell(key: string, row: SalesOutreach) {
  const val = (row as any)[key];
  if (PILL_KEYS.includes(key)) {
    return <CECPill label={val || "---"} />;
  }
  return <span>{val || "---"}</span>;
}

export default function CECSalesOutreachPage() {
  const { data: serverRows, stats, isLoading } = useCecTracker(ADMIN_CEC_SALES_OUTREACH, "cec-sales-outreach", { segments: 0, reached: 0 });
  const [data, setData] = useState<SalesOutreach[]>([]);
  const [selected, setSelected] = useState<SalesOutreach | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { saveChanges, removeRow } = useCecRowEditor<SalesOutreach>(ADMIN_CEC_SALES_OUTREACH, "cec-sales-outreach");
  const pendingRef = useRef<Record<string, any>>({});

  useEffect(() => { if (serverRows.length) setData(serverRows as SalesOutreach[]); }, [serverRows]);

  const filteredData = (() => {
    let rows = data;
    if (activeFilter === "guest") rows = rows.filter((r) => r.persona === "Guest");
    else if (activeFilter === "client") rows = rows.filter((r) => r.persona === "Client");
    else if (activeFilter === "alumni") rows = rows.filter((r) => r.persona === "Alumni");
    else if (activeFilter === "dormant") rows = rows.filter((r) => r.state === "Dormant");
    else if (activeFilter === "active") rows = rows.filter((r) => r.state === "Active");
    else if (activeFilter === "lapsed") rows = rows.filter((r) => r.state === "Lapsed");
    else if (activeFilter === "critical") rows = rows.filter((r) => r.sentiment === "Critical");
    else if (activeFilter === "satisfied") rows = rows.filter((r) => r.sentiment === "Satisfied");
    else if (activeFilter === "advocate") rows = rows.filter((r) => r.sentiment === "Advocate");
    return rows;
  })();

  const handleRowClick = (row: SalesOutreach) => { pendingRef.current = {}; setSelected(row); setDrawerOpen(true); };

  const handleChange = (key: string, value: string) => {
    if (!selected) return;
    pendingRef.current = { ...pendingRef.current, [key]: value };
    const updated = { ...selected, [key]: value };
    setSelected(updated);
    setData((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  const handleSave = () => {
    if (!selected) return Promise.resolve();
    const changes = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(changes).length === 0) return Promise.resolve();
    const current = selected;
    return saveChanges(current, changes, (merged) => {
      setSelected((prev) => (prev && prev.id === current.id ? merged : prev));
      setData((prev) => prev.map((r) => r.id === current.id ? merged : r));
    });
  };

  const handleAddRow = () => {
    const tempId = `temp-${Date.now()}`;
    const row = { id: tempId, hasLog: false, logId: null, persona: "", state: "", sentiment: "", available: "", reached: "" } as SalesOutreach;
    setData((prev) => [row, ...prev]);
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!selected.hasLog) {
      setData((prev) => prev.filter((r) => r.id !== selected.id));
      setDrawerOpen(false);
      setSelected(null);
      return;
    }
    await removeRow(selected);
    setData((prev) => prev.filter((r) => r.id !== selected.id));
    setDrawerOpen(false);
    setSelected(null);
  };

  if (isLoading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
        <CECTrackerHeader title="Sales Outreach Tracker" subtitle="Persona x state x sentiment grid, with availability and reach." />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[1,2].map((i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E9EEF3", borderRadius: "12px", padding: "14px 16px", minWidth: "160px" }}>
              <div style={{ height: "11px", width: "80px", background: "#F1F5F9", borderRadius: "4px" }} />
              <div style={{ height: "24px", width: "40px", background: "#F1F5F9", borderRadius: "4px", marginTop: "10px" }} />
              <div style={{ height: "11px", width: "100px", background: "#F1F5F9", borderRadius: "4px", marginTop: "6px" }} />
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #E9EEF3", borderRadius: "12px", padding: "48px", textAlign: "center", fontSize: "13px", color: "#8A9AAB" }}>Loading clients...</div>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
      <CECTrackerHeader title="Sales Outreach Tracker" subtitle="Persona x state x sentiment grid, with availability and reach." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <CECKPICard label="Segments" value={stats.segments} hint="persona x state" />
        <CECKPICard label="Reached" value={stats.reached} hint="logged as reached" />
      </div>
      <CECDataTable columns={COLUMNS} data={filteredData} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.persona || "Untitled row"} subtitle="Sales Outreach" sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onSave={handleSave} onDelete={handleDelete} />
    </section>
  );
}
