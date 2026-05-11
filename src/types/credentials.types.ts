export interface SeekExternalCredentials {
  [key: string]: unknown;
}

export interface CredentialsAttributes {
  id?: string;
  seekEmail?: string;
  seekPassword?: string;
  seekCredentialsTest?: string;
  seekCredentialsTestDate?: string;
  SeekAnswerPriority?: string;
  currentCity?: string;
  onboardingDate?: string;
  criteriaReviewCompleted?: string;
  referrer?: string;
  blacklisted?: string;
  seekLoginType?: string;
  seekExternalCredentials?: SeekExternalCredentials;
  clientId?: string;
}
