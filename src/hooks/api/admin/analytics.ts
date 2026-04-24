import { useMemo } from "react";
import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";

// Type definitions for Admin Analytics Response
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

interface AdminAnalyticsData {
  range: AnalyticsRange;
  metrics: MetricsCount;
  breakdown: AnalyticsBreakdown;
  generatedAt: string;
  subscriptionTiers: SubscriptionTiers;
  userRoleCounts: UserRoleCounts;
}

interface AdminAnalyticsResponse {
  success: boolean;
  message: string;
  data: AdminAnalyticsData;
  statusCode: number;
}

export const useAnalyticsQueries = (options: AdminQueriesOptions) => {
  const {
    fetchAdminAnalytics = false,
    startDate = "",
    endDate = "",
  } = options;

  const adminAnalytics = useFetchData<AdminAnalyticsResponse>({
    method: "GET",
    url: endpoints.ADMIN_ANALYTICS,
    queryKey: ["admin-analytics", startDate, endDate],
    params: {
      from: startDate,
      to: endDate
    },
    enabled: fetchAdminAnalytics,
  });

  return useMemo(() => ({
    adminAnalyticsDomain: {
      data: adminAnalytics.data?.data,
      isLoading: adminAnalytics.isLoading,
      isSuccess: adminAnalytics.isSuccess,
      isError: adminAnalytics.isError,
      error: adminAnalytics.error,
      refetch: adminAnalytics.refetch,
    },
  }), [adminAnalytics]);
};