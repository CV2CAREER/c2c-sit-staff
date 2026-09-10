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

export interface VaAllocationsMetadata {
  totalInflightClients: number;
  allocatedCount: number;
  unallocatedCount: number;
  activePCsWithClientsCount: number;
  totalActivePCsCount: number;
  viewMode: string;
}

export interface VaAllocationsResponse {
  parsedData: VaAllocationsData;
  metadata: VaAllocationsMetadata;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface MilestoneStat {
  month: string;
  commenced: number;
  hold: number;
  expired: number;
  offerNotification: number;
}

export type PipelineRangeKey = "today" | "week" | "month" | "quarter" | "year" | "all";

export interface PipelineCoverageController {
  name: string;
  count: number;
  sharePct: number;
}

export interface PipelineCoverage {
  totalInFlight: number;
  allocated: number;
  unallocated: number;
  controllerCount: number;
  minLoad: number;
  maxLoad: number;
  topController: PipelineCoverageController | null;
}

export interface PipelineStats {
  range: PipelineRangeKey;
  from: string | null;
  to: string;
  paidNotInFlight: number;
  onboarding: number;
  unallocatedInFlight: number;
  inFlight: number;
  completed: number;
  coverage: PipelineCoverage;
  generatedAt: string;
}

export interface DashboardListItem {
  id: string;
  name: string;
  journeyStepKey: string | null;
  journeyPhaseKey: string | null;
  daysAgo: number;
}

export interface PipelineLists {
  paidNotInFlight: DashboardListItem[];
  onboarding: DashboardListItem[];
  unallocatedQueue: DashboardListItem[];
  generatedAt: string;
}

export type AssignmentRoleKey = "dpc" | "vpc" | "spc" | "interimdpc" | "interimspc";

export interface AssignmentRoleValue {
  name: string | null;
  email: string | null;
  load: number;
}

export interface AssignmentRow {
  credId: string;
  clientId: string | null;
  name: string;
  dpc: AssignmentRoleValue;
  vpc: AssignmentRoleValue;
  spc: AssignmentRoleValue;
  interimdpc: AssignmentRoleValue;
  interimspc: AssignmentRoleValue;
  industry: string | null;
  subEnd: string | null;
  days: number | null;
  gaps: number;
  capitalized: string | null;
}

export interface AssignableController {
  name: string;
  email: string;
}

export interface PlacementAssignments {
  rows: AssignmentRow[];
  controllers: AssignableController[];
  generatedAt: string;
}

export interface AssignmentRowDetail {
  row: AssignmentRow;
  controllers: AssignableController[];
}

export interface ClientComment {
  id: string;
  authorName: string;
  comment: string;
  createdAt: string;
}

export type ExceptionLevel = "warn" | "bad";

export interface ExceptionRow {
  credId: string;
  name: string;
  reason: string;
  level: ExceptionLevel;
  status: string | null;
  dpc: string | null;
  subEnd: string | null;
  days: number | null;
}

export interface PlacementExceptions {
  rows: ExceptionRow[];
  lapsedCount: number;
  renewalCount: number;
  holdCount: number;
  noDateCount: number;
  generatedAt: string;
}

export type PerformanceRange = "1d" | "5d";

export interface BookClient {
  clientId: string;
  name: string;
  days: number | null;
  subEnd: string | null;
}

export interface Standing {
  met: boolean;
  missed: string[];
}

export interface DpcPerformanceRow {
  name: string;
  email: string | null;
  score: number;
  jobs: number;
  clientsAt15: number;
  clientsAssigned: number;
  vetThrough: number;
  lqaRate: number;
  standing: Standing;
  book: BookClient[];
}

export interface VpcPerformanceRow {
  name: string;
  email: string | null;
  score: number;
  vetted: number;
  queueEntries: number;
  queueScore: number;
  high: number;
  med: number;
  low: number;
  standing: Standing;
  book: BookClient[];
}

export interface SpcPerformanceRow {
  name: string;
  email: string | null;
  score: number;
  submitted: number;
  queueEntries: number;
  queueScore: number;
  clientsClear: number;
  clientsAssigned: number;
  standing: Standing;
  book: BookClient[];
}

export interface DayCard {
  date: string;
  dow: string;
  label: string;
  value: number;
  isLatestActive: boolean;
}

export interface PlacementPerformance {
  range: PerformanceRange;
  windowLabel: string;
  headline: string;
  dayCards: DayCard[];
  dpc: DpcPerformanceRow[];
  vpc: VpcPerformanceRow[];
  spc: SpcPerformanceRow[];
  generatedAt: string;
}

export interface HeroStat {
  key: string;
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "bad";
  href: string | null;
}

export interface RuleChip {
  id: string;
  label: string;
  available: boolean;
  count: number;
}

export interface CrackRow {
  credId: string;
  name: string;
  reasons: string[];
  dpc: string | null;
  days: number | null;
}

export interface FunnelStage {
  label: string;
  value: number;
}

export interface TopBottomEntry {
  role: "DPC" | "VPC" | "SPC";
  name: string | null;
  score: number | null;
  detail: string;
}

export interface PlacementOverview {
  range: PerformanceRange;
  windowLabel: string;
  hero: HeroStat[];
  crackChips: RuleChip[];
  crackRows: CrackRow[];
  crackNote: string;
  topPerformers: TopBottomEntry[];
  bottomPerformers: TopBottomEntry[];
  funnel: FunnelStage[];
  generatedAt: string;
}

export interface ApplicationsPeriodStat {
  total: number;
  successful: number;
  failed: number;
}

export interface ApplicationsPeriodBreakdown {
  today: ApplicationsPeriodStat;
  week: ApplicationsPeriodStat;
  month: ApplicationsPeriodStat;
  quarter: ApplicationsPeriodStat;
  year: ApplicationsPeriodStat;
}

export interface AdminQueriesOptions {
  fetchVaAllocations?: boolean;
  fetchPipelineStats?: boolean;
  fetchPipelineLists?: boolean;
  fetchPlacementAssignments?: boolean;
  fetchPlacementExceptions?: boolean;
  pipelineRange?: PipelineRangeKey;
  fetchApplicationsPeriodBreakdown?: boolean;
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
  fetchClientJourney?: boolean;
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
