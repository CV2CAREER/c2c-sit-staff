"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Play,
  Loader2,
  Clock,
  Globe,
  Activity,
  Terminal,
  BarChart3,
  Info,
  CopyCheck,
  Building2,
  Calendar,
  Server,
  Search,
  CheckCircle2,
  Zap,
} from "lucide-react";
import {
  useDiscoveryDashboard,
  useDiscoveryRuns,
  useTriggerDiscoveryRun,
  useTriggerDiscoveryRunAll,
  useToggleDiscoverySource,
  useDiscoverySchedule,
  useUpdateDiscoverySchedule,
  useKillDiscoveryRun,
  useRunLogStream,
} from "@/hooks/api/useDiscoveryAgent";
import { useCampaignQueries } from "@/hooks/api/admin/campaign";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SourceItem {
  id: string;
  name: string;
  enabled: boolean;
  count: number;
}

interface RunItem {
  id: string;
  run_id: string;
  trigger: string;
  started: string;
  duration: string;
  status: string;
  clients: number | string;
  fetched: number | string;
  dedup: number | string;
  hqa: number | string | null;
  mqa: number | string | null;
  lqa: number | string | null;
  log_entries?: Array<{ ts?: string; level?: string; message: string }> | null;
}

// ─── Style tokens (translated 1:1 from the removed discovery-agent.css) ───────
const CARD = "bg-white border border-primary/15 rounded-[14px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] overflow-hidden transition-shadow duration-200 hover:shadow-[0_4px_20px_rgba(0,142,211,0.12)]";
const CARD_HEADER = "flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white";
const CARD_HEADER_LEFT = "flex items-center gap-2.5";
const CARD_TITLE = "text-sm font-bold text-slate-900 flex items-center gap-2";
const CARD_BODY = "p-4.5 px-5";
const ENV_LABEL = "text-[10.5px] text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1.5";
const SELECT = "px-3 py-2 border border-slate-200 rounded-[10px] text-[12.5px] bg-slate-50 text-slate-900 cursor-pointer transition-all duration-200 hover:bg-white hover:border-primary focus:outline-none focus:border-primary focus:bg-white focus:ring-[3px] focus:ring-primary/25";

function pillClass(variant: "success" | "running" | "failed" | "killed" | "hqa" | "mqa" | "lqa") {
  switch (variant) {
    case "success": return "bg-[#f0fff1] text-[#1eb62d] border border-green-200";
    case "running": return "bg-amber-50 text-amber-500 border border-amber-200 animate-pulse";
    case "failed":  return "bg-red-50 text-red-500 border border-red-200";
    case "killed":  return "bg-slate-100 text-slate-500 border border-slate-200";
    case "hqa":     return "bg-[#f0fff1] text-[#1eb62d] border border-green-200";
    case "mqa":     return "bg-amber-50 text-amber-500 border border-amber-200";
    case "lqa":     return "bg-red-50 text-red-500 border border-red-200";
  }
}
const PILL = "inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap";

// ─── Log level helper ─────────────────────────────────────────────────────────
function logClass(level?: string) {
  switch (level?.toLowerCase()) {
    case "ok":      return "text-emerald-400";
    case "warn":    return "text-amber-400";
    case "info":    return "text-sky-400";
    default:        return "text-slate-500";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AIDiscoveryAgentPage() {
  const router = useRouter();

  // Discovery agent data
  const { data: dashboard, refetch: dashboardRefetch } = useDiscoveryDashboard();
  const triggerRun    = useTriggerDiscoveryRun();
  const triggerRunAll = useTriggerDiscoveryRunAll();
  const toggleSourceMutation = useToggleDiscoverySource();
  const { data: schedule } = useDiscoverySchedule();
  const updateSchedule = useUpdateDiscoverySchedule();
  const killRunMutation = useKillDiscoveryRun();

  // Campaign clients (for "Select Client" dropdown)
  const { campaignClientsDomain } = useCampaignQueries({ fetchCampaignClients: true });

  // Local UI state
  const [historyFilter,  setHistoryFilter]  = useState<"today" | "week" | "all">("today");
  const [sourcesState,   setSourcesState]   = useState<SourceItem[]>([]);
  const [runsState,      setRunsState]      = useState<RunItem[]>([]);
  const [isRunning,      setIsRunning]      = useState(false);
  const [selectedClient, setSelectedClient] = useState("All Clients");
  const [selectedEnv,    setSelectedEnv]    = useState("Production");
  const [selectedJobsite,setSelectedJobsite]= useState("All");
  const [selectedRange,  setSelectedRange]  = useState("Today");
  const [overrideKeywords, setOverrideKeywords] = useState("");
  const [overrideLocation, setOverrideLocation] = useState("");

  const logRef = useRef<HTMLDivElement>(null);

  // ── Run history with filter ─────────────────────────────────────────────────
  const { data: apiRuns } = useDiscoveryRuns(20, historyFilter);

  // ── Sync API sources ────────────────────────────────────────────────────────
  useEffect(() => {
    if (dashboard?.sources && dashboard.sources.length > 0) {
      setSourcesState(
        dashboard.sources.map((s: any) => ({
          id:      s.id,
          name:    s.name,
          enabled: s.enabled ?? true,
          count:   s.count ?? 0,
        }))
      );
    }
  }, [dashboard?.sources]);

  // ── Sync API runs ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (apiRuns && apiRuns.length > 0) {
      setRunsState(
        apiRuns.map((r: any) => ({
          id:         r.id || r.run_id,
          run_id:     r.run_id || r.id || "RUN-000",
          trigger:    r.trigger || "Scheduled",
          started:    r.started_at
            ? new Date(r.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
            : "—",
          duration:   r.duration_ms
            ? `${Math.floor(r.duration_ms / 60000)}m ${Math.floor((r.duration_ms % 60000) / 1000)}s`
            : "—",
          status:     r.status || "success",
          clients:    r.clients_count ?? "—",
          fetched:    r.fetched_count ?? "—",
          dedup:      r.dedup_count   ?? "—",
          hqa:        r.hqa_count     ?? null,
          mqa:        r.mqa_count     ?? null,
          lqa:        r.lqa_count     ?? null,
          log_entries: r.log_entries  ?? null,
        }))
      );
    } else if (apiRuns && apiRuns.length === 0) {
      setRunsState([]);
    }
  }, [apiRuns]);

  // ── Auto-scroll log to bottom ─────────────────────────────────────────────
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [runsState]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRunNow = () => {
    setIsRunning(true);
    const payload: any = {};
    if (overrideKeywords.trim()) {
      payload.keywords = overrideKeywords.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (overrideLocation.trim()) {
      payload.location = overrideLocation.trim();
    }
    triggerRunAll.mutate(payload, {
      onSettled: () => setTimeout(() => setIsRunning(false), 3000),
    });
  };

  const handleToggleSource = (id: string) => {
    setSourcesState((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
    toggleSourceMutation.mutate(id);
  };

  const handleKillRun = (runId: string) => {
    killRunMutation.mutate(runId);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const activeSourcesCount = sourcesState.filter((s) => s.enabled).length;
  const isPending = isRunning || triggerRun.isPending || triggerRunAll.isPending;

  // Dashboard stats (real or defaults)
  const stats = {
    totalJobs:  dashboard?.stats?.totalJobs  ?? 0,
    uniqueJobs: dashboard?.stats?.uniqueJobs ?? 0,
    hqaCount:   dashboard?.stats?.hqaCount   ?? 0,
    mqaCount:   dashboard?.stats?.mqaCount   ?? 0,
    lqaCount:   dashboard?.stats?.lqaCount   ?? 0,
    runsToday:  dashboard?.stats?.runsToday  ?? 0,
    runsTarget: dashboard?.stats?.totalRuns  ?? 0,
  };

  // AI score % — dynamic, not hardcoded
  const totalScored = stats.hqaCount + stats.mqaCount + stats.lqaCount;
  const hqaPct = totalScored > 0 ? Math.round((stats.hqaCount / totalScored) * 100) : 0;

  // Source breakdown — real from API or fall back to sourcesState counts
  const breakdown: { name: string; count: number }[] =
    dashboard?.sourceBreakdown && dashboard.sourceBreakdown.length > 0
      ? dashboard.sourceBreakdown
      : sourcesState.map((s) => ({ name: s.name, count: s.count }));

  const breakdownMax = Math.max(...breakdown.map((b) => b.count), 1);

  // Active run for live log
  const activeRun = runsState.find((r) => r.status === "running");

  // SSE log stream — connect to active run for real-time updates
  const activeRunId = activeRun?.run_id ?? null;
  const { logs: sseLogs, status: sseStatus, connected: sseConnected } = useRunLogStream(activeRunId);

  // Use SSE logs if available, fall back to stored log_entries
  const logLines: Array<{ ts: string; cls: string; msg: string }> =
    sseLogs.length > 0
      ? sseLogs.map((e) => ({
          ts: e.ts ?? new Date().toLocaleTimeString(),
          cls: logClass(e.level),
          msg: e.message,
        }))
      : activeRun?.log_entries?.length
        ? activeRun.log_entries.map((e) => ({
            ts: e.ts ?? new Date().toLocaleTimeString(),
            cls: logClass(e.level),
            msg: e.message,
          }))
        : [];

  // Update run status when SSE completion event arrives
  useEffect(() => {
    if (sseStatus !== "running" && activeRunId) {
      setRunsState((prev) =>
        prev.map((r) =>
          r.run_id === activeRunId ? { ...r, status: sseStatus } : r
        )
      );
      // Refresh dashboard to get updated stats
      dashboardRefetch();
    }
  }, [sseStatus, activeRunId]);

  // Campaign clients for dropdown
  const campaignClients: any[] = campaignClientsDomain?.data ?? [];

  return (
    <div className="pt-2 pb-6 max-w-full text-slate-900">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 px-4 py-2 mb-1 text-xs text-slate-500 border border-primary/15 bg-white rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <span>›</span>
        <a href="#" className="text-primary font-medium hover:text-[#0066b2] transition-colors">Job Mgt</a>
        <span>›</span>
        <span className="text-slate-900 font-semibold">AI Discovery Agent</span>
      </div>

      {/* PAGE HEADER CARD */}
      <div className="relative overflow-hidden flex flex-col items-stretch gap-3 bg-white border border-primary/15 rounded-[14px] px-[22px] py-[18px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] mb-4">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0066b2] via-[#00bff2] to-[#1eb62d]" />

        {/* Top row: icon + title + Run button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#008ED3] to-[#0066B2] text-white shadow-md shadow-cyan-500/20">
              <Bot size={24} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">AI Discovery Agent</div>
              <div className="text-[13px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                Automated job discovery — entries populate client Manual Discovery Tables tagged{" "}
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-bold tracking-wide align-middle bg-primary/[0.06] text-primary border border-primary/25">AUTO DISCOVERY</span>
              </div>
            </div>
          </div>

          <button
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap min-w-[130px] px-4 py-2 rounded-[10px] text-[12.5px] font-semibold text-white border-none bg-gradient-to-br from-[#1eb62d] to-[#16a34a] shadow-[0_3px_12px_rgba(30,182,45,0.3)] transition-all duration-200 disabled:opacity-85 disabled:cursor-not-allowed enabled:hover:-translate-y-px enabled:hover:shadow-[0_5px_16px_rgba(30,182,45,0.4)]"
            onClick={handleRunNow}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} className="fill-current" />
            )}
            {isPending ? "Running…" : "Run Now"}
          </button>
        </div>

        {/* Override inputs row */}
        <div className="flex items-end gap-3 mt-3 pt-3 border-t border-slate-100">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wide">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={overrideKeywords}
              onChange={(e) => setOverrideKeywords(e.target.value)}
              placeholder="Uses client preferences if empty"
              className="w-80 px-3 py-[7px] border border-slate-200 rounded-md bg-white text-slate-900 text-xs transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-slate-500"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wide">
              Location
            </label>
            <input
              type="text"
              value={overrideLocation}
              onChange={(e) => setOverrideLocation(e.target.value)}
              placeholder="Uses client preferences if empty"
              className="w-50 px-3 py-[7px] border border-slate-200 rounded-md bg-white text-slate-900 text-xs transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-slate-500"
              disabled={isPending}
            />
          </div>
          {(overrideKeywords || overrideLocation) && (
            <button
              className="mb-px inline-flex items-center justify-center gap-1.5 px-3 py-[5px] rounded-[10px] text-[11.5px] font-semibold border border-slate-200 bg-white text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-slate-100 hover:text-slate-900 transition-all"
              onClick={() => { setOverrideKeywords(""); setOverrideLocation(""); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ENVIRONMENT BAR */}
      <div className="flex items-center gap-3.5 mb-4 px-[18px] py-3.5 bg-white border border-primary/15 rounded-[14px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] flex-wrap">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <div className={ENV_LABEL}>
            <Server size={12} className="text-gray-400" />
            Environment
          </div>
          <select className={SELECT} value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)}>
            <option>Production</option>
            <option>UAT</option>
            <option>SIT</option>
            <option>IAT</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <div className={ENV_LABEL}>
            <Globe size={12} className="text-gray-400" />
            Jobsite
          </div>
          <select className={SELECT} value={selectedJobsite} onChange={(e) => setSelectedJobsite(e.target.value)}>
            <option>All</option>
            {sourcesState.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Client selector — loaded from campaign management */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <div className={ENV_LABEL}>
            <Building2 size={12} className="text-gray-400" />
            Client
          </div>
          <select className={SELECT} value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
            <option value="All Clients">
              All Clients {campaignClients.length > 0 ? `(${campaignClients.length})` : ""}
            </option>
            {campaignClients.map((c: any) => {
              const clientUser = c.client;
              const displayName = clientUser
                ? `${clientUser.firstName ?? ''} ${clientUser.lastName ?? ''}`.trim() || clientUser.email || `Client ${c.id}`
                : c.fullName ?? c.name ?? c.email ?? `Client ${c.id}`;
              return (
                <option key={c.id ?? c.clientId} value={c.id ?? c.clientId}>
                  {displayName}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <div className={ENV_LABEL}>
            <Calendar size={12} className="text-gray-400" />
            Range
          </div>
          <select className={SELECT} value={selectedRange} onChange={(e) => setSelectedRange(e.target.value)}>
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Custom</option>
          </select>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        {/* Jobs discovered */}
        <div className="relative overflow-hidden bg-white border border-primary/15 rounded-[14px] p-4 px-[18px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,142,211,0.14)]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-[#008ED3]" />
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <span>Last 24 hours</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[#008ED3]">
              <Search size={12} />
            </span>
          </div>
          <div className="text-[28px] font-extrabold leading-[1.1] text-[#008ED3]">
            {stats.totalJobs.toLocaleString()}
          </div>
          <div className="text-[11.5px] text-slate-500 mt-1.5 flex items-center gap-1">Jobs discovered</div>
        </div>

        {/* Unique entries */}
        <div className="relative overflow-hidden bg-white border border-primary/15 rounded-[14px] p-4 px-[18px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,142,211,0.14)]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-[#1EB62D]" />
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <span>After de-duplication</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-[#1EB62D]">
              <CopyCheck size={12} />
            </span>
          </div>
          <div className="text-[28px] font-extrabold leading-[1.1] text-slate-900">{stats.uniqueJobs.toLocaleString()}</div>
          <div className="text-[11.5px] text-slate-500 mt-1.5 flex items-center gap-1">Unique entries written</div>
        </div>

        {/* AI score breakdown — fully dynamic */}
        <div className="relative overflow-hidden bg-white border border-primary/15 rounded-[14px] p-4 px-[18px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,142,211,0.14)]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-[#7C3AED]" />
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <span>AI score breakdown</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50 text-[#7C3AED]">
              <Zap size={12} />
            </span>
          </div>
          <div className="text-[28px] font-extrabold leading-[1.1] text-[#1EB62D]">
            {hqaPct}%
          </div>
          <div className="text-[11.5px] text-slate-500 mt-1.5 flex items-center gap-1">
            <span className={`${PILL} text-[10px]! ${pillClass("hqa")}`}>{stats.hqaCount} HQA</span>
            <span className={`${PILL} text-[10px]! ${pillClass("mqa")}`}>{stats.mqaCount} MQA</span>
            <span className={`${PILL} text-[10px]! ${pillClass("lqa")}`}>{stats.lqaCount} LQA</span>
          </div>
        </div>

        {/* Runs today */}
        <div className="relative overflow-hidden bg-white border border-primary/15 rounded-[14px] p-4 px-[18px] shadow-[0_1px_10px_rgba(0,142,211,0.10)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,142,211,0.14)]">
          <div className="absolute top-0 left-0 w-full h-[3.5px] bg-[#F59E0B]" />
          <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <span>Runs today</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-[#F59E0B]">
              <Clock size={12} />
            </span>
          </div>
          <div className="text-[28px] font-extrabold leading-[1.1] text-slate-900">
            {stats.runsToday}
            <span className="text-sm font-medium text-slate-500"> / {stats.runsTarget}</span>
          </div>
          <div className="text-[11.5px] text-slate-500 mt-1.5 flex items-center gap-1">
            {stats.runsToday > 0 ? `${stats.runsToday} completed today` : "No runs yet"}
          </div>
        </div>
      </div>

      {/* SCHEDULE + SOURCES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* SCHEDULE CARD */}
        <div className={`${CARD} self-stretch h-full`}>
          <div className={CARD_HEADER}>
            <div className={CARD_HEADER_LEFT}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                <Clock size={14} />
              </span>
              <span className={CARD_TITLE}>Schedule</span>
            </div>
            <span className={`${PILL} ${schedule?.enabled ? pillClass("success") : pillClass("killed")}`}>
              <CheckCircle2 size={11} />
              {schedule?.enabled ? "Active" : "Paused"}
            </span>
          </div>
          <div className={CARD_BODY}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Automatic runs</div>
                <div className="text-[11.5px] text-slate-500">Runs on schedule without manual trigger</div>
              </div>
              <div
                className={`relative shrink-0 w-[42px] h-6 rounded-full cursor-pointer transition-colors duration-200 ${schedule?.enabled ? "bg-primary" : "bg-slate-200"}`}
                onClick={() => schedule && updateSchedule.mutate({ enabled: !schedule.enabled })}
              >
                <span
                  className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition-transform duration-200 ${schedule?.enabled ? "translate-x-[18px]" : "translate-x-0"}`}
                />
              </div>
            </div>
            <hr className="border-0 border-t border-slate-100 my-3" />
            <div className="mb-3">
              <div className={`${ENV_LABEL} mb-1.5`}>Run every</div>
              <select
                className={`${SELECT} w-full`}
                value={schedule?.cadence_minutes ?? 360}
                onChange={(e) => updateSchedule.mutate({ cadence_minutes: Number(e.target.value) })}
              >
                <option value={240}>Every 4 hours</option>
                <option value={360}>Every 6 hours</option>
                <option value={480}>Every 8 hours</option>
                <option value={720}>Every 12 hours</option>
                <option value={1440}>Once daily</option>
              </select>
            </div>
            <div className={`${ENV_LABEL} mb-1.5`}>Today&apos;s schedule</div>
            <div className="flex gap-2 flex-wrap mt-2">
              {(() => {
                const cadence = schedule?.cadence_minutes ?? 360;
                const slotsNeeded = Math.ceil(1440 / cadence);
                const now = new Date();
                const nextRun = schedule?.next_run_at ? new Date(schedule.next_run_at) : null;
                const slots = [];
                for (let i = 0; i < slotsNeeded; i++) {
                  const hour = Math.floor((i * cadence) / 60);
                  const timeStr = `${String(hour).padStart(2, "0")}:00`;
                  const slotTime = new Date();
                  slotTime.setHours(hour, 0, 0, 0);
                  const isPast = slotTime < now;
                  const isNext = nextRun && slotTime <= nextRun && slotTime > now;
                  slots.push(
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-semibold border transition-all duration-150 ${
                        isPast
                          ? "bg-[#f0fff1] border-green-200 text-[#1eb62d]"
                          : isNext
                            ? "bg-amber-50 border-amber-200 text-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.15)]"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      {isPast ? "✓ " : isNext ? "● " : ""}{timeStr}
                    </span>
                  );
                }
                return slots;
              })()}
            </div>
            {schedule?.next_run_at && (
              <div className="mt-2 text-[11px] text-slate-500">
                Next: {new Date(schedule.next_run_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} AEST
              </div>
            )}
          </div>
        </div>

        {/* SOURCES CARD */}
        <div className={`${CARD} self-stretch h-full`}>
          <div className={CARD_HEADER}>
            <div className={CARD_HEADER_LEFT}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Globe size={14} />
              </span>
              <span className={CARD_TITLE}>Sources — AU Market</span>
            </div>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
              {sourcesState.length} configured · {activeSourcesCount} active
            </span>
          </div>
          <div className={CARD_BODY}>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
              {sourcesState.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-2 px-3 py-[9px] border border-slate-200 rounded-[10px] text-[12.5px] bg-white cursor-pointer transition-all duration-[180ms] hover:bg-slate-50 hover:border-primary hover:-translate-y-px"
                  onClick={() => handleToggleSource(source.id)}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-all duration-200 ${source.enabled ? "bg-[#1eb62d] shadow-[0_0_0_3px_rgba(30,182,45,0.2)]" : "bg-slate-400"}`} />
                  <span className="font-medium text-slate-700">{source.name}</span>
                  <span className="ml-auto text-[11px] text-slate-500 font-bold bg-slate-100 px-[7px] py-0.5 rounded-full">{source.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RUN HISTORY TABLE */}
      <div className={CARD}>
        <div className={CARD_HEADER}>
          <div className={CARD_HEADER_LEFT}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Activity size={14} />
            </span>
            <span className={CARD_TITLE}>Run History</span>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(["today", "week", "all"] as const).map((f) => (
              <button
                key={f}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  historyFilter === f
                    ? "bg-white text-[#008ED3] shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
                onClick={() => setHistoryFilter(f)}
              >
                {f === "today" ? "Today" : f === "week" ? "This week" : "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Run ID</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Trigger</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Started</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Duration</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Status</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Clients</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Fetched</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">Dedup</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">HQA</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">MQA</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50">LQA</th>
                  <th className="text-left px-3.5 py-2.5 font-semibold text-slate-500 text-[10.5px] uppercase tracking-wide border-b-2 border-slate-100 bg-slate-50" />
                </tr>
              </thead>
              <tbody>
                {runsState.map((run) => (
                  <tr key={run.id} className="hover:bg-primary/[0.02]">
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle font-mono text-[11px] text-slate-500">
                      {run.run_id}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">
                      {run.status === "running" ? (
                        <span className={`${PILL} ${pillClass("running")}`}>● Running</span>
                      ) : run.trigger === "manual" ? (
                        <span className="text-[11px] text-primary font-semibold">Manual</span>
                      ) : (
                        <span className="text-[11px] text-slate-500">{run.trigger}</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.started}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.duration}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">
                      {run.status === "running"  ? <span className={`${PILL} ${pillClass("running")}`}>In progress</span>
                       : run.status === "success" ? <span className={`${PILL} ${pillClass("success")}`}>✓ Success</span>
                       : run.status === "failed"  ? <span className={`${PILL} ${pillClass("failed")}`}>✗ Failed</span>
                       :                           <span className={`${PILL} ${pillClass("killed")}`}>Killed</span>}
                    </td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.clients}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.fetched}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.dedup}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.hqa !== null ? <span className={`${PILL} ${pillClass("hqa")}`}>{run.hqa}</span> : "—"}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.mqa !== null ? <span className={`${PILL} ${pillClass("mqa")}`}>{run.mqa}</span> : "—"}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">{run.lqa !== null ? <span className={`${PILL} ${pillClass("lqa")}`}>{run.lqa}</span> : "—"}</td>
                    <td className="px-3.5 py-2.5 border-b border-slate-100 align-middle text-slate-700">
                      {run.status === "running" ? (
                        <button
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-[5px] rounded-[10px] text-[11.5px] font-semibold border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:border-red-300 transition-all"
                          onClick={() => handleKillRun(run.run_id)}
                        >
                          Kill
                        </button>
                      ) : (
                        <a
                          href="#log-card"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-[5px] rounded-[10px] text-[11.5px] font-semibold border border-slate-200 bg-white text-slate-700 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-slate-100 hover:text-slate-900 transition-all no-underline"
                        >
                          Log
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LIVE LOG TERMINAL CARD */}
      <div className={`${CARD} mt-4`} id="log-card">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900">
          <div className={CARD_HEADER_LEFT}>
            <div className="flex gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
              <Terminal size={14} />
            </span>
            <span className={`${CARD_TITLE} text-white`}>
              Live Log{activeRun ? ` — ${activeRun.run_id}` : " — No active run"}
            </span>
            {activeRun && (
              sseConnected
                ? <span className={`${PILL} ${pillClass("running")}`}>● Streaming</span>
                : <span className={`${PILL} ${pillClass("running")}`}>● Running</span>
            )}
            {activeRun && !sseConnected && sseLogs.length === 0 && (
              <span className={`${PILL} bg-slate-800 text-slate-400`}>connecting…</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {activeRun ? `${activeRun.clients} clients · ${activeSourcesCount} sources` : "Idle"}
          </span>
        </div>
        <div className="px-4 py-3 bg-[#090D16]">
          <div ref={logRef} className="bg-[#090d16] rounded-[10px] px-4 py-3.5 font-mono text-[11.5px] leading-[1.9] max-h-[220px] overflow-y-auto border border-slate-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
            {activeRun ? (
              logLines.length > 0 ? (
                logLines.map((line, i) => (
                  <div key={i} className="flex gap-2.5 border-b border-white/[0.03] last:border-b-0">
                    <span className="text-slate-600 shrink-0 select-none">[{line.ts}]</span>
                    <span className={line.cls}>{line.msg}</span>
                  </div>
                ))
              ) : (
                <div className="flex gap-2.5 border-b border-white/[0.03] last:border-b-0">
                  <span className="text-slate-600 shrink-0 select-none">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-sky-400">Run started — waiting for log data…</span>
                </div>
              )
            ) : (
              <div className="flex gap-2.5 border-b border-white/[0.03] last:border-b-0">
                <span className="text-slate-500">No run in progress. Click &quot;Run Now&quot; to start.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOURCE BREAKDOWN — dynamic, bar widths computed from real data */}
      <div className={`${CARD} mt-4`}>
        <div className={CARD_HEADER}>
          <div className={CARD_HEADER_LEFT}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <BarChart3 size={14} />
            </span>
            <span className={CARD_TITLE}>Source Breakdown — Last 24 Hours</span>
          </div>
        </div>
        <div className={CARD_BODY}>
          {breakdown.length > 0 ? (
            breakdown.map((b) => {
              const pct = breakdownMax > 0 ? (b.count / breakdownMax) * 100 : 0;
              return (
                <div key={b.name} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-b-0">
                  <span className="text-xs font-medium min-w-[100px] text-slate-700">{b.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#008ed3] to-[#00bff2] transition-[width] duration-[400ms]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-bold min-w-[34px] text-right ${b.count === 0 ? "text-slate-400" : "text-slate-900"}`}>
                    {b.count}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-500 py-6">
              No breakdown data yet
            </div>
          )}
        </div>
      </div>

      {/* NOTE BOX */}
      <div className="flex gap-3 mt-4 px-[18px] py-3.5 bg-primary/[0.04] border border-primary/[0.18] rounded-[14px] text-[12.5px] text-slate-700 leading-relaxed">
        <Info size={18} className="text-[#008ED3] shrink-0 mt-0.5" />
        <div>
          <strong>How it works:</strong> Agent-found entries appear on each client&apos;s Manual
          Discovery Table with status{" "}
          <span className="mx-0.5 px-2 py-[3px] rounded-md text-[10.5px] font-semibold bg-sky-100 text-sky-600">Unattended</span>,
          source tagged{" "}
          <span className="mx-0.5 inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-bold tracking-wide align-middle bg-primary/[0.06] text-primary border border-primary/25">AUTO DISCOVERY</span>{" "}
          and &quot;Discovered By&quot; set to <strong>AI Discovery Agent</strong>. The VPC vets
          these entries exactly the same as{" "}
          <span className="mx-0.5 inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-bold tracking-wide align-middle bg-slate-100 text-slate-500 border border-slate-200">MANUAL</span>{" "}
          entries from the DPC. The DPC workflow is not replaced — both channels feed the same table.
        </div>
      </div>
    </div>
  );
}
