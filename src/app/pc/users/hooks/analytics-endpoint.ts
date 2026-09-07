import { useMemo } from "react";
import { useFetchData } from "@/hooks/useApi";

// Endpoint URL
export const ADMIN_ANALYTICS_ENDPOINT = "/api/v1/admin/analytics";

// Type Definitions
interface AnalyticsRange {
  from: string;
  to: string;
}

interface MetricsCount {
  successful: number;
  failed: number;
}

interface SubscriptionTier {
  key: string;
  label: string;
  users: number;
}

interface SubscriptionTierTotals {
  sixTierUsers: number;
  activeSubscribers: number;
  activeSubscriptions: number;
}

interface SubscriptionTiers {
  tiers: SubscriptionTier[];
  allPaidTierCounts: Record<string, number>;
  totals: SubscriptionTierTotals;
  generatedAt: string;
}

interface AnalyticsBreakdown {
  plans: MetricsCount;
  users: MetricsCount;
  applications: MetricsCount;
}

interface UserRoleCounts {
  guest: number;
  client: number;
  partner: number;
  sales: number;
  cse: number;
  coach: number;
  admin: number;
  probono: number;
  test: number;
  customer: number;
  technology: number;
  business: number;
  assistant: number;
}

export interface AdminAnalyticsData {
  range: AnalyticsRange;
  metrics: MetricsCount;
  breakdown: AnalyticsBreakdown;
  generatedAt: string;
  subscriptionTiers: SubscriptionTiers;
  userRoleCounts: UserRoleCounts;
}

export interface AdminAnalyticsResponse {
  success: boolean;
  message: string;
  data: AdminAnalyticsData;
  statusCode: number;
}

// Custom Hook for fetching admin analytics
export const useAdminAnalytics = (options: {
  enabled?: boolean;
  startDate?: string;
  endDate?: string;
} = {}) => {
  const { enabled = true, startDate = "", endDate = "" } = options;

  const analyticsQuery = useFetchData<AdminAnalyticsResponse>({
    method: "GET",
    url: ADMIN_ANALYTICS_ENDPOINT,
    queryKey: ["admin-analytics", startDate, endDate],
    params: {
      from: startDate,
      to: endDate
    },
    enabled,
  });

  return useMemo(() => ({
    data: analyticsQuery.data?.data,
    isLoading: analyticsQuery.isLoading,
    isSuccess: analyticsQuery.isSuccess,
    isError: analyticsQuery.isError,
    error: analyticsQuery.error,
    refetch: analyticsQuery.refetch,
  }), [analyticsQuery]);
};