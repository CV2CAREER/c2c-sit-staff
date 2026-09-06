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
import "./discovery-agent.css";

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



// ─── Log level helper ─────────────────────────────────────────────────────────
function logClass(level?: string) {
  switch (level?.toLowerCase()) {
    case "ok":      return "log-ok";
    case "warn":    return "log-warn";
    case "info":    return "log-info";
    default:        return "log-dim";
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
    <div className="page">
      {/* BREADCRUMB */}
      <div className="breadcrumb">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <span>›</span>
        <a href="#">Job Mgt</a>
        <span>›</span>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>AI Discovery Agent</span>
      </div>

      {/* PAGE HEADER CARD */}
      <div className="page-header-card" style={{ flexDirection: "column", alignItems: "stretch" }}>
        {/* Top row: icon + title + Run button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#008ED3] to-[#0066B2] text-white shadow-md shadow-cyan-500/20">
              <Bot size={24} />
            </div>
            <div>
              <div className="page-title">AI Discovery Agent</div>
              <div className="page-subtitle">
                Automated job discovery — entries populate client Manual Discovery Tables tagged{" "}
                <span className="source-tag auto">AUTO DISCOVERY</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-run"
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
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={overrideKeywords}
              onChange={(e) => setOverrideKeywords(e.target.value)}
              placeholder="Uses client preferences if empty"
              className="discovery-input"
              style={{ width: 320 }}
              disabled={isPending}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Location
            </label>
            <input
              type="text"
              value={overrideLocation}
              onChange={(e) => setOverrideLocation(e.target.value)}
              placeholder="Uses client preferences if empty"
              className="discovery-input"
              style={{ width: 200 }}
              disabled={isPending}
            />
          </div>
          {(overrideKeywords || overrideLocation) && (
            <button
              className="btn btn-sm"
              onClick={() => { setOverrideKeywords(""); setOverrideLocation(""); }}
              style={{ marginBottom: 1 }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ENVIRONMENT BAR */}
      <div className="env-bar">
        <div className="env-item">
          <div className="env-label">
            <Server size={12} className="text-gray-400" />
            Environment
          </div>
          <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)}>
            <option>Production</option>
            <option>UAT</option>
            <option>SIT</option>
            <option>IAT</option>
          </select>
        </div>

        <div className="env-item">
          <div className="env-label">
            <Globe size={12} className="text-gray-400" />
            Jobsite
          </div>
          <select value={selectedJobsite} onChange={(e) => setSelectedJobsite(e.target.value)}>
            <option>All</option>
            {sourcesState.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Client selector — loaded from campaign management */}
        <div className="env-item">
          <div className="env-label">
            <Building2 size={12} className="text-gray-400" />
            Client
          </div>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
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

        <div className="env-item">
          <div className="env-label">
            <Calendar size={12} className="text-gray-400" />
            Range
          </div>
          <select value={selectedRange} onChange={(e) => setSelectedRange(e.target.value)}>
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Custom</option>
          </select>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="stats-row">
        {/* Jobs discovered */}
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#008ED3" }} />
          <div className="stat-label">
            <span>Last 24 hours</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[#008ED3]">
              <Search size={12} />
            </span>
          </div>
          <div className="stat-value" style={{ color: "#008ED3" }}>
            {stats.totalJobs.toLocaleString()}
          </div>
          <div className="stat-sub">Jobs discovered</div>
        </div>

        {/* Unique entries */}
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#1EB62D" }} />
          <div className="stat-label">
            <span>After de-duplication</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-[#1EB62D]">
              <CopyCheck size={12} />
            </span>
          </div>
          <div className="stat-value">{stats.uniqueJobs.toLocaleString()}</div>
          <div className="stat-sub">Unique entries written</div>
        </div>

        {/* AI score breakdown — fully dynamic */}
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#7C3AED" }} />
          <div className="stat-label">
            <span>AI score breakdown</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50 text-[#7C3AED]">
              <Zap size={12} />
            </span>
          </div>
          <div className="stat-value" style={{ color: "#1EB62D" }}>
            {hqaPct}%
          </div>
          <div className="stat-sub">
            <span className="pill pill-hqa" style={{ fontSize: 10 }}>{stats.hqaCount} HQA</span>
            <span className="pill pill-mqa" style={{ fontSize: 10 }}>{stats.mqaCount} MQA</span>
            <span className="pill pill-lqa" style={{ fontSize: 10 }}>{stats.lqaCount} LQA</span>
          </div>
        </div>

        {/* Runs today */}
        <div className="stat-card">
          <div className="stat-card-accent" style={{ background: "#F59E0B" }} />
          <div className="stat-label">
            <span>Runs today</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-[#F59E0B]">
              <Clock size={12} />
            </span>
          </div>
          <div className="stat-value">
            {stats.runsToday}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-muted)" }}>
              {" "}/ {stats.runsTarget}
            </span>
          </div>
          <div className="stat-sub">
            {stats.runsToday > 0 ? `${stats.runsToday} completed today` : "No runs yet"}
          </div>
        </div>
      </div>

      {/* SCHEDULE + SOURCES GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* SCHEDULE CARD */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                <Clock size={14} />
              </span>
              <span className="card-title">Schedule</span>
            </div>
            <span className={`pill ${schedule?.enabled ? "pill-success" : "pill-killed"}`}>
              <CheckCircle2 size={11} />
              {schedule?.enabled ? "Active" : "Paused"}
            </span>
          </div>
          <div className="card-body">
            <div className="toggle-row">
              <div>
                <div className="toggle-main">Automatic runs</div>
                <div className="toggle-sub">Runs on schedule without manual trigger</div>
              </div>
              <div
                className={`toggle-switch ${schedule?.enabled ? "on" : ""}`}
                onClick={() => schedule && updateSchedule.mutate({ enabled: !schedule.enabled })}
              />
            </div>
            <hr className="divider" />
            <div style={{ marginBottom: 12 }}>
              <div className="env-label" style={{ marginBottom: 6 }}>Run every</div>
              <select
                value={schedule?.cadence_minutes ?? 360}
                onChange={(e) => updateSchedule.mutate({ cadence_minutes: Number(e.target.value) })}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 12.5,
                  fontFamily: "var(--font)",
                  width: "100%",
                  background: "var(--gray-50)",
                }}
              >
                <option value={240}>Every 4 hours</option>
                <option value={360}>Every 6 hours</option>
                <option value={480}>Every 8 hours</option>
                <option value={720}>Every 12 hours</option>
                <option value={1440}>Once daily</option>
              </select>
            </div>
            <div className="env-label" style={{ marginBottom: 6 }}>Today&apos;s schedule</div>
            <div className="schedule-slots">
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
                      className={`slot-chip ${isPast ? "done" : isNext ? "next" : ""}`}
                    >
                      {isPast ? "✓ " : isNext ? "● " : ""}{timeStr}
                    </span>
                  );
                }
                return slots;
              })()}
            </div>
            {schedule?.next_run_at && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                Next: {new Date(schedule.next_run_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} AEST
              </div>
            )}
          </div>
        </div>

        {/* SOURCES CARD */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Globe size={14} />
              </span>
              <span className="card-title">Sources — AU Market</span>
            </div>
            <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
              {sourcesState.length} configured · {activeSourcesCount} active
            </span>
          </div>
          <div className="card-body">
            <div className="source-list">
              {sourcesState.map((source) => (
                <div
                  key={source.id}
                  className="source-chip"
                  onClick={() => handleToggleSource(source.id)}
                >
                  <span className={`source-dot ${source.enabled ? "on" : "off"}`} />
                  <span className="source-name">{source.name}</span>
                  <span className="source-count">{source.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RUN HISTORY TABLE */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Activity size={14} />
            </span>
            <span className="card-title">Run History</span>
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
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Trigger</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Clients</th>
                  <th>Fetched</th>
                  <th>Dedup</th>
                  <th>HQA</th>
                  <th>MQA</th>
                  <th>LQA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {runsState.map((run) => (
                  <tr key={run.id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-muted)" }}>
                      {run.run_id}
                    </td>
                    <td>
                      {run.status === "running" ? (
                        <span className="pill pill-running">● Running</span>
                      ) : run.trigger === "manual" ? (
                        <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>Manual</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{run.trigger}</span>
                      )}
                    </td>
                    <td>{run.started}</td>
                    <td>{run.duration}</td>
                    <td>
                      {run.status === "running"  ? <span className="pill pill-running">In progress</span>
                       : run.status === "success" ? <span className="pill pill-success">✓ Success</span>
                       : run.status === "failed"  ? <span className="pill pill-failed">✗ Failed</span>
                       :                           <span className="pill pill-killed">Killed</span>}
                    </td>
                    <td>{run.clients}</td>
                    <td>{run.fetched}</td>
                    <td>{run.dedup}</td>
                    <td>{run.hqa !== null ? <span className="pill pill-hqa">{run.hqa}</span> : "—"}</td>
                    <td>{run.mqa !== null ? <span className="pill pill-mqa">{run.mqa}</span> : "—"}</td>
                    <td>{run.lqa !== null ? <span className="pill pill-lqa">{run.lqa}</span> : "—"}</td>
                    <td>
                      {run.status === "running" ? (
                        <button className="btn btn-sm btn-danger" onClick={() => handleKillRun(run.run_id)}>Kill</button>
                      ) : (
                        <a href="#log-card" className="btn btn-sm">Log</a>
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
      <div className="card" id="log-card" style={{ marginTop: 16 }}>
        <div className="card-header" style={{ background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
          <div className="card-header-left">
            <div className="flex gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-cyan-400">
              <Terminal size={14} />
            </span>
            <span className="card-title text-white">
              Live Log{activeRun ? ` — ${activeRun.run_id}` : " — No active run"}
            </span>
            {activeRun && (
              sseConnected
                ? <span className="pill pill-running">● Streaming</span>
                : <span className="pill pill-running">● Running</span>
            )}
            {activeRun && !sseConnected && sseLogs.length === 0 && (
              <span className="pill" style={{ background: "#1E293B", color: "#94A3B8" }}>connecting…</span>
            )}
          </div>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            {activeRun ? `${activeRun.clients} clients · ${activeSourcesCount} sources` : "Idle"}
          </span>
        </div>
        <div className="card-body" style={{ padding: "12px 16px", background: "#090D16" }}>
          <div className="log-panel" ref={logRef}>
            {activeRun ? (
              logLines.length > 0 ? (
                logLines.map((line, i) => (
                  <div key={i} className="log-line">
                    <span className="log-ts">[{line.ts}]</span>
                    <span className={line.cls}>{line.msg}</span>
                  </div>
                ))
              ) : (
                <div className="log-line">
                  <span className="log-ts">[{new Date().toLocaleTimeString()}]</span>
                  <span className="log-info">Run started — waiting for log data…</span>
                </div>
              )
            ) : (
              <div className="log-line">
                <span className="log-dim">No run in progress. Click &quot;Run Now&quot; to start.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SOURCE BREAKDOWN — dynamic, bar widths computed from real data */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-header-left">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <BarChart3 size={14} />
            </span>
            <span className="card-title">Source Breakdown — Last 24 Hours</span>
          </div>
        </div>
        <div className="card-body">
          {breakdown.length > 0 ? (
            breakdown.map((b) => {
              const pct = breakdownMax > 0 ? (b.count / breakdownMax) * 100 : 0;
              return (
                <div key={b.name} className="breakdown-row">
                  <span className="breakdown-label">{b.name}</span>
                  <div className="breakdown-bar-bg">
                    <div className="breakdown-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span
                    className="breakdown-count"
                    style={b.count === 0 ? { color: "var(--gray-400)" } : {}}
                  >
                    {b.count}
                  </span>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
              No breakdown data yet
            </div>
          )}
        </div>
      </div>

      {/* NOTE BOX */}
      <div className="note-box" style={{ marginTop: 16 }}>
        <Info size={18} className="text-[#008ED3] shrink-0 mt-0.5" />
        <div>
          <strong>How it works:</strong> Agent-found entries appear on each client&apos;s Manual
          Discovery Table with status{" "}
          <span className="mdt-status unattended" style={{ margin: "0 2px" }}>Unattended</span>,
          source tagged{" "}
          <span className="source-tag auto" style={{ margin: "0 2px" }}>AUTO DISCOVERY</span>,
          and &quot;Discovered By&quot; set to <strong>AI Discovery Agent</strong>. The VPC vets
          these entries exactly the same as{" "}
          <span className="source-tag manual" style={{ margin: "0 2px" }}>MANUAL</span>{" "}
          entries from the DPC. The DPC workflow is not replaced — both channels feed the same table.
        </div>
      </div>
    </div>
  );
}
