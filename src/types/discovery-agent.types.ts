export interface DiscoverySource {
  id: string;
  name: string;
  slug: string;
  route: string;
  permission_outcome: string | null;
  evidence: string | null;
  api_key: string | null;
  app_id: string | null;
  cadence_minutes: number;
  enabled: boolean;
  last_fetched_at: string | null;
  config: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryRun {
  id: string;
  run_id: string;
  trigger: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  clients_count: number | null;
  fetched_count: number | null;
  dedup_count: number | null;
  hqa_count: number | null;
  mqa_count: number | null;
  lqa_count: number | null;
  tokens_used: number | null;
  ai_request_count: number | null;
  log_entries: Record<string, any>[] | null;
  error_message: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryAiUsageStats {
  tokensThisMonth: number;
  requestsThisMonth: number;
  estimatedMonthlyCostUsd: number;
  projectedCostAt3xVolumeUsd: number;
  costPer1mTokensUsd: number;
}

export interface DiscoveryDashboardStats {
  totalJobs: number;
  uniqueJobs: number;
  hqaCount: number;
  mqaCount: number;
  lqaCount: number;
  totalRuns: number;
  runsToday: number;
  sourcesActive: number;
  sourcesTotal: number;
  aiUsage: DiscoveryAiUsageStats;
}

export interface DiscoverySourceBreakdown {
  name: string;
  count: number;
}

export interface DiscoveryDashboard {
  stats: DiscoveryDashboardStats;
  sources: DiscoverySource[];
  runs: DiscoveryRun[];
  sourceBreakdown: DiscoverySourceBreakdown[];
}

export interface DiscoverySchedule {
  id: string;
  enabled: boolean;
  cadence_minutes: number;
  next_run_at: string | null;
  last_run_at: string | null;
  createdAt: string;
  updatedAt: string;
}
