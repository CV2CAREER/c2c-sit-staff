"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECDataTable from "@/components/cec/CECDataTable";
import CECDetailDrawer, { DrawerSection } from "@/components/cec/CECDetailDrawer";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import CECPill from "@/components/cec/CECPill";
import { useCecRowEditor, useCecTracker } from "@/hooks/api/cec/cec-tracker";
import { ADMIN_CEC_AMBASSADOR_SCOUTING } from "@/constants/apiEndpoints/admin.endpoint";

interface AmbassadorScout {
  id: string;
  hasLog?: boolean;
  logId?: string | null;
  country: string;
  pipeline: string;
  nominations: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean }[] = [
  { key: "country", label: "Country" },
  { key: "pipeline", label: "Pipeline" },
  { key: "nominations", label: "Nominations", wide: true },
];

const PILL_KEYS = ["pipeline"];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Pipeline",
    fields: [
      { key: "country", label: "Country", type: "input", required: true },
      { key: "pipeline", label: "Pipeline stage", type: "input" },
      { key: "nominations", label: "Nominations", type: "area" },
    ],
  },
];

function renderCell(key: string, row: AmbassadorScout) {
  const val = (row as any)[key];
  if (PILL_KEYS.includes(key)) {
    return <CECPill label={val || "---"} />;
  }
  return <span>{val || "---"}</span>;
}

export default function CECAmbassadorScoutingPage() {
  const { data: serverRows, stats, isLoading } = useCecTracker(ADMIN_CEC_AMBASSADOR_SCOUTING, "cec-ambassador-scouting", { countries: 0, nominations: 0 });
  const [data, setData] = useState<AmbassadorScout[]>([]);
  const [selected, setSelected] = useState<AmbassadorScout | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { saveChanges, removeRow } = useCecRowEditor<AmbassadorScout>(ADMIN_CEC_AMBASSADOR_SCOUTING, "cec-ambassador-scouting");
  const pendingRef = useRef<Record<string, any>>({});

  useEffect(() => { if (serverRows.length) setData(serverRows as AmbassadorScout[]); }, [serverRows]);

  // Country pipelines are the unit of work, so the filter is built from the
  // distinct countries actually present (case-insensitive), newest data first.
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of data) {
      const c = (r.country || "").trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filters = useMemo(
    () => [
      { key: "all", label: "All" },
      ...countryOptions.map((c) => ({ key: `country:${c}`, label: c })),
    ],
    [countryOptions],
  );

  const filteredData = useMemo(() => {
    if (activeFilter === "all") return data;
    if (activeFilter.startsWith("country:")) {
      const c = activeFilter.slice("country:".length).trim().toLowerCase();
      return data.filter((r) => (r.country || "").trim().toLowerCase() === c);
    }
    return data;
  }, [data, activeFilter]);

  const handleRowClick = (row: AmbassadorScout) => { pendingRef.current = {}; setSelected(row); setDrawerOpen(true); };

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
    const row = { id: tempId, hasLog: false, logId: null, country: "", pipeline: "", nominations: "" } as AmbassadorScout;
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
      <CECDataTable columns={COLUMNS} data={filteredData} filters={filters} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.country || "Untitled row"} subtitle="Ambassador Scouting" sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onSave={handleSave} onDelete={handleDelete} />
    </section>
  );
}
