//~ import { Response } from 'express';
//~ import { getServiceLogger } from '../../utils/createLogger';

//~ const logger = getServiceLogger('discovery-sse');

//~ // In-memory registry of connected SSE clients per run
//~ // Key: runId, Value: Set of Response objects
//~ const sseClients = new Map<string, Set<Response>>();

//~ // Per-run heartbeat interval handles for cleanup
//~ const heartbeatTimers = new Map<string, NodeJS.Timeout>();

//~ const HEARTBEAT_INTERVAL_MS = 15_000; // 15 seconds

//~ /** Safely write to an SSE response; returns false if the client is dead. */
//~ function safeWrite(res: Response, data: string): boolean {
//~   try {
//~     res.write(data);
//~     return true;
//~   } catch {
//~     return false;
//~   }
//~ }

//~ /** Prune dead connections from a run's client set. */
//~ function pruneDeadClients(runId: string): void {
//~   const clients = sseClients.get(runId);
//~   if (!clients) return;
//~   for (const res of clients) {
//~     if (res.destroyed || res.writableEnded) {
//~       clients.delete(res);
//~     }
//~   }
//~   if (clients.size === 0) {
//~     sseClients.delete(runId);
//~     stopHeartbeat(runId);
//~   }
//~ }

//~ /** Start sending SSE keepalive comments to prevent proxy/LB idle timeouts. */
//~ function startHeartbeat(runId: string): void {
//~   if (heartbeatTimers.has(runId)) return;
//~   const timer = setInterval(() => {
//~     const clients = sseClients.get(runId);
//~     if (!clients || clients.size === 0) {
//~       stopHeartbeat(runId);
//~       return;
//~     }
//~     for (const res of clients) {
//~       if (!safeWrite(res, `:keepalive\n\n`)) {
//~         clients.delete(res);
//~       }
//~     }
//~     // Also prune any destroyed connections spotted during heartbeat
//~     pruneDeadClients(runId);
//~   }, HEARTBEAT_INTERVAL_MS);
//~   // Unref so the timer doesn't keep the process alive
//~   if (timer.unref) timer.unref();
//~   heartbeatTimers.set(runId, timer);
//~ }

//~ function stopHeartbeat(runId: string): void {
//~   const timer = heartbeatTimers.get(runId);
//~   if (timer) {
//~     clearInterval(timer);
//~     heartbeatTimers.delete(runId);
//~   }
//~ }

//~ export function registerClient(runId: string, res: Response): void {
//~   if (!sseClients.has(runId)) {
//~     sseClients.set(runId, new Set());
//~   }
//~   sseClients.get(runId)!.add(res);
//~   // Start heartbeat on first client for this run
//~   if (sseClients.get(runId)!.size === 1) {
//~     startHeartbeat(runId);
//~   }
//~ }

//~ export function removeClient(runId: string, res: Response): void {
//~   const clients = sseClients.get(runId);
//~   if (clients) {
//~     clients.delete(res);
//~     if (clients.size === 0) {
//~       sseClients.delete(runId);
//~       stopHeartbeat(runId);
//~     }
//~   }
//~ }

//~ export function pushLogEntry(runId: string, entry: { ts: string; level: string; message: string }): void {
//~   const clients = sseClients.get(runId);
//~   if (!clients || clients.size === 0) return;
//~   const data = JSON.stringify({ type: 'log', ...entry });
//~   for (const res of clients) {
//~     if (!safeWrite(res, `data: ${data}\n\n`)) {
//~       clients.delete(res);
//~     }
//~   }
//~   pruneDeadClients(runId);
//~ }

//~ export function pushRunComplete(runId: string, status: string, stats: Record<string, any>): void {
//~   const clients = sseClients.get(runId);
//~   if (!clients || clients.size === 0) return;
//~   const data = JSON.stringify({ type: 'complete', runId, status, ...stats });
//~   for (const res of clients) {
//~     safeWrite(res, `data: ${data}\n\n`);
//~     try { res.end(); } catch { /* already dead */ }
//~   }
//~   sseClients.delete(runId);
//~   stopHeartbeat(runId);
//~ }

//~ export interface MatchEntry {
//~   jobTitle: string;
//~   company: string;
//~   location: string;
//~   clientName: string;
//~   score: number;
//~   rationale: string;
//~   source: string;
//~ }

//~ export function pushMatchEntry(runId: string, match: MatchEntry): void {
//~   const clients = sseClients.get(runId);
//~   if (!clients || clients.size === 0) return;
//~   const data = JSON.stringify({ type: 'match', ...match });
//~   for (const res of clients) {
//~     if (!safeWrite(res, `data: ${data}\n\n`)) {
//~       clients.delete(res);
//~     }
//~   }
//~   pruneDeadClients(runId);
//~ }

//~ /** Clean up all SSE state for a run (call from completeRun / reapStaleRuns). */
//~ export function cleanupRun(runId: string): void {
//~   stopHeartbeat(runId);
//~   const clients = sseClients.get(runId);
//~   if (clients) {
//~     for (const res of clients) {
//~       try { res.end(); } catch { /* already dead */ }
//~     }
//~     sseClients.delete(runId);
//~   }
//~ }
