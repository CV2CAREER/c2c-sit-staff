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
import { ADMIN_CEC_DAILY_LOG } from "@/constants/apiEndpoints/admin.endpoint";

interface DailyLog {
  id: string;
  logId: string | null;
  campaignCredentialId: string;
  hasLog: boolean;
  name: string;
  customerId: string;
  plan: string;
  flightStatus: string;
  mobile: string;
  status: string;
  loyalty: string;
  submissions: number;
  lastCall: string;
  callEstablished: string;
  sentimentBefore: string;
  sentimentAfter: string;
  migration: string;
  survey: string;
  referral: string;
  blockerFixed: string;
  notes: string;
  postCall: string;
  subDate: string;
  subEnd: string;
  reviewDate: string;
  qqa: string;
  cvFidelity: string;
  prefs: string;
  historyReviewed: string;
  briefing: string;
  followUp: string;
}

const COLUMNS: { key: string; label: string; wide?: boolean; render?: (row: any) => React.ReactNode }[] = [
  { key: "name", label: "Client" },
  { key: "plan", label: "Plan" },
  { key: "status", label: "Subscription" },
  { key: "loyalty", label: "Loyalty" },
  { key: "submissions", label: "Submissions" },
  { key: "lastCall", label: "Last call", render: (row: any) => fmtDate(row.lastCall) },
  { key: "callEstablished", label: "Call" },
  { key: "sentimentBefore", label: "Before" },
  { key: "sentimentAfter", label: "After" },
  { key: "survey", label: "Survey" },
  { key: "referral", label: "Referral" },
  { key: "subDate", label: "Sub date", render: (row: any) => fmtDate(row.subDate) },
  { key: "subEnd", label: "Sub end", render: (row: any) => fmtDate(row.subEnd) },
  { key: "reviewDate", label: "Review date", render: (row: any) => fmtDate(row.reviewDate) },
  { key: "notes", label: "Notes", wide: true },
];

const PILL_KEYS = ["status", "loyalty", "callEstablished", "sentimentBefore", "sentimentAfter", "survey", "referral", "blockerFixed", "followUp", "briefing", "plan"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical before call" },
  { key: "nocall", label: "No call logged" },
  { key: "nosurvey", label: "Survey not sent" },
  { key: "migrated", label: "Validated migrations" },
];

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "Account",
    fields: [
      { key: "customerId", label: "Customer ID", type: "static" },
      { key: "mobile", label: "Mobile", type: "input" },
      { key: "status", label: "Subscription status", type: "select", options: OPTS.status },
      { key: "loyalty", label: "Loyalty", type: "select", options: OPTS.loyalty },
      { key: "subDate", label: "Subscription date", type: "date" },
      { key: "subEnd", label: "Subscription ends", type: "date" },
      { key: "reviewDate", label: "Review date", type: "date" },
      { key: "lastCall", label: "Last call", type: "date" },
    ],
  },
  {
    title: "Call prep",
    fields: [
      { key: "submissions", label: "Submissions count", type: "static" },
      { key: "qqa", label: "QQA(S) rating", type: "input" },
      { key: "cvFidelity", label: "CV fidelity", type: "select", options: OPTS.cvFidelity },
      { key: "prefs", label: "Preferences exhaustiveness", type: "select", options: OPTS.prefs },
      { key: "historyReviewed", label: "Engagement history reviewed", type: "select", options: OPTS.historyReviewed },
      { key: "briefing", label: "Pre-call briefing done", type: "select", options: OPTS.briefing },
    ],
  },
  {
    title: "Call outcome",
    fields: [
      { key: "callEstablished", label: "Call established", type: "select", options: OPTS.callEstablished },
      { key: "followUp", label: "Follow-up required", type: "select", options: OPTS.followUp },
      { key: "sentimentBefore", label: "Sentiment before", type: "select", options: OPTS.sentimentBefore },
      { key: "sentimentAfter", label: "Sentiment after", type: "select", options: OPTS.sentimentAfter },
      { key: "migration", label: "Migration type", type: "select", options: OPTS.migration },
      { key: "blockerFixed", label: "Blocker fixed on call", type: "select", options: OPTS.blockerFixed },
      { key: "survey", label: "Survey sent", type: "select", options: OPTS.survey },
      { key: "referral", label: "Referral asked", type: "select", options: OPTS.referral },
      { key: "notes", label: "Notes / next action", type: "area" },
      { key: "postCall", label: "Post-call comments", type: "area" },
    ],
  },
];

function renderCell(key: string, row: DailyLog) {
  const val = (row as any)[key];
  if (PILL_KEYS.includes(key)) {
    return <CECPill label={val || "---"} />;
  }
  if (key === "submissions") {
    return <span>{row.submissions ?? "---"}</span>;
  }
  return <span>{val || "---"}</span>;
}

export default function CECDailyLogPage() {
  const { data: serverRows, stats, isLoading } = useCecTracker(ADMIN_CEC_DAILY_LOG, "cec-daily-log", { total: 0, callsLogged: 0, critical: 0, validatedMigrations: 0, surveyIn5mins: 0 });
  const [data, setData] = useState<DailyLog[]>([]);
  const [selected, setSelected] = useState<DailyLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { saveChanges, removeRow } = useCecRowEditor<DailyLog>(ADMIN_CEC_DAILY_LOG, "cec-daily-log");
  const pendingRef = useRef<Record<string, any>>({});

  useEffect(() => { if (serverRows.length) setData(serverRows as DailyLog[]); }, [serverRows]);

  const filteredData = (() => {
    let rows = data;
    if (activeFilter === "critical") rows = rows.filter((r) => r.sentimentBefore === "Critical");
    if (activeFilter === "nocall") rows = rows.filter((r) => r.callEstablished !== "Yes");
    if (activeFilter === "nosurvey") rows = rows.filter((r) => !r.survey || r.survey === "" || r.survey === "No");
    if (activeFilter === "migrated") rows = rows.filter((r) => r.migration && r.migration.includes(" to "));
    return rows;
  })();

  const handleRowClick = (row: DailyLog) => { pendingRef.current = {}; setSelected(row); setDrawerOpen(true); };

  // Live edit: reflect the change in the table immediately, but hold it in
  // pendingRef until the drawer's Done button persists everything at once.
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

  const handleDelete = async () => {
    if (!selected) return;
    if (!selected.hasLog) {
      setData((prev) => prev.filter((r) => r.id !== selected.id));
      setDrawerOpen(false);
      setSelected(null);
      return;
    }
    await removeRow(selected);
    const reset = { ...selected, hasLog: false, logId: null, callEstablished: "", sentimentBefore: "", sentimentAfter: "", survey: "", referral: "", notes: "", postCall: "", blockerFixed: "", followUp: "", briefing: "", migration: "", qqa: "", cvFidelity: "", prefs: "", historyReviewed: "", lastCall: "" };
    setSelected(reset);
    setData((prev) => prev.map((r) => r.id === selected.id ? reset : r));
  };

  const getPills = (row: DailyLog) => {
    return [row.status, row.loyalty, row.sentimentBefore, row.sentimentAfter, row.callEstablished]
      .filter(Boolean)
      .map((text) => ({ text, style: getPillStyle(text) }));
  };

  if (isLoading) {
    return (
      <section style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
        <CECTrackerHeader title="CEC Daily Log" subtitle="One row per client call — prep, sentiment movement, survey and referral." />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[1,2,3,4,5].map((i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E9EEF3", borderRadius: "12px", padding: "14px 16px", minWidth: "160px" }}>
              <div style={{ height: "11px", width: "80px", background: "#F1F5F9", borderRadius: "4px" }} />
              <div style={{ height: "24px", width: "40px", background: "#F1F5F9", borderRadius: "4px", marginTop: "10px" }} />
              <div style={{ height: "11px", width: "100px", background: "#F1F5F9", borderRadius: "4px", marginTop: "6px" }} />
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1px solid #E9EEF3", borderRadius: "12px", padding: "48px", textAlign: "center", fontSize: "13px", color: "#8A9AAB" }}>
          Loading clients...
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
      <CECTrackerHeader title="CEC Daily Log" subtitle="One row per client call — prep, sentiment movement, survey and referral." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "12px" }}>
        <CECKPICard label="Clients" value={stats.total} hint="logged on daily log" />
        <CECKPICard label="Calls logged" value={stats.callsLogged} hint="call established" />
        <CECKPICard label="Critical" value={stats.critical} hint="before the call" bad />
        <CECKPICard label="Validated migrations" value={stats.validatedMigrations} hint="sentiment movement" />
        <CECKPICard label="Survey in 5 mins" value={stats.surveyIn5mins} hint="logged on time" />
      </div>
      <CECDataTable columns={COLUMNS} data={filteredData} filters={FILTERS} activeFilter={activeFilter} onFilterChange={setActiveFilter} onRowClick={handleRowClick} selectedRow={selected} renderCell={renderCell} totalCount={data.length} />
      <CECDetailDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || "Untitled row"} subtitle={selected ? `Customer ${selected.customerId || "---"} · ${selected.plan || "no plan"}` : undefined} pills={selected ? getPills(selected) : undefined} sections={DRAWER_SECTIONS} data={selected || {}} onChange={handleChange} onSave={handleSave} onDelete={handleDelete} />
    </section>
  );
}
