export interface CampaignClientData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  uniqueId: string;
  country?: string;
  id: string;
}

export interface HandleCampaignManagementParams {
  host: string;
  updatedClient: CampaignClientData;
  plan: string;
  userId: string;
  baseURL: string;
}

export interface CampaignCredentialsData {
  First_Name: string;
  Middle_Name?: string;
  Last_Name: string;
  Full_Name: string;
  Batch: string | null;
  Craft?: string;
  CustomerId: string;
  Country?: string;
  Plan: string;
  CampaignEnd: string;
  SeekSubDurDays: number;
  SeekSubEndDate: string;
  Alias_Email?: string;
  Active: boolean;
}