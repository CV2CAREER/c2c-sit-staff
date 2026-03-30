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
  fetchUsersPersonaCount?: boolean;
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
  userId?: string;
  fetchUserDetail?: boolean;
  fetchAdminDropdowns?: boolean;
  columns?: string[];
  fetchUsersList?: boolean;
  fetchClients?: boolean;
  fetchPCs?: boolean;
  fetchPlans?: boolean;
  fetchDocuments?: boolean;
  fetchClientJobsite?: boolean;
  fetchUserPreferences?: boolean;
  fetchJobPreferences?: boolean;
  fetchProfileHistory?: boolean;
  fetchReferralHistory?: boolean;
  fetchRegexQueue?: boolean;
  fetchUserInfo?: boolean;
  fetchCampaignSheet?: boolean;
  fetchAggregators?: boolean;
  fetchCvRevamp?: boolean;
  docId?: string;
  fetchCampaignClients?: boolean;
  fetchClientCampaignInsights?: boolean;
  fetchUsersFullName?: boolean;
  usersFullNameSkip?: number;
  fetchCampaigns?: boolean;
  campaignActive?: string;
  campaignSearch?: string;
  fetchSheetsTemplates?: boolean;
  fetchUserDocsAndPreferences?: boolean;
  fetchAggregatorLocations?: boolean;
  aggregatorName?: string;
  fetchCountryInfo?: boolean;
  countryName?: string;
  countryType?: string;
  campaignOptions?: {
    active?: string;
    aggregator?: string;
    dataOption?: string;
    tableDisplay?: string;
    applicationStatus?: string | null;
    limit?: number;
    skip?: number;
  };
  profileHistorySkip?: number;
  referralEmail?: string;
  usersFilter?: {
    active?: boolean;
    recycle?: boolean;
    q?: string;
    userType?: string;
    plan?: string;
    page?: number;
    limit?: number;
  };
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
    fetchUsersPersonaCount = false,
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
    userId = "",
    fetchUserDetail = false,
    fetchAdminDropdowns = false,
    fetchUsersList = false,
    fetchClients = false,
    fetchPCs = false,
    fetchPlans = false,
    fetchDocuments = false,
    fetchClientJobsite = false,
    fetchUserPreferences = false,
    fetchJobPreferences = false,
    fetchProfileHistory = false,
    fetchReferralHistory = false,
    fetchRegexQueue = false,
    fetchUserInfo = false,
    fetchCampaignSheet = false,
    fetchAggregators = false,
    fetchCvRevamp = false,
    docId = "",
    campaignOptions = {},
    profileHistorySkip = 0,
    referralEmail = "",
    usersFilter = {},
    fetchCampaignClients = false,
    fetchClientCampaignInsights = false,
    fetchUsersFullName = false,
    usersFullNameSkip = 0,
    fetchCampaigns = false,
    campaignActive = "true",
    campaignSearch = "",
    fetchSheetsTemplates = false,
    fetchUserDocsAndPreferences = false,
    fetchAggregatorLocations = false,
    aggregatorName = "",
    fetchCountryInfo = false,
    countryName = "",
    countryType = "region",
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
  
  const usersPersonaCount = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { activePersonnaCount: "true", startDate, endDate },
    queryKey: ["admin-users-persona-count", startDate, endDate],
    enabled: fetchUsersPersonaCount,
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
 
  const userDetail = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_DETAIL(userId) : "",
    queryKey: ["admin-user-detail", userId],
    enabled: fetchUserDetail && !!userId,
  });

  const adminDropdowns = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_DROPDOWN,
    queryKey: ["admin-dropdowns"],
    enabled: fetchAdminDropdowns,
  });

  const usersList = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: (() => {
      const p = new URLSearchParams();
      if (usersFilter.active) p.append("active", "true");
      if (usersFilter.recycle) p.append("recycle", "true");
      if (usersFilter.q) p.append("q", usersFilter.q);
      if (usersFilter.userType) p.append("userType", usersFilter.userType);
      if (usersFilter.plan) p.append("plan", usersFilter.plan);
      if (usersFilter.page) p.append("page", String(usersFilter.page));
      if (usersFilter.limit) p.append("limit", String(usersFilter.limit));
      
      const hasFilter = usersFilter.q || usersFilter.userType || usersFilter.plan;
      if (!hasFilter) p.append("variant", "all");
      
      const qs = p.toString();
      return qs ? `?${qs}` : "";
    })(),
    queryKey: ["admin-users-list", usersFilter],
    enabled: fetchUsersList,
  });

  const clients = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { role: "client", variant: "all" },
    queryKey: ["admin-clients"],
    enabled: fetchClients,
  });

  const pcs = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { role: "assistant,tpc", variant: "all" },
    queryKey: ["admin-pcs"],
    enabled: fetchPCs,
  });

  const plans = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_PLANS,
    queryKey: ["admin-plans"],
    enabled: fetchPlans,
  });

  const documents = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_DOCUMENTS,
    queryKey: ["admin-documents", userId],
    params: { id: userId, fields: "all" },
    enabled: fetchDocuments && !!userId,
  });

  const clientJobsite = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CLIENT_JOBSITE,
    queryKey: ["admin-client-jobsite", userId],
    params: { action: "retrieve", userId },
    enabled: fetchClientJobsite && !!userId,
  });

  const userPreferences = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USER_PREFERENCES,
    queryKey: ["admin-user-preferences", userId],
    params: { id: userId },
    enabled: fetchUserPreferences && !!userId,
  });

  const jobPreferences = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_JOB_PREFERENCES,
    queryKey: ["admin-job-preferences"],
    params: { categories: ["Advertisers", "Classification", "Job Type", "Working Rights"] },
    enabled: fetchJobPreferences,
  });

  const profileHistory = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_PROFILE_HISTORY(userId),
    queryKey: ["admin-profile-history", userId, profileHistorySkip],
    params: { skip: profileHistorySkip },
    enabled: fetchProfileHistory && !!userId,
  });

  const referralHistory = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_REFERRAL_HISTORY,
    queryKey: ["admin-referral-history", referralEmail],
    params: { email: referralEmail },
    enabled: fetchReferralHistory && !!referralEmail,
  });

  const regexQueue = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_REGEX_QUEUE,
    queryKey: ["admin-regex-queue", userId],
    params: { variant: userId || "all" },
    enabled: fetchRegexQueue,
  });

  const userInfo = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_INFO(userId) : "",
    queryKey: ["admin-user-info", userId],
    enabled: fetchUserInfo && !!userId,
  });

  const campaignSheet = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CAMPAIGN_SHEET,
    params: { userId, ...campaignOptions },
    queryKey: ["admin-campaign-sheet", userId, campaignOptions],
    enabled: fetchCampaignSheet && !!userId,
  });

  const aggregators = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_JOBSITES,
    queryKey: ["admin-aggregators-list"],
    enabled: fetchAggregators,
  });

  const cvRevamp = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CV_REVAMP,
    params: { docId, userId },
    queryKey: ["admin-cv-revamp", docId, userId],
    enabled: fetchCvRevamp && (!!docId || !!userId),
  });

  const campaignClients = useFetchData<any[]>({
    method: "GET",
    url: endpoints.ADMIN_CAMPAIGN_GET_CLIENTS,
    queryKey: ["admin-fetch-campaign-clients"],
    enabled: fetchCampaignClients,
  });

  const clientCampaignInsights = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_CAMPAIGN_CLIENT_INSIGHTS(userId) : "",
    queryKey: ["admin-fetch-client-campaign-insights", userId],
    enabled: fetchClientCampaignInsights && !!userId,
  });

  const usersFullName = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS_FULL_NAME,
    params: { skip: usersFullNameSkip },
    queryKey: ["admin-users-full-name", usersFullNameSkip],
    enabled: fetchUsersFullName,
  });

  const campaigns = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CAMPAIGN,
    params: { active: campaignActive, q: campaignSearch },
    queryKey: ["admin-campaigns", campaignActive, campaignSearch],
    enabled: fetchCampaigns,
  });

  const sheetsTemplates = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_SHEETS_TEMPLATES,
    queryKey: ["admin-sheets-templates"],
    enabled: fetchSheetsTemplates,
  });

  const userDocsAndPreferences = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_DOCUMENT_REVIEW,
    params: { uid: userId },
    queryKey: ["admin-user-docs-and-preferences", userId],
    enabled: fetchUserDocsAndPreferences && !!userId,
  });
  
  const aggregatorLocations = useFetchData<any>({
    method: "GET",
    url: endpoints.AGGREGATOR_LOCATIONS,
    params: { agg: aggregatorName },
    queryKey: ["admin-aggregator-locations", aggregatorName],
    enabled: fetchAggregatorLocations && !!aggregatorName,
  });

  const countryInfo = useFetchData<any>({
    method: "GET",
    url: endpoints.COUNTRY_INFO,
    params: { country: countryName, type: countryType },
    queryKey: ["admin-country-info", countryName, countryType],
    enabled: fetchCountryInfo && !!countryName,
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
    userDetailDomain: {
      data: userDetail.data?.data,
      isLoading: userDetail.isLoading,
      isSuccess: userDetail.isSuccess,
      isError: userDetail.isError,
      error: userDetail.error,
    },
    adminDropdownsDomain: {
      data: adminDropdowns.data?.data,
      isLoading: adminDropdowns.isLoading,
      isSuccess: adminDropdowns.isSuccess,
      isError: adminDropdowns.isError,
      error: adminDropdowns.error,
    },
    usersListDomain: {
      data: usersList.data?.data,
      isLoading: usersList.isLoading,
      isSuccess: usersList.isSuccess,
      isError: usersList.isError,
      error: usersList.error,
    },
    clientsDomain: {
      data: clients.data?.data,
      isLoading: clients.isLoading,
      isSuccess: clients.isSuccess,
      isError: clients.isError,
      error: clients.error,
    },
    pcsDomain: {
      data: pcs.data?.data,
      isLoading: pcs.isLoading,
      isSuccess: pcs.isSuccess,
      isError: pcs.isError,
      error: pcs.error,
    },
    plansDomain: {
      data: plans.data?.data,
      isLoading: plans.isLoading,
      isSuccess: plans.isSuccess,
      isError: plans.isError,
      error: plans.error,
    },
    documentsDomain: {
      data: documents.data?.data,
      isLoading: documents.isLoading,
      isSuccess: documents.isSuccess,
      isError: documents.isError,
      error: documents.error,
    },
    clientJobsiteDomain: {
      data: clientJobsite.data?.data,
      isLoading: clientJobsite.isLoading,
      isSuccess: clientJobsite.isSuccess,
      isError: clientJobsite.isError,
      error: clientJobsite.error,
    },
    userPreferencesDomain: {
      data: userPreferences.data,
      isLoading: userPreferences.isLoading,
      isSuccess: userPreferences.isSuccess,
      isError: userPreferences.isError,
      error: userPreferences.error,
    },
    jobPreferencesOptionsDomain: {
      data: jobPreferences.data,
      isLoading: jobPreferences.isLoading,
      isSuccess: jobPreferences.isSuccess,
      isError: jobPreferences.isError,
      error: jobPreferences.error,
    },
    profileHistoryDomain: {
      data: profileHistory.data,
      isLoading: profileHistory.isLoading,
      isSuccess: profileHistory.isSuccess,
      isError: profileHistory.isError,
      error: profileHistory.error,
    },
    referralHistoryDomain: {
      data: referralHistory.data,
      isLoading: referralHistory.isLoading,
      isSuccess: referralHistory.isSuccess,
      isError: referralHistory.isError,
      error: referralHistory.error,
    },
    regexQueueDomain: {
      data: regexQueue.data,
      isLoading: regexQueue.isLoading,
      isSuccess: regexQueue.isSuccess,
      isError: regexQueue.isError,
      error: regexQueue.error,
    },
    usersPersonaCountDomain: {
      data: usersPersonaCount.data,
      isLoading: usersPersonaCount.isLoading,
      isSuccess: usersPersonaCount.isSuccess,
      isError: usersPersonaCount.isError,
      error: usersPersonaCount.error,
    },
    userInfoDomain: {
      data: userInfo.data,
      isLoading: userInfo.isLoading,
      isSuccess: userInfo.isSuccess,
      isError: userInfo.isError,
      error: userInfo.error,
    },
    campaignSheetDomain: {
      data: campaignSheet.data,
      isLoading: campaignSheet.isLoading,
      isSuccess: campaignSheet.isSuccess,
      isError: campaignSheet.isError,
      error: campaignSheet.error,
    },
    aggregatorsDomain: {
      data: aggregators.data,
      isLoading: aggregators.isLoading,
      isSuccess: aggregators.isSuccess,
      isError: aggregators.isError,
      error: aggregators.error,
    },
    cvRevampDomain: {
      data: cvRevamp.data,
      isLoading: cvRevamp.isLoading,
      isSuccess: cvRevamp.isSuccess,
      isError: cvRevamp.isError,
      error: cvRevamp.error,
    },
    campaignClientsDomain: {
      data: campaignClients.data?.data,
      isLoading: campaignClients.isLoading,
      isSuccess: campaignClients.isSuccess,
      isError: campaignClients.isError,
      error: campaignClients.error,
    },
    clientCampaignInsightsDomain: {
      data: clientCampaignInsights.data,
      isLoading: clientCampaignInsights.isLoading,
      isSuccess: clientCampaignInsights.isSuccess,
      isError: clientCampaignInsights.isError,
      error: clientCampaignInsights.error,
    },
    usersFullNameDomain: {
      data: usersFullName.data?.data,
      isLoading: usersFullName.isLoading,
      isSuccess: usersFullName.isSuccess,
      isError: usersFullName.isError,
      error: usersFullName.error,
    },
    campaignsDomain: {
      data: campaigns.data?.data,
      isLoading: campaigns.isLoading,
      isSuccess: campaigns.isSuccess,
      isError: campaigns.isError,
      error: campaigns.error,
    },
    sheetsTemplatesDomain: {
      data: sheetsTemplates.data?.data,
      isLoading: sheetsTemplates.isLoading,
      isSuccess: sheetsTemplates.isSuccess,
      isError: sheetsTemplates.isError,
      error: sheetsTemplates.error,
    },
    userDocsAndPreferencesDomain: {
      data: userDocsAndPreferences.data?.data,
      isLoading: userDocsAndPreferences.isLoading,
      isSuccess: userDocsAndPreferences.isSuccess,
      isError: userDocsAndPreferences.isError,
      error: userDocsAndPreferences.error,
    },
    aggregatorLocationsDomain: {
      data: aggregatorLocations.data?.data,
      isLoading: aggregatorLocations.isLoading,
      isSuccess: aggregatorLocations.isSuccess,
      isError: aggregatorLocations.isError,
      error: aggregatorLocations.error,
    },
    countryInfoDomain: {
      data: countryInfo.data?.data,
      isLoading: countryInfo.isLoading,
      isSuccess: countryInfo.isSuccess,
      isError: countryInfo.isError,
      error: countryInfo.error,
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
    updateDropdownMutation: useMutateData<any, { title: string; options: string[]; id: string }>({
      method: "PUT",
      url: endpoints.ADMIN_DROPDOWN,
      mutationKey: ["admin-update-dropdown"],
      onSuccess: () => {},
      onError: () => {},
    }),
    extractCvMutation: useMutateData<any, { userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_USER_EXTRACT_CV,
      mutationKey: ["admin-extract-cv"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteDropdownMutation: useMutateData<any, { id: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_DROPDOWN,
      mutationKey: ["admin-delete-dropdown"],
      onSuccess: () => {},
      onError: () => {},
    }),
    generateJobsiteRowsMutation: useMutateData<any, { userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-generate-jobsite-rows"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateUserProgressMutation: useMutateData<any, { progress: string; metadata?: any; uid: string }>({
      method: "PUT",
      url: endpoints.ADMIN_UPDATE_USER_PROGRESS,
      mutationKey: ["admin-update-user-progress"],
      paramKey: "uid",
      onSuccess: () => {},
      onError: () => {},
    }),
    upgradePlanMutation: useMutateData<any, { plan: string; userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_UPGRADE_PLAN,
      mutationKey: ["admin-upgrade-plan"],
      onSuccess: () => {},
      onError: () => {},
    }),
    accountActionMutation: useMutateData<any, { userId: string; action: string }>({
      method: "POST",
      url: endpoints.ADMIN_ACCOUNT_ACTION,
      mutationKey: ["admin-account-action"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteUserMutation: useMutateData<any, { userId: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_DELETE_USER,
      mutationKey: ["admin-delete-user"],
      paramKey: "userId",
      onSuccess: () => {},
      onError: () => {},
    }),
    applicationEmailMutation: useMutateData<any, { type: string; name: string; email: string }>({
      method: "POST",
      url: endpoints.ADMIN_APPLICATION_EMAILS,
      mutationKey: ["admin-application-email"],
      onSuccess: () => {},
      onError: () => {},
    }),
    uploadDocumentsMutation: useMutateData<any, FormData>({
      method: "POST",
      url: endpoints.ADMIN_UPLOAD_DOCUMENTS,
      mutationKey: ["admin-upload-documents"],
      onSuccess: () => {},
      onError: () => {},
    }),
    submitDocumentReviewMutation: useMutateData<any, { uid: string; documents: any[] }>({
      method: "POST",
      url: endpoints.ADMIN_DOCUMENT_REVIEW,
      mutationKey: ["admin-submit-document-review"],
      paramKey: "uid",
      onSuccess: () => {},
      onError: () => {},
    }),
    triggerJobsiteMutation: useMutateData<any, { aggId: string; userId: string }>({
      method: "GET",
      url: endpoints.ADMIN_CLIENT_JOBSITE, // Note: using GET for trigger as per legacy
      mutationKey: ["admin-trigger-jobsite"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteJobsiteMutation: useMutateData<any, { aggId: string; userId: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-delete-jobsite"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateJobsiteMutation: useMutateData<any, any>({
      method: "PUT",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-update-jobsite"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateUserPreferencesMutation: useMutateData<any, any>({
      method: "PATCH",
      url: endpoints.ADMIN_UPDATE_USER_PREFERENCES,
      mutationKey: ["admin-update-user-preferences"],
      paramKey: "userId" as any,
      onSuccess: () => {},
      onError: () => {},
    }),
    updateRegexQueueMutation: useMutateData<any, { value: string; variant: string }>({
      method: "POST",
      url: endpoints.ADMIN_REGEX_QUEUE,
      mutationKey: ["admin-update-regex-queue"],
      paramKey: "variant",
      onSuccess: () => {},
      onError: () => {},
    }),
    dispatchCredentialsMutation: useMutateData<any, { clientId: string }>({
      method: "GET",
      url: endpoints.ADMIN_DISPATCH_CREDENTIALS,
      mutationKey: ["admin-dispatch-credentials"],
      paramKey: "clientId",
      onSuccess: () => {},
      onError: () => {},
    }),
    dispatchClientMutation: useMutateData<any, { vaId: string; userIds: string[] }>({
      method: "POST",
      url: endpoints.ADMIN_DISPATCH_CLIENT,
      mutationKey: ["admin-dispatch-client"],
      onSuccess: () => {},
      onError: () => {},
    }),
    generatePasswordMutation: useMutateData<any, { password: string; userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_GENERATE_PASSWORD,
      mutationKey: ["admin-generate-password"],
      onSuccess: () => {},
      onError: () => {},
    }),
    sendPreferenceEmailMutation: useMutateData<any, { email: string; firstname: string }>({
      method: "POST",
      url: endpoints.ADMIN_SEND_PREFERENCE_EMAIL,
      mutationKey: ["admin-send-preference-email"],
      onSuccess: () => {},
      onError: () => {},
    }),
    fetchPreferenceEmailDetailsMutation: useMutateData<{ email: string; firstname: string }, { search: string }>({
      method: "GET",
      url: endpoints.ADMIN_SEND_PREFERENCE_EMAIL_BY_ID,
      mutationKey: ["admin-preference-email-details"],
      onSuccess: () => {},
      onError: () => {},
    }),
    notifyAdminMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_NOTIFY_ADMIN,
      mutationKey: ["admin-notify-admin"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateSheetsMutation: useMutateData<any, { id: string }>({
      method: "PATCH",
      url: endpoints.SHEETS_API,
      mutationKey: ["admin-update-sheets"],
      onSuccess: () => {},
      onError: () => {},
    }),
    coachingSessionMutation: useMutateData<any, { action: string; email: string; lastName: string; firstName: string }>({
      method: "POST",
      url: endpoints.ADMIN_COACHING_SESSION,
      mutationKey: ["admin-coaching-session"],
      onSuccess: () => {},
      onError: () => {},
    }),
    createDropdownMutation: useMutateData<any, { title: string; options: string[] }>({
      method: "POST",
      url: endpoints.ADMIN_DROPDOWN,
      mutationKey: ["admin-create-dropdown"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignKeywordsMutation: useMutateData<any, { clientId: string; table: string; isSecondary: boolean }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE_KEYWORDS,
      mutationKey: ["admin-update-campaign-keywords"],
      onSuccess: () => {},
      onError: () => {},
    }),
    runClientSampleMutation: useMutateData<any, { queue: string; environment: string; aggregator: string; processENV: string; clientId: string | number }>({
      method: "POST",
      url: endpoints.ADMIN_CLIENT_SAMPLE,
      mutationKey: ["admin-run-client-sample"],
      onSuccess: () => {},
      onError: () => {},
    }),
    dispatchSampleMutation: useMutateData<any, { clientId: string | number }>({
      method: "PATCH",
      url: endpoints.ADMIN_DISPATCH_SAMPLE,
      mutationKey: ["admin-dispatch-sample"],
      paramKey: "clientId",
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignSheetMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE,
      mutationKey: ["admin-update-campaign-sheet"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteCampaignSheetMutation: useMutateData<any, { table: string; clientId: string | number }>({
      method: "GET", // Note: legacy used GET for delete?
      url: endpoints.ADMIN_CAMPAIGN_SHEET_DELETE,
      mutationKey: ["admin-delete-campaign-sheet"],
      onSuccess: () => {},
      onError: () => {},
    }),
    extractCVDataPointsMutation: useMutateData<any, { id: string; cvType?: string }>({
      method: "POST", // Note: legacy used both POST and PUT for this
      url: endpoints.ADMIN_EXTRACT_CV_DATA_POINTS,
      mutationKey: ["admin-extract-cv-data-points"],
      onSuccess: () => {},
      onError: () => {},
    }),
    cvRevampMutation: useMutateData<any, { cvId: string; create?: boolean; action?: string; docId?: string }>({
      method: "PATCH", // Legacy used GET for create and PATCH for approve
      url: endpoints.ADMIN_CV_REVAMP,
      mutationKey: ["admin-cv-revamp-action"],
      onSuccess: () => {},
      onError: () => {},
    }),
    overrideIncrementInputsMutation: useMutateData<any, { type: string; table: string; clientId: string | number; env: string }>({
      method: "PUT",
      url: endpoints.ADMIN_CAMPAIGN_SHEET,
      mutationKey: ["admin-override-increment-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    campaignApplicationsCountMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_COUNT_APPLICATIONS,
      mutationKey: ["admin-campaign-applications-count"],
      onSuccess: () => {},
      onError: () => {},
    }),
    toggleCampaignAggregatorMutation: useMutateData<any, { MySQLClientId: number; jobSite: string }>({
      method: "PUT",
      url: endpoints.ADMIN_CAMPAIGN_COUNT_APPLICATIONS,
      mutationKey: ["admin-toggle-campaign-aggregator"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignSheetBulkMutation: useMutateData<any, { table: string; data: any[] }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE}?table=${params?.table}`,
      mutationKey: ["admin-update-campaign-sheet-bulk"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignSheetSingleMutation: useMutateData<any, { table: string; id: string | number; data: any }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE_SINGLE}?table=${params?.table}&id=${params?.id}`,
      mutationKey: ["admin-update-campaign-sheet-single"],
      onSuccess: () => {},
      onError: () => {},
    }),
    flightCampaignMutation: useMutateData<any, { clientId: string | number }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_ACCOUNT_ACTION}?action=flight&clientId=${params?.clientId}`,
      mutationKey: ["admin-flight-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignMutation: useMutateData<any, { id: string | number; updateBy?: string; updatedByFName?: string; data: any }>({
      method: "PATCH",
      url: (params) => {
        let url = `${endpoints.ADMIN_CAMPAIGN}?id=${params?.id}`;
        if (params?.updateBy) url += `&updateBy=${params.updateBy}`;
        if (params?.updatedByFName) url += `&updatedByFName=${params.updatedByFName}`;
        return url;
      },
      mutationKey: ["admin-update-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "DELETE",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN}?id=${params?.id}`,
      mutationKey: ["admin-delete-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    reverseUserIdMutation: useMutateData<{ _id: string }, { clientId: string | number }>({
      method: "POST",
      url: endpoints.ADMIN_REVERSE_USER_ID,
      mutationKey: ["admin-reverse-user-id"],
      onSuccess: () => {},
      onError: () => {},
    }),
    reviewDocumentMutation: useMutateData<any, { ids: string[]; status: string }>({
      method: "PUT",
      url: endpoints.ADMIN_DOCUMENT_REVIEW,
      mutationKey: ["admin-review-document"],
      onSuccess: () => {},
      onError: () => {},
    }),
    getSignedUrlMutation: useMutateData<{ url: string }, { filePath: string }>({
      method: "GET",
      url: endpoints.ADMIN_DOCUMENTS_GET_SIGNED_URL,
      mutationKey: ["admin-get-signed-url"],
      paramKey: "filePath",
      onSuccess: () => {},
      onError: () => {},
    }),
    fileUploadMutation: useMutateData<any, FormData>({
      method: "POST",
      url: "/api/fileupload", // Not in constants yet? I'll check or add it.
      mutationKey: ["admin-file-upload"],
      onSuccess: () => {},
      onError: () => {},
    }),
    reviewDocumentPostMutation: useMutateData<any, { files: any; uid: string }>({
      method: "POST",
      url: endpoints.ADMIN_DOCUMENT_REVIEW,
      mutationKey: ["admin-review-document-post"],
      paramKey: "uid",
      onSuccess: () => {},
      onError: () => {},
    }),
    adminUpdateClientDocumentsMutation: useMutateData<any, { id: string; body: any }>({
      method: "PUT",
      url: (params) => `${endpoints.ADMIN_DOCUMENT_REVIEW}?did=${params?.id}`,
      mutationKey: ["admin-update-client-documents"],
      onSuccess: () => {},
      onError: () => {},
    }),
    generateKeywordRoleTitlesMutation: useMutateData<any, { id: string; keywords?: boolean; roleTitles?: boolean; increment?: boolean; existing?: any }>({
      method: "POST",
      url: "/api/v1/admin/generateKeywordRoleTitles", // Using v1 prefix for consistency
      mutationKey: ["admin-generate-keyword-role-titles"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateKeywordsMutation: useMutateData<any, { clientId: string; approvedJobs: string[]; declined?: boolean }>({
      method: "POST",
      url: (params) => `/api/v1/admin/update-keywords${params?.declined ? "?declined=true" : ""}`,
      mutationKey: ["admin-update-keywords-manual"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateTitlesMutation: useMutateData<any, { clientId: string; approvedJobs: string[]; declined?: boolean }>({
      method: "POST",
      url: (params) => `/api/v1/admin/update-titles${params?.declined ? "?declined=true" : ""}`,
      mutationKey: ["admin-update-titles-manual"],
      onSuccess: () => {},
      onError: () => {},
    }),
    assignVaMutation: useMutateData<any, { credId: string; VaEmail: string | null }>({
      method: "POST",
      url: endpoints.ADMIN_ASSIGN_VA,
      mutationKey: ["admin-assign-va"],
      onSuccess: () => {},
      onError: () => {},
    }),
    shortenWordsMutation: useMutateData<any, { words: string[] }>({
      method: "POST",
      url: endpoints.SHORTEN_WORDS,
      mutationKey: ["admin-shorten-words"],
      onSuccess: () => {},
      onError: () => {},
    }),
  };
};
