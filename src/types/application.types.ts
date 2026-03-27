import { ApplicationMode, ApplicationSourceType, SelectionType } from "../utils/enum";

/**
 * Application creation attributes
 */
export interface CreateApplicationInput {
  Client?: string;
  Timestamp?: string;
  Internal_Jobsite?: string;
  External_Jobsite?: string;
  Country?: string;
  All_Words?: string;
  Status?: string;
  Category?: string;
  Job_Title?: string;
  JobId?: string;
  Location?: string;
  Question?: string;
  Selection?: string;
  Options?: string;
  Job_Type?: string;
  Advertiser?: string;
  Screenshot?: string;
  Classification?: string;
  Date_Advertised?: string;
  Run_Source?: string;
  SeekAnswersSource?: string;
  client_id?: number;
  bot_responsible?: string;
  SelectionType?: string;
  FailedCount?: number;
  Requestor?: string;
  updateBy?: string;
  Application_Source?: string;
  isDeleted?: boolean;
  InternalJobsite?: string;
  ExternalJobsite?: string;
  Allwords?: string;
  Application_Mode?: string;
  Sample_Type?: string;
  ApplicationSubmittedBy?: string;
  MatchLevel?: string;
}

/**
 * Application update attributes
 */
export interface UpdateApplicationInput {
  Status?: string;
  FailedCount?: number;
  updateBy?: string;
  isDeleted?: boolean;
  bot_responsible?: string;
  SelectionType?: string;
  MatchLevel?: string;
}

/**
 * Application filter options
 */
export interface ApplicationFilters {
  Client?: string;
  Country?: string;
  Status?: string;
  Category?: string;
  Job_Title?: string;
  JobId?: string;
  Location?: string;
  Application_Source?: string;
  Application_Mode?: string;
  bot_responsible?: string;
  client_id?: number;
  isDeleted?: boolean;
  startDate?: string;
  endDate?: string;
}

/**
 * Summary update input
 */
export interface SummaryUpdateInput {
  totalApplications?: number;
  successCount?: number;
  failedCount?: number;
  pendingCount?: number;
}

/**
 * Aggregated counts by source
 */
export interface CountBySource {
  Generic?: number;
  Seek?: number;
  Indeed?: number;
  LinkedIn?: number;
  Jora?: number;
  CareerOne?: number;
  Other?: number;
}

/**
 * Aggregated counts by mode
 */
export interface CountByMode {
  Attended?: number;
  Unattended?: number;
}

/**
 * Application statistics response
 */
export interface ApplicationStatistics {
  totalApplications: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
  failureRate: number;
  countBySource: CountBySource;
  countByMode: CountByMode;
  countByCountry: Record<string, number>;
  countByStatus: Record<string, number>;
  lastCalculatedAt: Date | null;
  totalReferredClients?: number;
  interviewPrepCount?: number;
  sessionCount?: number;
}
