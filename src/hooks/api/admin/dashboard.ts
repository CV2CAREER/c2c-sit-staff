import { useMemo } from "react";
import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions, VaAllocationsResponse } from "./types";

const normalizeApplicationCounts = (payload: any) => {
  const source = payload?.data ?? payload;

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
    fetchApplicationChartData = false,
    fetchApplicationsCount = false,
    fetchFollowersCount = false,
    fetchInflightClientsList = false,
    milestonesRange = "this-month",
    onboardedRange = "this-month",
    chartPeriod = "six-months",
    startDate = "",
    endDate = "",
    inflightPage = 1,
    inflightLimit = 5,
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
    enabled: fetchMilestoneStats,
  });

  const onboardedClients = useFetchData<any[]>({
    method: "GET",
    url: `${endpoints.ADMIN_ONBOARDED_CLIENTS}?range=${onboardedRange}`,
    queryKey: ["admin-onboarded-clients", onboardedRange],
    enabled: fetchOnboardedClients,
  });

  const jobsiteStats = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_JOBSITE_STATS,
    queryKey: ["admin-jobsite-stats"],
    enabled: fetchJobsiteStats,
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
    enabled: fetchOverallStats,
  });

  const applicationChartData = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_APPLICATION_CHART_DATA}?chart=true&period=${chartPeriod}`,
    queryKey: ["admin-application-chart-data", chartPeriod],
    enabled: fetchApplicationChartData,
  });

  const applicationsCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_APPLICATIONS}?dataCount=true&startDate=${startDate}&endDate=${endDate}`,
    queryKey: ["admin-applications-count", startDate, endDate],
    enabled: fetchApplicationsCount,
  });

  const followersCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_FOLLOWERS}?dataCount=true&startDate=${startDate}&endDate=${endDate}`,
    queryKey: ["admin-followers-count", startDate, endDate],
    enabled: fetchFollowersCount,
  });

  const inflightClientsList = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_USERS}?variant=inflight&page=${inflightPage}&limit=${inflightLimit}`,
    queryKey: ["admin-inflight-clients", inflightPage, inflightLimit],
    enabled: fetchInflightClientsList,
  });

  const mappedApplicationsCount = useMemo(() => {
    return normalizeApplicationCounts(applicationsCount.data?.data);
  }, [applicationsCount.data]);

  const mappedChartData = useMemo(() => {
    if (!applicationChartData.data?.data?.days) return null;
    const days = applicationChartData.data.data.days;
    const sortedDays = Object.keys(days).sort();
    
    // Extract applications source metrics for each day
    const successful: number[] = [];
    const failed: number[] = [];
    const label: string[] = [];

    sortedDays.forEach(day => {
      const metrics = days[day].applications || { successful: 0, failed: 0 };
      successful.push(metrics.successful);
      failed.push(metrics.failed);
      label.push(day);
    });

    return { successful, failed, label };
  }, [applicationChartData.data]);

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
      isLoading: applicationChartData.isLoading,
      isSuccess: applicationChartData.isSuccess,
      isError: applicationChartData.isError,
      error: applicationChartData.error,
    },
    applicationsCountDomain: {
      data: mappedApplicationsCount,
      isLoading: applicationsCount.isLoading,
      isSuccess: applicationsCount.isSuccess,
      isError: applicationsCount.isError,
      error: applicationsCount.error,
    },
    followersCountDomain: {
      data: followersCount.data?.data,
      isLoading: followersCount.isLoading,
      isSuccess: followersCount.isSuccess,
      isError: followersCount.isError,
      error: followersCount.error,
    },
    inflightClientsListDomain: {
      data: inflightClientsList.data?.data,
      isLoading: inflightClientsList.isLoading,
      isSuccess: inflightClientsList.isSuccess,
      isError: inflightClientsList.isError,
      error: inflightClientsList.error,
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
    applicationStats, overallStats, applicationChartData, applicationsCount,
    followersCount, inflightClientsList,
    mappedApplicationsCount, mappedChartData
  ]);
};
