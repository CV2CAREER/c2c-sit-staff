/* eslint-disable @typescript-eslint/no-unused-vars */
import { useFetchData } from "../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

export interface VaStats {
  yearly: number;
  quarterly: number;
  monthly: number;
  weekly: number;
  daily: number;
}

export interface VaAllocationItem {
  name: string;
  clients: string[];
  stats: VaStats;
}

export interface VaAllocationsData {
  result: VaAllocationItem[];
  unAllocatedClients: string[];
}

export interface VaAllocationsResponse {
  parsedData: VaAllocationsData;
}

interface MilestoneStat {
  month: string;
  commenced: number;
  hold: number;
  expired: number;
  offerNotification: number;
}

interface AdminQueriesOptions {
  fetchVaAllocations?: boolean;
  fetchMilestoneStats?: boolean;
  milestonesRange?: string;
  onboardedRange?: string;
  fetchOnboardedClients?: boolean;
  fetchJobsiteStats?: boolean;
  fetchInflightClients?: boolean;
  fetchApplicationStats?: boolean;
  fetchOverallStats?: boolean;
  fetchApplicationChartData?: boolean;
  fetchUsersCount?: boolean;
  fetchAggregatorsCount?: boolean;
  fetchApplicationsCount?: boolean;
  fetchFollowersCount?: boolean;
  fetchInflightClientsList?: boolean;
  startDate?: string;
  endDate?: string;
  inflightPage?: number;
  inflightLimit?: number;
  chartPeriod?: string;
}

export const useAdminQueries = (options: AdminQueriesOptions) => {
  const {
    fetchVaAllocations = false,
    fetchMilestoneStats = false,
    fetchOnboardedClients = false,
    fetchJobsiteStats = false,
    fetchInflightClients = false,
    fetchApplicationStats = false,
    fetchOverallStats = false,
    fetchApplicationChartData = false,
    fetchUsersCount = false,
    fetchAggregatorsCount = false,
    fetchApplicationsCount = false,
    fetchFollowersCount = false,
    fetchInflightClientsList = false,
    milestonesRange = "this-month",
    onboardedRange = "this-month",
    startDate = "",
    endDate = "",
    inflightPage = 1,
    inflightLimit = 5,
    chartPeriod = "six-months",
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

  const usersCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_USERS}?dataCount=true&startDate=${startDate}&endDate=${endDate}`,
    queryKey: ["admin-users-count", startDate, endDate],
    enabled: fetchUsersCount,
  });

  const aggregatorsCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_AGGREGATORS}?count=true&startDate=${startDate}&endDate=${endDate}`,
    queryKey: ["admin-aggregators-count", startDate, endDate],
    enabled: fetchAggregatorsCount,
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

  return {
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
      data: applicationChartData.data?.data,
      isLoading: applicationChartData.isLoading,
      isSuccess: applicationChartData.isSuccess,
      isError: applicationChartData.isError,
      error: applicationChartData.error,
    },
    usersCountDomain: {
      data: usersCount.data?.data,
      isLoading: usersCount.isLoading,
      isSuccess: usersCount.isSuccess,
      isError: usersCount.isError,
      error: usersCount.error,
    },
    aggregatorsCountDomain: {
      data: aggregatorsCount.data?.data,
      isLoading: aggregatorsCount.isLoading,
      isSuccess: aggregatorsCount.isSuccess,
      isError: aggregatorsCount.isError,
      error: aggregatorsCount.error,
    },
    applicationsCountDomain: {
      data: applicationsCount.data?.data,
      isLoading: applicationsCount.isLoading,
      isSuccess: applicationsCount.isSuccess,
      isError: applicationsCount.isError,
      error: applicationsCount.error,
    },
    followersCountDomain: {
      data: followersCount.data, // Followers data is usually direct from backend response in v2
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
  };
};

export const useAdminMutations = () => {
  return {};
};
