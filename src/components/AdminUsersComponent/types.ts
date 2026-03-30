import { Persona } from "@/constants/viewAsRules";

export interface Pagination {
    currentPage: number;
    totalPages: number;
    totalUser: number;
    totalGuest: number;
    totalClient: number;
    totalPartner: number;
    totalSales: number;
    totalCse: number;
    totalCoach: number;
    totalAdmin: number;
    totalTests: number;
  }
  
  export interface ZohoInvoice {
    hasPaid: boolean;
    invoiceUrl: string;
  }
  
  export interface InvoiceData {
    zohoInvoices?: ZohoInvoice[];
  }
  
  export interface Profile {
    isActive: boolean;
    _id: string;
  }
  
  export interface Coach {
    createdAt: string;
    isAccredited: boolean;
    updatedAt: string;
    user: string;
    _id: string;
    isDeleted?: boolean;
  }
  
  export interface PlanData {
    createdAt: string;
    expiresAt: string;
    hasExpired: boolean;
    validityPeriod: string;
  }
  
  export interface User {
    updatedAt: string;
    invoiceData?: InvoiceData;
    hasResume: boolean;
    hasCoverLetter: boolean;
    profile?: Profile;
    _id: string;
    coach?: Coach;
    planData?: PlanData;
    driveUrl?: string;
    country: string;
    createdAt: string;
    email: string;
    firstName: string;
    isUserSubscribed: boolean;
    lastName: string;
    progress: string;
    middleName: string;
    plan: string;
    role: Persona;
    phoneNumber: string;
    whatsappNumber: string;
    isDocumentApproved: boolean;
    isDocumentUploaded: boolean;
    customerClass: string;
    updatedBy: string;
    socials: string[];
    slackId: string;
  }
  
  export interface UserDataResponse {
    pagination: Pagination;
    filteredData: User[];
  }
  