import { AggregatorLink } from "./aggregator.types";
import { IPlan } from "./plan.types";
import { IUser } from "./user.types";

export interface Classification {
  id?: string;
  name?: string;
  code?: string;
  [key: string]: any;
}

// Interface for JSONB columns
export interface Question {
  question: string;
  answer: string;
  private: boolean;
}

export interface IProfile {
  id: string;

  userId?: string;
  user?: IUser;

  planId?: string;
  plan?: IPlan;

  role?: string;

  titles?: string[];
  titlesExcluded?: string[];

  keywords?: string[];
  keywordsExcluded?: string[];

  includedJobTitles?: string[];

  advertisers?: string[];
  advertisersExcluded?: string[];

  jobTypes?: string[];

  minSalary?: number;
  maxSalary?: number;

  classifications?: Classification[];
  classificationsExcluded?: Classification[];

  workingRight?: string[];

  country?: string;

  state?: string[];
  city?: string[];
  locations?: string[];

  stateExcluded?: string[];

  municipals?: string[];
  municipalsExcluded?: string[];

  isResumeVariationDeveloped?: boolean;

  isAiForCriteriaSelectionAllowed?: boolean;

  cityExcluded?: string[];

  body?: string[];
  bodyExcluded?: string[];

  coverletterIncluded?: boolean;

  roleKeywordExclusive?: boolean;

  additionalComments?: string;

  aggregators?: AggregatorLink[];

  isActive?: boolean;
  isSuspended?: boolean;
  isApproved?: boolean;

  socialSecurityNumber?: string;

  veteran?: boolean;

  taxIdentificationNumber?: string;

  maritalStatus?: string;

  disabilityStatus?: string;

  dateOfBirth?: string;

  questions?: Question[];

  createdAt: Date;
  updatedAt: Date;
}
