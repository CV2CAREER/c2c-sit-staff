"use client";

import React, { useState, useEffect, useCallback } from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECDataTable from "@/components/cec/CECDataTable";
import CECDetailDrawer, { DrawerSection } from "@/components/cec/CECDetailDrawer";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import CECPill, { getPillStyle } from "@/components/cec/CECPill";
import { OPTS } from "@/components/cec/cec-constants";
import { fmtDate } from "@/components/cec/cec-constants";
import CECDatePicker from "@/components/cec/CECDatePicker";
import axiosInstance from "@/services/api-client";

const API = "/api/v1/admin/cec/issue-burndown";

interface IssueBurndown {
  id: string;
  name: string;
  otp: string;
  verification: string;
  cv: string;
  forwarding: string;
  indeed: string;
  delegation: string;
  outreachType: string;
  outreachDate: string;
  resolution: string;
  login: string;
  proof: string;
  vcount: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean; render?: (row: any) => React.ReactNode }[] = [
  { key: "name", label: "Client" },
  { key: "otp", label: "OTP" },
  { key: "verification", label: "Verification" },
  { key: "cv", label: "CV upload" },
  { key: "forwarding", label: "Forwarding" },
  { key: "indeed", label: "Indeed" },
  { key: "delegation", label: "Email delegation" },
  { key: "outreachType", label: "Outreach" },
  { key: "outreachDate", label: "Outreach date", render: (row: any) => fmtDate(row.outreachDate) },
  { key: "resolution", label: "Resolution" },
];

const PILL_KEYS = ["otp", "verification", "cv", "forwarding", "indeed", "delegation", "resolution"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "otp", label: "OTP issue" },
  { key: "unverified", label: "Not verified" },
  { key: "nocv", label: "CV missing" },
  { key: "open", label: "Unresolved" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Checks",
    fields: [
      { key: "otp", label: "OTP issue", type: "select", options: OPTS.otp },
      { key: "verification", label: "Verification status", type: "select", options: OPTS.verification },
      { key: "cv", label: "CV upload", type: "select", options: OPTS.cv },
      { key: "vcount", label: "Verification count", type: "input" },
      { key: "forwarding", label: "Forwarding setup", type: "select", options: OPTS.forwarding },
      { key: "indeed", label: "Indeed", type: "select", options: OPTS.indeed },
      { key: "delegation", label: "Email delegation", type: "select", options: OPTS.delegation },
      { key: "resolution", label: "Resolution status", type: "select", options: OPTS.resolution },
    ],
  },
  {
    title: "Access & outreach",
    fields: [
      { key: "login", label: "Email and password", type: "input" },
      { key: "proof", label: "Verification proof", type: "input" },
      { key: "outreachType", label: "Outreach type", type: "input" },
      { key: "outreachDate", label: "Outreach date", type: "date" },
    ],
  },
];

function renderCell(key: string, row: IssueBurndown) {
  const val = (row as any)[key];
  if (PILL_KEYS.includes(key)) {
    return <CECPill label={val || "---"} />;
  }
  return <span>{val || "---"}</span>;
}

export default function CECIssueBurndownPage() {
  const [data, setData] = useState<IssueBurndown[]>([]);
  const [stats, setStats] = useState({ total: 0, otpIssues: 0, notVerified: 0, cvMissing: 0, clean: 0 });
  const [selected, setSelected] = useState<IssueBurndown | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dataRes, statsRes] = await Promise.allSettled([
        axiosInstance.get(`${API}/clients-with-logs`),
        axiosInstance.get(`${API}/stats`),
      ]);
      if (dataRes.status === "fulfilled") setData(dataRes.value.data?.data?.rows || []);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data?.data || stats);
    } catch (err) { console.error("[CEC IssueBurndown] fetch error:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = (() => {
    let rows = data;
    if (activeFilter === "otp") rows = rows.filter((r) => r.otp && r.otp !== "No Issue" && r.otp !== "");
    if (activeFilter === "unverified") rows = rows.filter((r) => r.verification === "Not Verified");
    if (activeFilter === "nocv") rows = rows.filter((r) => r.cv === "Not yet uploaded");
    if (activeFilter === "open") rows = rows.filter((r) => r.resolution && r.resolution !== "Resolved" && r.resolution !== "");
    return rows;
  })();

  const handleRowClick = (row: IssueBurndown) => { setSelected(row); setDrawerOpen(true); };

  const handleChange = (key: string, value: string) => {
    if (!selected) return;
    const updated = { ...selected, [key]: value };
    setSelected(updated);
    setData((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    if (String(selected.id).startsWith("temp-")) {
      axiosInstance.post(API, { ...updated, id: undefined }).then((res) => {
        const saved = res.data?.data;
        if (saved) {
          setSelected(saved);
          setData((prev) => prev.map((r) => r.id === updated.id ? saved : r));
        }
      }).catch(() => {});
    } else {
      axiosInstance.put(`${API}/${selected.id}`, { [key]: value }).catch(() => {});
    }
  };

  const handleAddRow = () => {
    const tempId = `temp-${Date.now()}`;
    const row = { id: tempId, name: "", otp: "", verification: "", cv: "", forwarding: "", indeed: "", delegation: "", outreachType: "", outreachDate: "", resolution: "", login: "", proof: "", vcount: "" } as IssueBurndown;
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
    try {
      await axiosInstance.delete(`${API}/${selected.id}`);
      setData((prev) => prev.filter((r) => r.id !== selected.id));
      setDrawerOpen(false);
      setSelected(null);
    } catch { /* empty */ }
  };

  if (loading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
        <CECTrackerHeader title="Issue Burndown Tracker" subtitle="OTP, identity verification and CV upload — every client, worked to resolution." />
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
      <CECTrackerHeader title="Issue Burndown Tracker" subtitle="OTP, identity verification and CV upload — every client, worked to resolution." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <CECKPICard label="Clients" value={stats.total} hint="in the burndown" />
        <CECKPICard label="OTP issues" value={stats.otpIssues} hint="need action" bad />
        <CECKPICard label="Not verified" value={stats.notVerified} hint="identity check" bad />
        <CECKPICard label="CV missing" value={stats.cvMissing} hint="no PDF on file" bad />
        <CECKPICard label="Clean" value={stats.clean} hint="all three green" />
      </div>
      <CECDataTable columns={COLUMNS} data={filteredData} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || "Untitled row"} subtitle="Issue Burndown" pills={selected ? [selected.otp, selected.verification, selected.cv, selected.resolution].filter(Boolean).map((t) => ({ text: t, style: getPillStyle(t) })) : undefined} sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onDelete={handleDelete} />
    </section>
  );
}
