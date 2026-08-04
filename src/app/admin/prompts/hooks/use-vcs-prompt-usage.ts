import { useMemo } from "react";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

export interface VcsPromptUsageSummaryRow {
  key: string;
  version: string | null;
  totalCalls: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  avgPromptLength: number;
  avgResponseLength: number;
  successRate: number;
  lastRunAt: string;
}

// GET /api/v1/admin/prompts/usage/summary — per-key AI performance snapshot
export const useVcsPromptUsageSummary = (enabled = true) => {
  return useFetchData<VcsPromptUsageSummaryRow[]>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPT_USAGE_SUMMARY,
    queryKey: ["vcs-prompt-usage-summary"],
    enabled,
  });
};

export interface VcsPromptUsageLogRow {
  id: string;
  key: string;
  vcsId: string | null;
  promptId: string | null;
  version: string | null;
  promptLength: number;
  responseLength: number | null;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  model: string | null;
  createdAt: string;
}

export interface VcsPromptUsageLogsData {
  rows: VcsPromptUsageLogRow[];
  count: number;
  page: number;
  limit: number;
}

// GET /api/v1/admin/prompts/usage?key=...&page=...&limit=...
export const useVcsPromptUsageLogs = (
  options: { key?: string; page?: number; limit?: number; enabled?: boolean } = {},
) => {
  const { key, page = 1, limit = 50, enabled = true } = options;

  const params: Record<string, any> = { page, limit };
  if (key) params.key = key;

  const queryKey = useMemo(
    () => ["vcs-prompt-usage-logs", key ?? null, page, limit],
    [key, page, limit],
  );

  return useFetchData<VcsPromptUsageLogsData>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPT_USAGE_LOGS,
    queryKey,
    params,
    enabled,
  });
};
