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

const API = "/api/v1/admin/cec/referral-payouts";

interface ReferralPayout {
  id: string;
  date: string;
  amount: number;
  account: string;
  type: string;
  details: string;
  heritage: string;
  gender: string;
  outreach: string;
  response: string;
  processed: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean; render?: (row: any) => React.ReactNode }[] = [
  { key: "date", label: "Date", render: (row: any) => fmtDate(row.date) },
  { key: "amount", label: "Amount" },
  { key: "details", label: "Transaction details", wide: true },
  { key: "heritage", label: "Heritage" },
  { key: "outreach", label: "Outreach" },
  { key: "response", label: "Response" },
  { key: "processed", label: "Processed" },
];

const PILL_KEYS = ["outreach"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "noreach", label: "No outreach" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Payment",
    fields: [
      { key: "date", label: "Date", type: "date" },
      { key: "amount", label: "Amount", type: "input" },
      { key: "type", label: "Transaction type", type: "input" },
      { key: "account", label: "Account number", type: "input" },
      { key: "details", label: "Transaction details", type: "area" },
    ],
  },
  {
    title: "Follow-up",
    fields: [
      { key: "heritage", label: "Heritage", type: "select", options: OPTS.heritage },
      { key: "gender", label: "Gender", type: "input" },
      { key: "outreach", label: "Outreach done", type: "select", options: OPTS.outreach },
      { key: "response", label: "Response", type: "input" },
      { key: "processed", label: "Processed on", type: "input" },
    ],
  },
];

function renderCell(key: string, row: ReferralPayout) {
  const val = (row as any)[key];
  if (PILL_KEYS.includes(key)) {
    return <CECPill label={val || "---"} />;
  }
  if (key === "amount") {
    return <span>{row.amount != null ? `$${Number(row.amount).toLocaleString()}` : "---"}</span>;
  }
  return <span>{val || "---"}</span>;
}

export default function CECReferralPayoutsPage() {
  const [data, setData] = useState<ReferralPayout[]>([]);
  const [stats, setStats] = useState({ payments: 0, totalPaid: 0, outreachDone: 0, noOutreach: 0 });
  const [selected, setSelected] = useState<ReferralPayout | null>(null);
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
    } catch (err) { console.error("[CEC ReferralPayouts] fetch error:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = (() => {
    let rows = data;
    if (activeFilter === "noreach") rows = rows.filter((r) => r.outreach !== "Yes" && r.outreach !== "");
    return rows;
  })();

  const handleRowClick = (row: ReferralPayout) => { setSelected(row); setDrawerOpen(true); };

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
    const row = { id: tempId, date: "", amount: 0, account: "", type: "", details: "", heritage: "", gender: "", outreach: "", response: "", processed: "" } as ReferralPayout;
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
        <CECTrackerHeader title="Referral Payouts" subtitle="Referral rewards paid out, with outreach follow-up state." />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[1,2,3,4].map((i) => (
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
      <CECTrackerHeader title="Referral Payouts" subtitle="Referral rewards paid out, with outreach follow-up state." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <CECKPICard label="Payments" value={stats.payments} hint="referral rewards" />
        <CECKPICard label="Total paid" value={`$${stats.totalPaid.toLocaleString()}`} hint="sum of rewards" />
        <CECKPICard label="Outreach done" value={stats.outreachDone} hint="referrer contacted" />
        <CECKPICard label="No outreach" value={stats.noOutreach} hint="follow-up owed" bad />
      </div>
      <CECDataTable columns={COLUMNS} data={filteredData} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} onAddRow={handleAddRow} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.details || "Untitled row"} subtitle="Referral Payout" pills={selected ? [selected.outreach, selected.heritage, selected.response].filter(Boolean).map((t) => ({ text: t, style: getPillStyle(t) })) : undefined} sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onDelete={handleDelete} />
    </section>
  );
}
