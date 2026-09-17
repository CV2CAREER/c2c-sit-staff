"use client";

import React, { useState, useEffect, useRef } from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECDataTable from "@/components/cec/CECDataTable";
import CECDetailDrawer, { DrawerSection } from "@/components/cec/CECDetailDrawer";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import CECPill, { getPillStyle } from "@/components/cec/CECPill";
import { OPTS } from "@/components/cec/cec-constants";
import { fmtDate } from "@/components/cec/cec-constants";
import CECDatePicker from "@/components/cec/CECDatePicker";
import { useCecRowEditor, useCecTracker } from "@/hooks/api/cec/cec-tracker";
import { ADMIN_CEC_COMPLAINTS } from "@/constants/apiEndpoints/admin.endpoint";

interface Complaint {
  id: string;
  hasLog?: boolean;
  logId?: string | null;
  complaintId: string;
  logged: string;
  name: string;
  category: string;
  channel: string;
  priority: string;
  status: string;
  owner: string;
  age: number;
  issue: string;
  action: string;
  next: string;
  resolved: string;
  notes: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean; render?: (row: any) => React.ReactNode }[] = [
  { key: "complaintId", label: "ID" },
  { key: "logged", label: "Logged", render: (row: any) => fmtDate(row.logged) },
  { key: "name", label: "Client" },
  { key: "category", label: "Category" },
  { key: "channel", label: "Channel" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "age", label: "Age" },
  { key: "next", label: "Next action", wide: true, render: (row: any) => fmtDate(row.next) },
  { key: "resolved", label: "Resolved", render: (row: any) => fmtDate(row.resolved) },
];

const PILL_KEYS = ["priority", "status"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "breached", label: "Breached 7+ days" },
  { key: "high", label: "High priority" },
  { key: "resolved", label: "Resolved" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Complaint",
    fields: [
      { key: "complaintId", label: "Complaint ID", type: "static" },
      { key: "name", label: "Client name", type: "input" },
      { key: "logged", label: "Date logged", type: "date" },
      { key: "channel", label: "Channel", type: "select", options: OPTS.channel },
      { key: "category", label: "Category", type: "select", options: OPTS.category },
      { key: "priority", label: "Priority", type: "select", options: OPTS.priority },
      { key: "status", label: "Status", type: "select", options: OPTS.cctStatus },
      { key: "owner", label: "Owner / team", type: "select", options: OPTS.owner },
      { key: "issue", label: "Issue raised", type: "area" },
    ],
  },
  {
    title: "Resolution",
    fields: [
      { key: "action", label: "Action taken", type: "area" },
      { key: "next", label: "Next action / follow-up", type: "date" },
      { key: "resolved", label: "Date resolved", type: "date" },
      { key: "notes", label: "Notes", type: "area" },
    ],
  },
];

function renderCell(key: string, row: Complaint) {
  const val = (row as any)[key];
  if (PILL_KEYS.includes(key)) {
    return <CECPill label={val || "---"} />;
  }
  if (key === "age") {
    return <span>{row.age ?? "---"}</span>;
  }
  return <span>{val || "---"}</span>;
}

export default function CECComplaintsPage() {
  const { data: serverRows, stats, isLoading } = useCecTracker(ADMIN_CEC_COMPLAINTS, "cec-complaints", { totalLogged: 0, open: 0, breached: 0, highPriority: 0, resolved: 0 });
  const [data, setData] = useState<Complaint[]>([]);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { saveChanges, removeRow } = useCecRowEditor<Complaint>(ADMIN_CEC_COMPLAINTS, "cec-complaints");
  const pendingRef = useRef<Record<string, any>>({});

  useEffect(() => { if (serverRows.length) setData(serverRows as Complaint[]); }, [serverRows]);

  const filteredData = (() => {
    let rows = data;
    if (activeFilter === "open") rows = rows.filter((r) => r.status !== "Resolved" && r.status !== "");
    if (activeFilter === "high") rows = rows.filter((r) => r.priority === "High");
    if (activeFilter === "resolved") rows = rows.filter((r) => r.status === "Resolved");
    if (activeFilter === "breached") rows = rows.filter((r) => r.status !== "Resolved" && r.status !== "" && r.age > 7);
    return rows;
  })();

  const handleRowClick = (row: Complaint) => { pendingRef.current = {}; setSelected(row); setDrawerOpen(true); };

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
    const row = { id: tempId, hasLog: false, logId: null, complaintId: "", status: "Open", logged: new Date().toISOString().slice(0, 10), name: "", category: "", channel: "", priority: "Medium", owner: "", age: 0, issue: "", action: "", next: "", resolved: "", notes: "" } as unknown as Complaint;
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
        <CECTrackerHeader title="Complaints Tracker" subtitle="Every complaint logged once, owned by a team, aged automatically." />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[1,2,3,4,5].map((i) => (
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
      <CECTrackerHeader title="Complaints Tracker" subtitle="Every complaint logged once, owned by a team, aged automatically." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <CECKPICard label="Total logged" value={stats.totalLogged} hint="all time" />
        <CECKPICard label="Open" value={stats.open} hint="not yet closed" />
        <CECKPICard label="Breached" value={stats.breached} hint="open 7+ days" bad />
        <CECKPICard label="High priority" value={stats.highPriority} hint="flagged high" />
        <CECKPICard label="Resolved" value={stats.resolved} hint="closed out" />
      </div>
      <CECDataTable columns={COLUMNS} data={filteredData} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || "Untitled row"} subtitle={selected ? `${selected.complaintId || "No ID"} · logged ${selected.logged || "---"}` : undefined} pills={selected ? [selected.status, selected.priority, selected.category, selected.channel].filter(Boolean).map((t) => ({ text: t, style: getPillStyle(t) })) : undefined} sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onSave={handleSave} onDelete={handleDelete} />
    </section>
  );
}
