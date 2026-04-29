import { useFetchData, useMutateData } from "../../useApi";
import {
  ADMIN_AUDIT_TRAIL,
  ADMIN_AUDIT_TRAIL_PASSKEY,
  ADMIN_AUDIT_TRAIL_PASSKEY_VERIFY,
  USER_STAFF,
} from "@/constants/apiEndpoints/admin.endpoint";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export interface AuditTrailEntry {
  _id: string;
  userId: string;
  userAgent: string;
  queryParameters: Record<string, any>;
  requestBody: Record<string, any>;
  url: string;
  method: string;
  headers: Record<string, any>;
  createdAt: string;
  fullName: string;
  email: string;
  description?: string;
  dataEntry?: any;
}

export interface AuditTrailPagination {
  totalTrails: number;
  totalPages: number;
  currentPage: number;
}

export interface StaffUser {
  id?: string;
  Full_Name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export interface AuditTrailQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  userEmail?: string;
}

/**
 * Hook for fetching audit trail data from the Express backend.
 * Maps to /api/v1/audit-trail endpoints.
 */
export const useAuditTrailQueries = (options: AuditTrailQueryOptions = {}) => {
  const {
    enabled = true,
    page = 1,
    pageSize = 100,
    search = "",
    userEmail = "",
  } = options;

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.append("page", String(page));
  queryParams.append("pageSize", String(pageSize));
  if (search) queryParams.append("search", search);
  if (userEmail) queryParams.append("search", userEmail);

  const auditTrails = useFetchData<{
    data: AuditTrailEntry[];
    pagination: AuditTrailPagination;
  }>({
    method: "GET",
    url: `${ADMIN_AUDIT_TRAIL}?${queryParams.toString()}`,
    queryKey: ["admin-audit-trail", page, pageSize, search, userEmail],
    enabled,
  });

  const staffUsers = useFetchData<{ users: StaffUser[] }>({
    method: "GET",
    url: USER_STAFF,
    queryKey: ["admin-staff-users"],
    enabled,
  });

  return {
    auditTrailDomain: {
      data: auditTrails.data?.data?.data ?? [],
      pagination: auditTrails.data?.data?.pagination,
      isLoading: auditTrails.isLoading,
      isFetching: auditTrails.isFetching,
      isSuccess: auditTrails.isSuccess,
      isError: auditTrails.isError,
      error: auditTrails.error,
      refetch: auditTrails.refetch,
    },
    staffUsersDomain: {
      data: staffUsers.data?.data?.users ?? [],
      isLoading: staffUsers.isLoading,
      isSuccess: staffUsers.isSuccess,
      isError: staffUsers.isError,
      error: staffUsers.error,
    },
  };
};

/**
 * Hook for audit trail mutations (passkey management).
 */
export const useAuditTrailMutations = () => {
  const queryClient = useQueryClient();

  const verifyPasskeyMutation = useMutateData<
    { valid: boolean },
    { passKey: string }
  >({
    method: "POST",
    url: ADMIN_AUDIT_TRAIL_PASSKEY_VERIFY,
    mutationKey: ["admin-audit-trail-verify-passkey"],
    onSuccess: (response) => {
      if (response.data?.valid) {
        toast.success("Access granted");
      } else {
        toast.error("Invalid passkey");
      }
    },
    onError: () => {
      toast.error("Failed to verify passkey");
    },
  });

  const setPasskeyMutation = useMutateData<null, { passKey: string }>({
    method: "POST",
    url: ADMIN_AUDIT_TRAIL_PASSKEY,
    mutationKey: ["admin-audit-trail-set-passkey"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-audit-trail"] });
      toast.success("Passkey updated successfully");
    },
    onError: () => {
      toast.error("Failed to update passkey");
    },
  });

  return {
    verifyPasskeyMutation,
    setPasskeyMutation,
  };
};
