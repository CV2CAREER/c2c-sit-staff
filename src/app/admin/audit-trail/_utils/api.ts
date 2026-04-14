import axiosInstance from "@/services/api-client";
import {
  ADMIN_AUDIT_TRAIL,
  ADMIN_AUDIT_TRAIL_PASSKEY,
  ADMIN_AUDIT_TRAIL_PASSKEY_VERIFY,
  ADMIN_USERS,
  USER_STAFF,
} from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export interface AdminUser {
  id?: string;
  Full_Name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export interface AuditTrailPagination {
  totalTrails: number;
  totalPages: number;
  currentPage: number;
}

export interface AuditTrailResponse {
  data: any[];
  pagination?: AuditTrailPagination;
}

export const fetchAuditTrails = async (
  queryString: string
): Promise<AuditTrailResponse> => {
  const response = await axiosInstance.get<
    ApiSuccess<{ data: any[]; pagination: AuditTrailPagination }>
  >(`${ADMIN_AUDIT_TRAIL}?${queryString}`);

  return response.data.data;
};

export const fetchStaffUsers = async (): Promise<AdminUser[]> => {
  const response = await axiosInstance.get<ApiSuccess<{ users: AdminUser[] }>>(USER_STAFF);
  return response.data.data.users;
};

export const verifyPassKey = async (passKey: string): Promise<boolean> => {
  const response = await axiosInstance.post<
    ApiSuccess<{ valid: boolean }>
  >(ADMIN_AUDIT_TRAIL_PASSKEY_VERIFY, { passKey });

  return response.data.data.valid;
};

export const setDbPassKey = async (passKey: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post<ApiSuccess<null>>(
    ADMIN_AUDIT_TRAIL_PASSKEY,
    { passKey },
  );

  return { message: response.data.message };
};

export const updateUserDetails = async (
  payload: any,
  id: string,
): Promise<{ message: string }> => {
  // Keep placeholder until a dedicated audit trail edit API is available.
  return Promise.resolve({ message: "Changes saved successfully (stub)" });
};

export const sendNotification = (): void => {
  // Placeholder utility.
};
