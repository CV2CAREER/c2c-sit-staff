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
export interface MilestoneStat {
  month: string;
  commenced: number;
  hold: number;
  expired: number;
  offerNotification: number;
}

export interface AdminQueriesOptions {
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
  fetchTotalUsersCount?: boolean;
  fetchTotalGuestsCount?: boolean;
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
  fetchSingleClient?: boolean;
  clientId?: string;
  fetchClientApplications?: boolean;
  fetchClientTours?: boolean;
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
    credentialsTourId?: string | null;
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
  fetchClientSampleUsers?: boolean;
  fetchClientSampleTable?: boolean;
  sampleTableVariance?: string;
  selectedJobsite?: string;
  selectedEnv?: string;
  fetchAdminLocations?: boolean;
  fetchPricingPlans?: boolean;
  locationId?: string;
  fetchSlackQueue?: boolean;
  slackQueue?: string;
  fetchResources?: boolean;
  resourceType?: string;
  fetchTrainingSessions?: boolean;
  fetchTrainingTracker?: boolean;
  trainingSessionNumber?: number | null;
  trainingIsDeleted?: boolean;

  // CR Tracking
  fetchCRTrackingData?: boolean;
  crTrackingDataState?: string;
  fetchEOTData?: boolean;
  fetchCRTrackingOptions?: boolean;
  fetchCRHistory?: boolean;
  crHistoryCustomId?: string;
  crHistoryId?: string;
  crHistoryPage?: number;
  fetchEOTCRs?: boolean;
  fetchEOTOwners?: boolean;
  fetchUnsubscribedUsers?: boolean;
  fetchJobsiteCredentials?: boolean;
  fetchClientJobsiteCredential?: boolean;
  fetchSystemLogs?: boolean;
  logsPage?: number;
  logsLimit?: number;
  logsSearch?: string;
  logsType?: string;
  fetchChatbotTrainer?: boolean;
  fetchChatbotLogs?: boolean;
  chatbotLogsDate?: string;
  
  // User Management Page
  fetchFeatureTitles?: boolean;
  fetchUserPreferencesV2?: boolean;
  fetchUserPreferencesHistory?: boolean;
  fetchUserReferrals?: boolean;
  fetchUserDocuments?: boolean;
  fetchClientSupportDocuments?: boolean;
  fetchUserProfileSafe?: boolean;
  fetchUserProgress?: boolean;
}
