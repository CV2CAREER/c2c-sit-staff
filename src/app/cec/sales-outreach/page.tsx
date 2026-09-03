"use client";

import React, { useState, useEffect, useCallback } from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECDataTable from "@/components/cec/CECDataTable";
import CECDetailDrawer, { DrawerSection } from "@/components/cec/CECDetailDrawer";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import CECPill, { getPillStyle } from "@/components/cec/CECPill";
import { OPTS } from "@/components/cec/cec-constants";
import { useCecMutations } from "@/hooks/api/cec/cec-tracker";
import { ADMIN_CEC_SALES_OUTREACH } from "@/constants/apiEndpoints/admin.endpoint";
import axiosInstance from "@/services/api-client";

interface SalesOutreach {
  id: string;
  persona: string;
  state: string;
  sentiment: string;
  heritage: string;
  available: string;
  reached: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean }[] = [
  { key: "persona", label: "Persona" },
  { key: "state", label: "State" },
  { key: "sentiment", label: "Sentiment" },
  { key: "heritage", label: "Heritage" },
  { key: "available", label: "Available" },
  { key: "reached", label: "Reached" },
];

const PILL_KEYS = ["sentiment", "state"];

const FILTERS = [
  { key: "all", label: "All" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Segment",
    fields: [
      { key: "persona", label: "Persona", type: "select", options: OPTS.persona },
      { key: "state", label: "State", type: "select", options: OPTS.state },
      { key: "sentiment", label: "Sentiment", type: "select", options: OPTS.sentiment },
      { key: "heritage", label: "Heritage", type: "select", options: OPTS.heritage },
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
  const [data, setData] = useState<SalesOutreach[]>([]);
  const [stats, setStats] = useState({ segments: 0, reached: 0 });
  const [selected, setSelected] = useState<SalesOutreach | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const { createRow, updateRow, deleteRow } = useCecMutations(ADMIN_CEC_SALES_OUTREACH, "cec-sales-outreach");

  const fetchData = useCallback(async () => {
    try {
      const [dataRes, statsRes] = await Promise.allSettled([
        axiosInstance.get(`${ADMIN_CEC_SALES_OUTREACH}/clients-with-logs`),
        axiosInstance.get(`${ADMIN_CEC_SALES_OUTREACH}/stats`),
      ]);
      if (dataRes.status === "fulfilled") setData(dataRes.value.data?.data?.rows || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data?.data || stats);
    } catch (err) { console.error("[CEC SalesOutreach] fetch error:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRowClick = (row: SalesOutreach) => { setSelected(row); setDrawerOpen(true); };

  const handleChange = (key: string, value: string) => {
    if (!selected) return;
    const updated = { ...selected, [key]: value };
    setSelected(updated);
    setData((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    if (String(selected.id).startsWith("temp-")) {
      createRow.mutateAsync({ ...updated, id: undefined }).then((res) => {
        const saved = res.data;
        if (saved) {
          setSelected(saved);
          setData((prev) => prev.map((r) => r.id === updated.id ? saved : r));
        }
      });
    } else {
      updateRow.mutateAsync({ id: selected.id, field: key, value });
    }
  };

  const handleAddRow = () => {
    const tempId = `temp-${Date.now()}`;
    const row = { id: tempId, persona: "", state: "", sentiment: "", heritage: "", available: "", reached: "" } as SalesOutreach;
    setData((prev) => [row, ...prev]);
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (String(selected.id).startsWith("temp-")) {
      setData((prev) => prev.filter((r) => r.id !== selected.id));
      setDrawerOpen(false);
      setSelected(null);
      return;
    }
    deleteRow.mutateAsync({ id: selected.id }).then(() => {
      setData((prev) => prev.filter((r) => r.id !== selected.id));
      setDrawerOpen(false);
      setSelected(null);
    });
  };

  if (loading) {
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
      <CECDataTable columns={COLUMNS} data={data} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.persona || "Untitled row"} subtitle="Sales Outreach" sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onDelete={handleDelete} />
    </section>
  );
}
