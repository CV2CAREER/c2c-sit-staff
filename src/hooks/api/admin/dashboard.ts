import { useMemo } from "react";
import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions, ApplicationsPeriodBreakdown, ApplicationsPeriodStat, PipelineLists, PipelineStats, VaAllocationsResponse } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
// Same rolling-window definitions used by the pipeline-stats backend
// (today/week/month/quarter/year, trailing from "now") so the two widgets
// stay consistent with each other.
const PERIOD_LOOKBACK_MS = {
  today: DAY_MS,
  week: 7 * DAY_MS,
  month: 30 * DAY_MS,
  quarter: 90 * DAY_MS,
  year: 365 * DAY_MS,
} as const;

const extractApplicationsPeriodStat = (payload: any): ApplicationsPeriodStat => {
  const data = payload?.data;
  const appBreakdown = data?.breakdown?.applications;
  const successful = appBreakdown?.successful || 0;
  const failed = appBreakdown?.failed || 0;
  return {
    total: data?.totalApplications ?? (successful + failed),
    successful,
    failed,
  };
};

const normalizeApplicationCounts = (payload: any) => {
  const source = payload?.data ?? payload;

  // Consolidated analytics payload
  if (source?.breakdown?.applications) {
    return {
      totalCount: source.totalApplications ?? (source.breakdown.applications.total ?? (source.breakdown.applications.successful + source.breakdown.applications.failed)),
      successCount: source.breakdown.applications.successful || 0,
      failedCount: source.breakdown.applications.failed || 0,
    };
  }

  const summary =
    source?.metrics ??
    source?.summary ??
    source?.counts ??
    source?.totals ??
    source;

  const successCount =
    summary?.successful ??
    summary?.success ??
    summary?.successCount ??
    summary?.completed ??
    0;

  const failedCount =
    summary?.failed ??
    summary?.failure ??
    summary?.failedCount ??
    summary?.rejected ??
    0;

  return {
    totalCount: (source?.totalApplications ?? 0) || (successCount + failedCount),
    successCount,
    failedCount,
  };
};

export const useDashboardQueries = (options: AdminQueriesOptions) => {
  const {
    fetchVaAllocations = false,
    fetchMilestoneStats = false,
    fetchOnboardedClients = false,
    fetchJobsiteStats = false,
    fetchInflightClients = false,
    fetchApplicationStats = false,
    fetchOverallStats = false,
    // fetchApplicationChartData = false,
    fetchApplicationsCount = false,
    // fetchFollowersCount = false,
    fetchInflightClientsList = false,
    milestonesRange = "this-month",
    onboardedRange = "this-month",
    // chartPeriod = "six-months",
    startDate = "",
    endDate = "",
    fetchAggregatorsCount = false,
    fetchTotalUsersCount = false,
    fetchTotalGuestsCount = false,
    fetchPipelineStats = false,
    pipelineRange = "all",
    fetchApplicationsPeriodBreakdown = false,
    fetchPipelineLists = false,
  } = options;

  const pipelineStats = useFetchData<PipelineStats>({
    method: "GET",
    url: endpoints.ADMIN_PIPELINE_STATS,
    queryKey: ["admin-pipeline-stats", pipelineRange],
    enabled: fetchPipelineStats,
    params: { range: pipelineRange },
  });

  const pipelineLists = useFetchData<PipelineLists>({
    method: "GET",
    url: endpoints.ADMIN_PIPELINE_LISTS,
    queryKey: ["admin-pipeline-lists"],
    enabled: fetchPipelineLists,
    forceRefresh: true,
  });

  // Computed once per mount — this grid shows all 5 windows side by side
  // rather than reacting to a single selected range, so "now" only needs to
  // be resolved once, not kept live.
  const periodWindows = useMemo(() => {
    const nowIso = new Date().toISOString();
    const windows = {} as Record<keyof typeof PERIOD_LOOKBACK_MS, { from: string; to: string }>;
    (Object.keys(PERIOD_LOOKBACK_MS) as Array<keyof typeof PERIOD_LOOKBACK_MS>).forEach((key) => {
      windows[key] = {
        from: new Date(Date.now() - PERIOD_LOOKBACK_MS[key]).toISOString(),
        to: nowIso,
      };
    });
    return windows;
  }, []);

  const appPeriodToday = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    queryKey: ["admin-applications-period", "today"],
    enabled: fetchApplicationsPeriodBreakdown,
    params: periodWindows.today,
  });
  const appPeriodWeek = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    queryKey: ["admin-applications-period", "week"],
    enabled: fetchApplicationsPeriodBreakdown,
    params: periodWindows.week,
  });
  const appPeriodMonth = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    queryKey: ["admin-applications-period", "month"],
    enabled: fetchApplicationsPeriodBreakdown,
    params: periodWindows.month,
  });
  const appPeriodQuarter = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    queryKey: ["admin-applications-period", "quarter"],
    enabled: fetchApplicationsPeriodBreakdown,
    params: periodWindows.quarter,
  });
  const appPeriodYear = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    queryKey: ["admin-applications-period", "year"],
    enabled: fetchApplicationsPeriodBreakdown,
    params: periodWindows.year,
  });

  const vaAllocations = useFetchData<VaAllocationsResponse>({
    method: "GET",
    url: endpoints.ADMIN_CLIENT_ALLOCATION,
    queryKey: ["admin-va-allocations"],
    enabled: fetchVaAllocations,
  });

  const milestoneStats = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CLIENT_MILESTONE_STATS}?range=${milestonesRange}`,
    queryKey: ["admin-milestone-stats", milestonesRange],
    enabled: fetchMilestoneStats && false, // DISABLED
  });

  const onboardedClients = useFetchData<any[]>({
    method: "GET",
    url: `${endpoints.ADMIN_ONBOARDED_CLIENTS}?range=${onboardedRange}`,
    queryKey: ["admin-onboarded-clients", onboardedRange],
    enabled: fetchOnboardedClients && false, // DISABLED
  });

  const jobsiteStats = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_JOBSITE_STATS,
    queryKey: ["admin-jobsite-stats"],
    enabled: fetchJobsiteStats && false, // DISABLED
  });

  const inflightClients = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_INFLIGHT_CLIENTS,
    queryKey: ["admin-inflight-clients"],
    enabled: fetchInflightClients,
  });

  const applicationStats = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_APPLICATION_STATS,
    queryKey: ["admin-application-stats"],
    enabled: fetchApplicationStats,
  });

  const overallStats = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    queryKey: ["admin-overall-stats"],
    enabled: fetchOverallStats || fetchApplicationsCount,
  });

  const aggregatorsCount = useFetchData<any[]>({
    method: "GET",
    url: endpoints.ADMIN_AGGREGATORS,
    queryKey: ["admin-aggregators-list"],
    enabled: fetchAggregatorsCount,
  });

  // The backend returns the full in-flight list unconditionally (no real
  // server-side pagination), so the query key stays fixed regardless of
  // inflightPage/inflightLimit — otherwise every DataGrid page change would
  // look like a brand-new query and refetch identical data from scratch.
  const inflightClientsList = useFetchData<any>({
    method: "GET",
    url: "/api/v1/user-management/users/inflight",
    queryKey: ["admin-inflight-clients-list"],
    enabled: fetchInflightClientsList,
  });

  const totalUsersCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_USERS}?limit=1`,
    queryKey: ["admin-total-users-count"],
    enabled: fetchTotalUsersCount,
  });

  const totalGuestsCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_USERS}?role=guest&limit=1`,
    queryKey: ["admin-total-guests-count"],
    enabled: fetchTotalGuestsCount,
  });

  const mappedApplicationsCount = useMemo(() => {
    return normalizeApplicationCounts(overallStats.data?.data);
  }, [overallStats.data]);

  const mappedAggregatorsCount = useMemo(() => {
    const list = aggregatorsCount.data?.data || aggregatorsCount.data || [];
    if (!Array.isArray(list)) return { total: 0, active: 0 };
    
    return {
      total: list.length,
      active: list.filter((a: any) => a.isEnabled).length
    };
  }, [aggregatorsCount.data]);

  const mappedApplicationsPeriodBreakdown = useMemo<ApplicationsPeriodBreakdown>(() => ({
    today: extractApplicationsPeriodStat(appPeriodToday.data),
    week: extractApplicationsPeriodStat(appPeriodWeek.data),
    month: extractApplicationsPeriodStat(appPeriodMonth.data),
    quarter: extractApplicationsPeriodStat(appPeriodQuarter.data),
    year: extractApplicationsPeriodStat(appPeriodYear.data),
  }), [appPeriodToday.data, appPeriodWeek.data, appPeriodMonth.data, appPeriodQuarter.data, appPeriodYear.data]);

  const mappedChartData = useMemo(() => {
    // Note: Overall stats currently doesn't provide time-series chart data
    return {
      successful: [],
      failed: [],
      label: []
    };
  }, []);

  return useMemo(() => ({
    vaAllocationsDomain: {
      data: vaAllocations.data?.data,
      isLoading: vaAllocations.isLoading,
      isSuccess: vaAllocations.isSuccess,
      isError: vaAllocations.isError,
      error: vaAllocations.error,
    },
    milestoneStatsDomain: {
      data: milestoneStats.data?.data,
      isLoading: milestoneStats.isLoading,
      isSuccess: milestoneStats.isSuccess,
      isError: milestoneStats.isError,
      error: milestoneStats.error,
    },
    onboardedClientsDomain: {
      data: onboardedClients.data?.data,
      isLoading: onboardedClients.isLoading,
      isSuccess: onboardedClients.isSuccess,
      isError: onboardedClients.isError,
      error: onboardedClients.error,
    },
    jobsiteStatsDomain: {
      data: jobsiteStats.data?.data,
      isLoading: jobsiteStats.isLoading,
      isSuccess: jobsiteStats.isSuccess,
      isError: jobsiteStats.isError,
      error: jobsiteStats.error,
    },
    inflightClientsDomain: {
      data: inflightClients.data?.data,
      isLoading: inflightClients.isLoading,
      isSuccess: inflightClients.isSuccess,
      isError: inflightClients.isError,
      error: inflightClients.error,
    },
    applicationStatsDomain: {
      data: applicationStats.data?.data,
      isLoading: applicationStats.isLoading,
      isSuccess: applicationStats.isSuccess,
      isError: applicationStats.isError,
      error: applicationStats.error,
    },
    overallStatsDomain: {
      data: overallStats.data?.data,
      isLoading: overallStats.isLoading,
      isSuccess: overallStats.isSuccess,
      isError: overallStats.isError,
      error: overallStats.error,
    },
    applicationChartDataDomain: {
      data: mappedChartData,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    },
    applicationsCountDomain: {
      data: mappedApplicationsCount,
      isLoading: overallStats.isLoading,
      isSuccess: overallStats.isSuccess,
      isError: overallStats.isError,
      error: overallStats.error,
    },
    followersCountDomain: {
      data: null,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    },
    inflightClientsListDomain: {
      data: inflightClientsList.data?.data,
      isLoading: inflightClientsList.isLoading,
      isSuccess: inflightClientsList.isSuccess,
      isError: inflightClientsList.isError,
      error: inflightClientsList.error,
    },
    dashboardAggregatorsCountDomain: {
      data: mappedAggregatorsCount,
      isLoading: aggregatorsCount.isLoading,
      isSuccess: aggregatorsCount.isSuccess,
      isError: aggregatorsCount.isError,
      error: aggregatorsCount.error,
    },
    totalUsersCountDomain: {
      data: (totalUsersCount.data as any)?.data?.pagination?.total,
      isLoading: totalUsersCount.isLoading,
      isSuccess: totalUsersCount.isSuccess,
      isError: totalUsersCount.isError,
      error: totalUsersCount.error,
    },
    totalGuestsCountDomain: {
      data: (totalGuestsCount.data as any)?.data?.pagination?.total,
      isLoading: totalGuestsCount.isLoading,
      isSuccess: totalGuestsCount.isSuccess,
      isError: totalGuestsCount.isError,
      error: totalGuestsCount.error,
    },
    pipelineStatsDomain: {
      data: pipelineStats.data?.data,
      isLoading: pipelineStats.isLoading,
      isSuccess: pipelineStats.isSuccess,
      isError: pipelineStats.isError,
      error: pipelineStats.error,
    },
    pipelineListsDomain: {
      data: pipelineLists.data?.data,
      isLoading: pipelineLists.isLoading,
      isSuccess: pipelineLists.isSuccess,
      isError: pipelineLists.isError,
      error: pipelineLists.error,
    },
    applicationsPeriodBreakdownDomain: {
      data: mappedApplicationsPeriodBreakdown,
      isLoading: appPeriodToday.isLoading || appPeriodWeek.isLoading || appPeriodMonth.isLoading || appPeriodQuarter.isLoading || appPeriodYear.isLoading,
      isSuccess: appPeriodToday.isSuccess && appPeriodWeek.isSuccess && appPeriodMonth.isSuccess && appPeriodQuarter.isSuccess && appPeriodYear.isSuccess,
      isError: appPeriodToday.isError || appPeriodWeek.isError || appPeriodMonth.isError || appPeriodQuarter.isError || appPeriodYear.isError,
      error: appPeriodToday.error || appPeriodWeek.error || appPeriodMonth.error || appPeriodQuarter.error || appPeriodYear.error,
    },
    totalApplicationsCard: {
      title: "Total Applications",
      data: mappedApplicationsCount?.totalCount ?? 0,
    },
    successfulApplicationsCard: {
      title: "Successful Applications",
      data: mappedApplicationsCount?.successCount || 0,
    },
    failedApplicationsCard: {
      title: "Failed Applications",
      data: mappedApplicationsCount?.failedCount || 0,
    },
  }), [
    vaAllocations, milestoneStats, onboardedClients, jobsiteStats, inflightClients,
    applicationStats, overallStats, inflightClientsList, aggregatorsCount,
    totalUsersCount, totalGuestsCount, pipelineStats, pipelineLists,
    appPeriodToday, appPeriodWeek, appPeriodMonth, appPeriodQuarter, appPeriodYear,
    mappedApplicationsCount, mappedChartData, mappedAggregatorsCount, mappedApplicationsPeriodBreakdown
  ]);
};
