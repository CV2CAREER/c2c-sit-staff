"use client";

import React, { useState, useEffect } from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECDataTable from "@/components/cec/CECDataTable";
import CECDetailDrawer, { DrawerSection } from "@/components/cec/CECDetailDrawer";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import { useCecMutations, useCecTracker } from "@/hooks/api/cec/cec-tracker";
import { ADMIN_CEC_AMBASSADOR_SCOUTING } from "@/constants/apiEndpoints/admin.endpoint";

interface AmbassadorScout {
  id: string;
  country: string;
  pipeline: string;
  nominations: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean }[] = [
  { key: "country", label: "Country" },
  { key: "pipeline", label: "Pipeline" },
  { key: "nominations", label: "Nominations", wide: true },
];

const FILTERS = [
  { key: "all", label: "All" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Pipeline",
    fields: [
      { key: "country", label: "Country", type: "input" },
      { key: "pipeline", label: "Pipeline", type: "input" },
      { key: "nominations", label: "Nominations", type: "area" },
    ],
  },
];

function renderCell(key: string, row: AmbassadorScout) {
  return <span>{(row as any)[key] || "---"}</span>;
}

export default function CECAmbassadorScoutingPage() {
  const { data: serverRows, stats, isLoading } = useCecTracker(ADMIN_CEC_AMBASSADOR_SCOUTING, "cec-ambassador-scouting", { countries: 0, nominations: 0 });
  const [data, setData] = useState<AmbassadorScout[]>([]);
  const [selected, setSelected] = useState<AmbassadorScout | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { createRow, updateRow, deleteRow } = useCecMutations(ADMIN_CEC_AMBASSADOR_SCOUTING, "cec-ambassador-scouting");

  useEffect(() => { if (serverRows.length) setData(serverRows as AmbassadorScout[]); }, [serverRows]);

  const handleRowClick = (row: AmbassadorScout) => { setSelected(row); setDrawerOpen(true); };

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
    const row = { id: tempId, country: "", pipeline: "", nominations: "" } as AmbassadorScout;
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

  if (isLoading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
        <CECTrackerHeader title="Ambassador Program Scouting" subtitle="Country pipelines and nominations." />
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
      <CECTrackerHeader title="Ambassador Program Scouting" subtitle="Country pipelines and nominations." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <CECKPICard label="Countries" value={stats.countries} hint="in scouting" />
        <CECKPICard label="Nominations" value={stats.nominations} hint="named" />
      </div>
      <CECDataTable columns={COLUMNS} data={data} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.country || "Untitled row"} subtitle="Ambassador Scouting" sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onDelete={handleDelete} />
    </section>
  );
}
