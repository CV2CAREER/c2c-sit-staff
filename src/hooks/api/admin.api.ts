/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo } from "react";
import { useFetchData, useMutateData } from "../useApi";
import axiosInstance from "@/services/api-client";
import { useMutation } from "@tanstack/react-query";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { 
  Throttle,
  UpdateAnswerModePayload,
  CreateTablePayload,
  CreateColumnPayload,
  ApiTable,
  BotStatus,
  AnswerModeItem
} from "@/types/admin.types";

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  fetchAdminStatus?: boolean; 
  fetchBotStatus?: boolean;
  botName?: string;
  fetchAnswerMode?: boolean;
  fetchTables?: boolean;
  fetchThrottles?: boolean;
  startDate?: string;
  endDate?: string;
  inflightPage?: number;
  inflightLimit?: number;
  chartPeriod?: string;
  tableName?: string;
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
    fetchAdminStatus = false,
    fetchBotStatus = false,
    botName = "",
    fetchAnswerMode = false,
    fetchTables = false,
    fetchThrottles = false,
    milestonesRange = "this-month",
    onboardedRange = "this-month",
    startDate = "",
    endDate = "",
    inflightPage = 1,
    inflightLimit = 5,
    chartPeriod = "six-months",
    // tableName = "",
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

  const adminStatus = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATUS,
    queryKey: ["admin-status"],
    enabled: fetchAdminStatus || fetchBotStatus || fetchAnswerMode,
  });

  const botStatus = useFetchData<BotStatus>({
    method: "GET",
    url: `${endpoints.ADMIN_BOT_CONTROL}?bot=${botName.toLowerCase()}&action=status`,
    queryKey: ["admin-bot-status", botName],
    enabled: fetchBotStatus && !!botName && false, // Disabled in favor of consolidated status
  });

  const answerMode = useFetchData<AnswerModeItem[]>({
    method: "GET",
    url: endpoints.ADMIN_ANSWER_MODE,
    queryKey: ["admin-answer-mode"],
    enabled: fetchAnswerMode && false, // Disabled in favor of consolidated status
  });

  // Map consolidated status to per-bot format for frontend compatibility
  const mappedBotStatus = adminStatus.data?.data ? {
    status: adminStatus.data.data.botEnabled ? "On" : "Off",
    bot: botName
  } : null;

  const mappedAnswerMode = adminStatus.data?.data ? [
    { botName: "Seek", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "Jora", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "Indeed", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "Adzuna", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "LinkedIn", mode: adminStatus.data.data.questionAnswerMode },
  ] : [];

  const HARDCODED_TABLES = [
    "Users",
    "Partners",
    "Referrers",
    "SalesConsultants",
    "CustomerServices",
    "Locations",
    "AggregatorThrottleConfigs",
    "Plans",
    "Profiles"
  ];

  const tables = useFetchData<any>({
    method: "GET",
    url: options.tableName ? `${endpoints.ADMIN_TABLE_MANAGER}/${options.tableName}` : endpoints.ADMIN_TABLE_MANAGER,
    queryKey: ["admin-schema", options.tableName || "all"],
    enabled: fetchTables && !!options.tableName,
  });

  const mappedTables: ApiTable[] = useMemo(() => {
    if (options.tableName && tables.data?.data?.columns) {
      return [{
        _id: options.tableName,
        name: options.tableName,
        columns: tables.data.data.columns.map((c: any) => c.name)
      }];
    }
    return HARDCODED_TABLES.map(table => ({
      _id: table,
      name: table,
      columns: []
    }));
  }, [tables.data, options.tableName]);

  const throttles = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_THROTTLE,
    queryKey: ["admin-throttles"],
    enabled: fetchThrottles,
  });

  const mappedThrottles: Throttle[] = useMemo(() => {
    if (!throttles.data?.data?.config) return [];
    const config = throttles.data.data.config;
    const result: Throttle[] = [
      {
        id: 0,
        aggregator: "Global (Max Jobs)",
        value: config.maxConcurrentJobs,
      },
      {
        id: -1,
        aggregator: "Global (Req/Min)",
        value: config.maxRequestsPerMinute,
      }
    ];

    if (config.perAggregator) {
      Object.entries(config.perAggregator).forEach(([agg, settings]: [string, any], idx) => {
        result.push({
          id: idx + 1,
          aggregator: agg,
          value: settings.maxConcurrentJobs ?? config.maxConcurrentJobs,
        });
      });
    }
    return result;
  }, [throttles.data]);

  const mappedApplicationsCount = useMemo(() => {
    if (!applicationsCount.data?.data?.metrics) return null;
    const metrics = applicationsCount.data.data.metrics;
    return {
      successCount: metrics.successful,
      failedCount: metrics.failed,
    };
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
      data: mappedChartData,
      isLoading: applicationChartData.isLoading,
      isSuccess: applicationChartData.isSuccess,
      isError: applicationChartData.isError,
      error: applicationChartData.error,
    },
    totalApplicationsCard: {
      title: "Total Applications",
      data: (applicationsCount.data?.data?.metrics?.successful || 0) + (applicationsCount.data?.data?.metrics?.failed || 0),
    },
    successfulApplicationsCard: {
      title: "Successful Applications",
      data: applicationsCount.data?.data?.metrics?.successful || 0,
    },
    failedApplicationsCard: {
      title: "Failed Applications",
      data: applicationsCount.data?.data?.metrics?.failed || 0,
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
    botStatusDomain: {
      data: mappedBotStatus,
      isLoading: adminStatus.isLoading,
      isSuccess: adminStatus.isSuccess,
      isError: adminStatus.isError,
      error: adminStatus.error,
    },
    answerModeDomain: {
      data: mappedAnswerMode,
      isLoading: adminStatus.isLoading,
      isSuccess: adminStatus.isSuccess,
      isError: adminStatus.isError,
      error: adminStatus.error,
    },
    adminStatusDomain: {
      data: adminStatus.data?.data,
      isLoading: adminStatus.isLoading,
      isSuccess: adminStatus.isSuccess,
      isError: adminStatus.isError,
      error: adminStatus.error,
    },
    tablesDomain: {
      data: mappedTables,
      isLoading: tables.isLoading,
      isSuccess: tables.isSuccess,
      isError: tables.isError,
      error: tables.error,
    },
    throttlesDomain: {
      data: mappedThrottles,
      isLoading: throttles.isLoading,
      isSuccess: throttles.isSuccess,
      isError: throttles.isError,
      error: throttles.error,
    },
  };
};

export const useAdminMutations = () => {
  const toggleBot = useMutateData<any, { botEnabled?: boolean; questionAnswerMode?: string }>({
    method: "PATCH",
    url: endpoints.ADMIN_BOT_CONTROL,
    mutationKey: ["admin-bot-toggle"],
    onSuccess: () => {},
    onError: () => {},
  });

  const updateAnswerMode = useMutateData<any, { botEnabled?: boolean; questionAnswerMode?: string }>({
    method: "PATCH",
    url: endpoints.ADMIN_ANSWER_MODE,
    mutationKey: ["admin-update-answer-mode"],
    onSuccess: () => {},
    onError: () => {},
  });

  const createTable = useMutateData<ApiTable, CreateTablePayload>({
    method: "POST",
    url: endpoints.ADMIN_TABLE_MANAGER,
    mutationKey: ["admin-create-table"],
    onSuccess: () => {},
    onError: () => {},
  });

  const updateTable = useMutateData<any, any>({
    method: "POST", // v1 uses POST /schema for expandColumn
    url: endpoints.ADMIN_TABLE_MANAGER,
    mutationKey: ["admin-update-table"],
    onSuccess: () => {},
    onError: () => {},
  });

  const deleteTable = useMutateData<any, { table: string }>({
    method: "DELETE",
    url: endpoints.ADMIN_TABLE_MANAGER,
    mutationKey: ["admin-delete-table"],
    onSuccess: () => {},
    onError: () => {},
  });

  const deleteColumn = useMutation({
    mutationKey: ["admin-delete-column"],
    mutationFn: async ({ tableName, columnName }: { tableName: string; columnName: string }) => {
      const response = await axiosInstance.delete(`${endpoints.ADMIN_TABLE_MANAGER}/${tableName}/${columnName}`);
      return response.data;
    },
  });

  const createThrottle = useMutateData<any, any>({
    method: "PATCH",
    url: endpoints.ADMIN_THROTTLE,
    mutationKey: ["admin-create-throttle"],
    onSuccess: () => {},
    onError: () => {},
  });

  const updateThrottle = useMutateData<any, any>({
    method: "PATCH",
    url: endpoints.ADMIN_THROTTLE,
    mutationKey: ["admin-update-throttle"],
    onSuccess: () => {},
    onError: () => {},
  });

  const deleteThrottle = useMutateData<any, any>({
    method: "PATCH",
    url: endpoints.ADMIN_THROTTLE,
    mutationKey: ["admin-delete-throttle"],
    onSuccess: () => {},
    onError: () => {},
  });

  return {
    toggleBotMutation: toggleBot,
    updateAnswerModeMutation: updateAnswerMode,
    createTableMutation: createTable,
    updateTableMutation: updateTable,
    deleteTableMutation: deleteTable,
    deleteColumnMutation: deleteColumn,
    createThrottleMutation: createThrottle,
    updateThrottleMutation: updateThrottle,
    deleteThrottleMutation: deleteThrottle,
  };
};
