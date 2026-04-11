import { useMemo } from "react";
import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions, VaAllocationsResponse } from "./types";

const normalizeApplicationCounts = (payload: any) => {
  const source = payload?.data ?? payload;

  // Check if it's the consolidated analytics payload
  if (source?.breakdown?.applications) {
    return {
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
    inflightPage = 1,
    inflightLimit = 5,
    fetchAggregatorsCount = false,
    fetchTotalUsersCount = false,
    fetchTotalGuestsCount = false,
  } = options;

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
    params: { from: startDate, to: endDate },
    queryKey: ["admin-overall-stats", startDate, endDate],
    enabled: fetchOverallStats || fetchApplicationsCount,
  });

  const aggregatorsCount = useFetchData<any[]>({
    method: "GET",
    url: endpoints.ADMIN_AGGREGATORS,
    queryKey: ["admin-aggregators-list"],
    enabled: fetchAggregatorsCount,
  });

  const inflightClientsList = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_USERS}?variant=inflight&page=${inflightPage}&limit=${inflightLimit}`,
    queryKey: ["admin-inflight-clients", inflightPage, inflightLimit],
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

  const mappedChartData = useMemo(() => {
    // Note: Overall stats currently doesn't provide time-series chart data
    return null;
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
    totalApplicationsCard: {
      title: "Total Applications",
      data: (mappedApplicationsCount?.successCount || 0) + (mappedApplicationsCount?.failedCount || 0),
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
    totalUsersCount, totalGuestsCount,
    mappedApplicationsCount, mappedChartData, mappedAggregatorsCount
  ]);
};
