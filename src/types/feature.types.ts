import { ILocation } from "./location.types";

export enum SubscriptionTier {
  EMERALD = "Emerald",
  CORAL = "Coral",
  FREE = "Free",
  COPPER = "Copper",
  BRONZE = "Bronze",
  SILVER = "Silver",
  GOLD = "Gold",
  PLATINUM = "Platinum",
}

export interface IFeature {
  id: string;
  title: string;
  tier: SubscriptionTier;
  price: number;
  jobApplications: number;
  cvResumeRequests: number;
  screeningPrep?: number;
  interviewPrep?: number;
  resumeDevelopment?: number;
  validityPeriod: string;
  pauseOptionMonths: number;
  subscriptionBreak: string;
  profileLimit: number;
  isTopUp: boolean;
  description?: string;
  extra?: string;
  isActive: boolean;
  locationIds: string[];
  createdAt: Date;
  updatedAt: Date;
  locations?: ILocation[];
}