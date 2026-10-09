//~ import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
//~ import { useEffect, useState, useRef, useCallback } from "react";
//~ import { toast } from "react-hot-toast";
//~ import axiosInstance, { getStoredAccessToken } from "@/services/api-client";
//~ import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
//~ import axios from "axios";
//~ import { ADMIN_DISCOVERY_AGENT } from "@/constants/apiEndpoints/admin.endpoint";
//~ import type {
//~   DiscoveryDashboard,
//~   DiscoveryRun,
//~   DiscoverySource,
//~   DiscoverySchedule,
//~ } from "@/types/discovery-agent.types";

//~ const TOAST_ID = "discovery-agent-action";

//~ const toApiError = (error: unknown): ApiError => {
//~   if (axios.isAxiosError(error) && error.response?.data) {
//~     return error.response.data as ApiError;
//~   }
//~   return {
//~     success: false,
//~     message: error instanceof Error ? error.message : "Unexpected error",
//~     data: null,
//~     statusCode: 500,
//~   };
//~ };

//~ // ─── GET Dashboard ───────────────────────────────────────────────
//~ export function useDiscoveryDashboard() {
//~   return useQuery<DiscoveryDashboard>({
//~     queryKey: ["discovery-dashboard"],
//~     queryFn: async () => {
//~       const res = await axiosInstance.get(ADMIN_DISCOVERY_AGENT);
//~       return res.data?.data;
//~     },
//~     refetchInterval: 30_000,
//~   });
//~ }

//~ // ─── GET Sources ─────────────────────────────────────────────────
//~ export function useDiscoverySources() {
//~   return useQuery<DiscoverySource[]>({
//~     queryKey: ["discovery-dashboard", "sources"],
//~     queryFn: async () => {
//~       const res = await axiosInstance.get(`${ADMIN_DISCOVERY_AGENT}/sources`);
//~       return res.data?.data;
//~     },
//~   });
//~ }

//~ // ─── GET Run History ─────────────────────────────────────────────
//~ export function useDiscoveryRuns(limit = 20, filter?: "today" | "week" | "all") {
//~   return useQuery<DiscoveryRun[]>({
//~     queryKey: ["discovery-dashboard", "runs", filter],
//~     queryFn: async () => {
//~       const res = await axiosInstance.get(`${ADMIN_DISCOVERY_AGENT}/runs`, {
//~         params: { limit, filter },
//~       });
//~       return res.data?.data;
//~     },
//~   });
//~ }

//~ // ─── POST Trigger Run ────────────────────────────────────────────
//~ export function useTriggerDiscoveryRun() {
//~   const queryClient = useQueryClient();

//~   return useMutation<
//~     ApiSuccess<{ run_id: string; status: string }>,
//~     ApiError,
//~     {
//~       source_slug?: string;
//~       keywords?: string[];
//~       location?: string;
//~       country?: string;
//~     }
//~   >({
//~     mutationKey: ["discovery-trigger-run"],
//~     mutationFn: async (payload) => {
//~       const res = await axiosInstance.post(`${ADMIN_DISCOVERY_AGENT}/run`, payload);
//~       return res.data;
//~     },
//~     onSuccess: (data) => {
//~       toast.success(`Discovery run started: ${data.data?.run_id}`, { id: TOAST_ID });
//~       queryClient.invalidateQueries({ queryKey: ["discovery-dashboard"] });
//~     },
//~     onError: (error) => {
//~       const apiErr = toApiError(error);
//~       toast.error(apiErr.message || "Failed to start discovery run", { id: TOAST_ID });
//~     },
//~   });
//~ }

//~ // ─── POST Trigger Run All ──────────────────────────────────────
//~ export function useTriggerDiscoveryRunAll() {
//~   const queryClient = useQueryClient();

//~   return useMutation<
//~     ApiSuccess<{ run_id: string; status: string; sources_count: number }>,
//~     ApiError,
//~     {
//~       keywords?: string[];
//~       location?: string;
//~       country?: string;
//~     }
//~   >({
//~     mutationKey: ["discovery-trigger-run-all"],
//~     mutationFn: async (payload) => {
//~       const res = await axiosInstance.post(`${ADMIN_DISCOVERY_AGENT}/run-all`, payload);
//~       return res.data;
//~     },
//~     onSuccess: (data) => {
//~       toast.success(`Discovery run started for all active sources: ${data.data?.run_id}`, { id: TOAST_ID });
//~       queryClient.invalidateQueries({ queryKey: ["discovery-dashboard"] });
//~     },
//~     onError: (error) => {
//~       const apiErr = toApiError(error);
//~       toast.error(apiErr.message || "Failed to start discovery run", { id: TOAST_ID });
//~     },
//~   });
//~ }

//~ // ─── PATCH Toggle Source ─────────────────────────────────────────
//~ export function useToggleDiscoverySource() {
//~   const queryClient = useQueryClient();

//~   return useMutation<
//~     ApiSuccess<DiscoverySource>,
//~     ApiError,
//~     string
//~   >({
//~     mutationKey: ["discovery-toggle-source"],
//~     mutationFn: async (sourceId: string) => {
//~       const res = await axiosInstance.patch(`${ADMIN_DISCOVERY_AGENT}/sources/${sourceId}/toggle`);
//~       return res.data;
//~     },
//~     onSuccess: (data) => {
//~       const enabled = data.data?.enabled;
//~       toast.success(`Source ${enabled ? "resumed" : "paused"}`, { id: TOAST_ID });
//~       queryClient.invalidateQueries({ queryKey: ["discovery-dashboard"] });
//~     },
//~     onError: (error) => {
//~       const apiErr = toApiError(error);
//~       toast.error(apiErr.message || "Failed to toggle source", { id: TOAST_ID });
//~     },
//~   });
//~ }

//~ // ─── GET Schedule ────────────────────────────────────────────────
//~ export function useDiscoverySchedule() {
//~   return useQuery<DiscoverySchedule>({
//~     queryKey: ["discovery-schedule"],
//~     queryFn: async () => {
//~       const res = await axiosInstance.get(`${ADMIN_DISCOVERY_AGENT}/schedule`);
//~       return res.data?.data;
//~     },
//~   });
//~ }

//~ // ─── PATCH Update Schedule ──────────────────────────────────────
//~ export function useUpdateDiscoverySchedule() {
//~   const queryClient = useQueryClient();

//~   return useMutation<
//~     ApiSuccess<DiscoverySchedule>,
//~     ApiError,
//~     { enabled?: boolean; cadence_minutes?: number }
//~   >({
//~     mutationKey: ["discovery-update-schedule"],
//~     mutationFn: async (payload) => {
//~       const res = await axiosInstance.patch(`${ADMIN_DISCOVERY_AGENT}/schedule`, payload);
//~       return res.data;
//~     },
//~     onSuccess: () => {
//~       toast.success("Schedule updated", { id: TOAST_ID });
//~       queryClient.invalidateQueries({ queryKey: ["discovery-schedule"] });
//~     },
//~     onError: (error) => {
//~       const apiErr = toApiError(error);
//~       toast.error(apiErr.message || "Failed to update schedule", { id: TOAST_ID });
//~     },
//~   });
//~ }

//~ // ─── POST Kill Run ──────────────────────────────────────────────
//~ export function useKillDiscoveryRun() {
//~   const queryClient = useQueryClient();

//~   return useMutation<
//~     ApiSuccess<{ run_id: string; status: string }>,
//~     ApiError,
//~     string
//~   >({
//~     mutationKey: ["discovery-kill-run"],
//~     mutationFn: async (runId: string) => {
//~       const res = await axiosInstance.post(`${ADMIN_DISCOVERY_AGENT}/runs/${runId}/kill`);
//~       return res.data;
//~     },
//~     onSuccess: (data) => {
//~       toast.success(`Run ${data.data?.run_id} killed`, { id: TOAST_ID });
//~       queryClient.invalidateQueries({ queryKey: ["discovery-dashboard"] });
//~       queryClient.invalidateQueries({ queryKey: ["discovery-dashboard", "runs"] });
//~     },
//~     onError: (error) => {
//~       const apiErr = toApiError(error);
//~       toast.error(apiErr.message || "Failed to kill run", { id: TOAST_ID });
//~     },
//~   });
//~ }

//~ // ─── SSE Log Stream ─────────────────────────────────────────────
//~ export interface LogEntry {
//~   ts: string;
//~   level: string;
//~   message: string;
//~ }

//~ export interface RunCompleteEvent {
//~   type: "complete";
//~   runId: string;
//~   status: string;
//~   duration_ms?: number;
//~   clients_count?: number;
//~   fetched_count?: number;
//~   dedup_count?: number;
//~   hqa_count?: number;
//~   mqa_count?: number;
//~   lqa_count?: number;
//~ }

//~ export function useRunLogStream(runId: string | null) {
//~   const [logs, setLogs] = useState<LogEntry[]>([]);
//~   const [status, setStatus] = useState<string>("running");
//~   const [connected, setConnected] = useState(false);
//~   const abortRef = useRef<AbortController | null>(null);

//~   useEffect(() => {
//~     if (!runId) {
//~       setLogs([]);
//~       setStatus("running");
//~       setConnected(false);
//~       return;
//~     }

//~     setLogs([]);
//~     setStatus("running");
//~     setConnected(false);

//~     const token = getStoredAccessToken();
//~     const baseUrl = (axiosInstance.defaults.baseURL || "").replace(/\/+$/, "");
//~     const apiPath = ADMIN_DISCOVERY_AGENT.replace(/^\/+/, "");
//~     const safeRunId = encodeURIComponent(runId);
//~     const url = `${baseUrl}/${apiPath}/runs/${safeRunId}/logs/stream`;
//~     const abortController = new AbortController();
//~     abortRef.current = abortController;

//~     const headers: Record<string, string> = { "Accept": "text/event-stream" };
//~     if (token) headers["Authorization"] = `Bearer ${token}`;

//~     fetch(url, { headers, signal: abortController.signal, credentials: "include" })
//~       .then(async (response) => {
//~         if (!response.ok) {
//~           console.error(`[SSE] HTTP ${response.status}`);
//~           setConnected(false);
//~           return;
//~         }
//~         setConnected(true);
//~         const reader = response.body?.getReader();
//~         if (!reader) return;
//~         const decoder = new TextDecoder();
//~         let buffer = "";

//~         while (true) {
//~           const { done, value } = await reader.read();
//~           if (done) break;
//~           buffer += decoder.decode(value, { stream: true });

//~           const lines = buffer.split("\n");
//~           buffer = lines.pop() || "";

//~           for (const line of lines) {
//~             if (!line.startsWith("data: ")) continue;
//~             const payload = line.slice(6);
//~             try {
//~               const data = JSON.parse(payload);
//~               if (data.type === "complete") {
//~                 setStatus(data.status);
//~                 setConnected(false);
//~               } else if (data.type === "log") {
//~                 setLogs((prev) => [...prev, { ts: data.ts, level: data.level, message: data.message }]);
//~               }
//~             } catch { /* skip parse errors */ }
//~           }
//~         }
//~       })
//~       .catch((err) => {
//~         if (err.name !== "AbortError") {
//~           console.error("[SSE] fetch error:", err);
//~         }
//~         setConnected(false);
//~       });

//~     return () => {
//~       abortController.abort();
//~       abortRef.current = null;
//~     };
//~   }, [runId]);

//~   const clearLogs = useCallback(() => {
//~     setLogs([]);
//~   }, []);

//~   return { logs, status, connected, clearLogs };
//~ }
