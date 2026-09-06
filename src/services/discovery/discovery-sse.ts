import { Response } from 'express';

// In-memory registry of connected SSE clients per run
// Key: runId, Value: Set of Response objects
const sseClients = new Map<string, Set<Response>>();

export function registerClient(runId: string, res: Response): void {
  if (!sseClients.has(runId)) {
    sseClients.set(runId, new Set());
  }
  sseClients.get(runId)!.add(res);
}

export function removeClient(runId: string, res: Response): void {
  const clients = sseClients.get(runId);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) sseClients.delete(runId);
  }
}

export function pushLogEntry(runId: string, entry: { ts: string; level: string; message: string }): void {
  const clients = sseClients.get(runId);
  if (!clients || clients.size === 0) return;
  const data = JSON.stringify({ type: 'log', ...entry });
  for (const res of clients) {
    res.write(`data: ${data}\n\n`);
  }
}

export function pushRunComplete(runId: string, status: string, stats: Record<string, any>): void {
  const clients = sseClients.get(runId);
  if (!clients || clients.size === 0) return;
  const data = JSON.stringify({ type: 'complete', runId, status, ...stats });
  for (const res of clients) {
    res.write(`data: ${data}\n\n`);
    res.end();
  }
  sseClients.delete(runId);
}

export function getClientCount(runId: string): number {
  return sseClients.get(runId)?.size || 0;
}
