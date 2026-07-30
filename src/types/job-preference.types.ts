import { AggregatorLink } from "./aggregator.types";

export interface OptionType {
  label: string;
  value: string | number | boolean;
}

export interface JobPreferenceFormData {
  role?: string;
  titles?: OptionType[];
  titlesExcluded?: OptionType[];
  keywordsExcluded?: OptionType[];
  keywords?: OptionType[];
  country?: OptionType | null;
  stateExcluded?: OptionType[];
  includedJobTitles?: OptionType[];
  cityExcluded?: OptionType[];
  locations?: OptionType[] | null;
  municipals?: OptionType[] | null;
  municipalsExcluded?: OptionType[] | null;
  city?: OptionType[];
  advertisers?: OptionType[];
  advertisersExcluded?: OptionType[];
  jobTypes?: OptionType[];
  jobTypesExcluded?: OptionType[];
  minSalary?: { label: string; value: number } | null;
  maxSalary?: { label: string; value: number } | null;
  industries?: { id: string; name: string }[];
  industriesIncluded?: { id: string; name: string }[];
  industriesExcluded?: { id: string; name: string }[];
  situationIncluded?: string[];
  situationExcluded?: string[];
  classifications?: { id: string; name: string }[];
  classificationsIncluded?: { id: string; name: string }[];
  classificationsExcluded?: { id: string; name: string }[];
  workingRight?: OptionType[];
  body?: OptionType[];
  bodyExcluded?: OptionType[];
  coverletterIncluded?: boolean;
  additionalComments?: string;
  socialSecurityNumber?: string;
  taxIdentificationNumber?: string;
  maritalStatus?: string;
  disabilityStatus?: string;
  dateOfBirth?: string;
  veteran?: boolean;
  isResumeVariationDeveloped?: boolean;
  isAiForCriteriaSelectionAllowed?: boolean;
  questions?: any[];
  aggregators?: AggregatorLink[];
}

export interface JobPreferenceSet {
  id: string;
  name: 'primary' | 'secondary';
  data: JobPreferenceFormData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobPreference {
  id: string;
  userId: string;
  name: 'primary' | 'secondary';
  data: JobPreferenceFormData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobPreferenceCreate {
  userId: string;
  name: 'primary' | 'secondary';
  data: JobPreferenceFormData;
  isActive?: boolean;
}

export interface IJobPreferenceUpdate {
  name?: 'primary' | 'secondary';
  data?: JobPreferenceFormData;
  isActive?: boolean;
}

export interface IJobPreferenceResponse {
  id: string;
  userId: string;
  name: 'primary' | 'secondary';
  data: JobPreferenceFormData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobPreferenceQuery {
  step01?: boolean;
  step02?: boolean;
  step03?: boolean;
  step04?: boolean;
  isDashboard?: boolean;
}