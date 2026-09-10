import { useMemo } from "react";
import { useFetchData, useMutateData } from "@/hooks/useApi";
import toast from "react-hot-toast";

// Endpoint URL: GET /v1/admin/users
export const USER_ALL_ENDPOINT = "/api/v1/admin/users";

// Type Definitions for User Object
interface UserReview {
  hr: boolean;
  pc: boolean;
  po: boolean;
  csr: boolean;
}

interface ServiceHistoryItem {
  to: string;
  date: string;
  from: string;
}

export interface User {
  id: string;
  uniqueId: string | null;
  zohoId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  gender: string;
  middleName: string;
  businessName: string | null;
  customerClass: string;
  phoneNumber: string;
  whatsappNumber: string;
  profilePicture: string | null;
  socials: any[];
  country: string;
  slackId: string | null;
  promotionalCount: number;
  numberOfReferralsBeforePromo: number;
  numberOfFreePromo: number;
  numberOfFreePromoCount: number;
  review: UserReview[];
  serviceHistory: ServiceHistoryItem[];
  isApplicationStarted: boolean;
  resetTokenVerified: boolean;
  applicationStatus: string;
  paymentStatus: string;
  totalAmountPaid: string;
  prepSessionStatus: number;
  isSampleResultsAccepted: boolean | null;
  isEmailVerified: boolean;
  isActive: boolean;
  isUserSubscribed: boolean;
  isDocumentApproved: boolean;
  isDocumentUploaded: boolean;
  hasOpenedJobsiteProfile: boolean;
  updatedBy: string;
  progress: string;
  profileId: string;
  secondaryProfileId: string | null;
  role: string;
  manager: boolean;
  agreeToTerms: boolean;
  permissions: any[];
  bankName: string | null;
  bsbCode: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  isSampleDispatched: string;
  returnCount: number;
  isSampleAccepted: boolean | null;
  stars: number;
  promotionCode: string | null;
  allowFreeBeforeReferal: boolean;
  userSessionsMilestones: any[];
  currentCityOfResidence: string;
  selectedPlan: string | null;
  plan: string | null;
  revenue: string;
  locationId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsersAllResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    count: number;
  };
  statusCode: number;
}

// Custom Hook for fetching all users. Only takes active/recycle — those are
// genuinely different server-side populations (isDeleted true vs false).
// Search/role/plan/date-range are NOT sent to the backend: the full
// active-or-recycle set is fetched once and UsersDataTable filters it
// client-side instead, so typing in the search box or switching a dropdown
// doesn't trigger a new network round trip.
export const useGetAllUsers = (options: {
  enabled?: boolean;
  active?: boolean;
  recycle?: boolean;
} = {}) => {
  const { enabled = true, active, recycle } = options;

  const params: Record<string, any> = {};

  // Send boolean values as string 'true'/'false' as expected by Express backend parser
  if (active !== undefined) params.active = String(active);
  if (recycle !== undefined) params.recycle = String(recycle);

  const queryKey = useMemo(() => [
    "users-all",
    active ?? null,
    recycle ?? null,
  ], [active, recycle]);

  const usersQuery = useFetchData<UsersAllResponse>({
    method: "GET",
    url: USER_ALL_ENDPOINT,
    queryKey,
    params,
    enabled,
  });

  // Memoize returned object with explicit dependencies to prevent stable reference issues
  return useMemo(() => ({
    users: (usersQuery.data as any)?.data?.users || [],
    totalCount: (usersQuery.data as any)?.data?.count || 0,
    isLoading: usersQuery.isLoading,
    isSuccess: usersQuery.isSuccess,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
  }), [
    usersQuery.data,
    usersQuery.isLoading,
    usersQuery.isSuccess,
    usersQuery.isError,
    usersQuery.error,
    usersQuery.refetch
  ]);
};

/**
 * Mutation hook for updating user details
 * Endpoint: PATCH /v1/users/{userId}
 */
export const useUpdateUser = () => {
  return useMutateData({
    method: "PATCH",
    url: "/api/v1/user-management/users",
    mutationKey: ["update-user"],
    paramKey: "id",
    onSuccess: () => {
    },
    onError: () => {
    },
  });
};

/**
 * Approve user document
 * Endpoint: POST /v1/user-management/users/documents/{documentId}/approve
 */
export const useApproveDocument = () => {
  return useMutateData<any, { documentId: string }>({
    method: "POST",
    url: (data) => `/api/v1/user-management/users/documents/${data.documentId}/approve`,
    mutationKey: ["approve-document"],
    onSuccess: (data) => {
    },
    onError: (error: any) => {
    },
  });
};

/**
 * Reject user document
 * Endpoint: POST /v1/user-management/documents/{documentId}/reject
 */
export const useRejectDocument = () => {
  return useMutateData<any, { documentId: string }>({
    method: "POST",
    url: (data) => `/api/v1/user-management/documents/${data.documentId}/reject`,
    mutationKey: ["reject-document"],
    onSuccess: (data) => {
    },
    onError: (error: any) => {
    },
  });
};

/**
 * Get pending documents for user
 * Endpoint: GET /v1/user-management/users/{userId}/documents/pending
 */
export const useGetUserPendingDocuments = (userId: string, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  
  const queryKey = useMemo(() => [
    "user-pending-documents", 
    userId
  ], [userId]);

  return useFetchData({
    method: "GET",
    url: userId ? `/api/v1/user-management/users/${userId}/documents/pending` : "",
    queryKey,
    enabled: enabled && !!userId,
  });
};

/**
 * Approve user account
 * Endpoint: POST /v1/user-management/users/{userId}/approve
 */
export const useApproveUserAccount = () => {
  return useMutateData<any, { userId: string }>({
    method: "POST",
    url: (data) => `/api/v1/user-management/users/${data.userId}/approve`,
    mutationKey: ["approve-user-account"],
    onSuccess: (data) => {
    },
    onError: (error: any) => {
    },
  });
};

/**
 * Delete user
 * Endpoint: DELETE /v1/user-management/users/{userId}
 */
export const useDeleteUser = () => {
  return useMutateData<any, { userId: string }>({
    method: "DELETE",
    url: (data) => `/api/v1/user-management/users/${data.userId}`,
    mutationKey: ["delete-user"],
    onSuccess: (data) => {
    },
    onError: (error: any) => {
    },
  });
};

/**
 * Dispatch sample result / Send slack sample
 * Endpoint: POST /v1/user-management/users/{userId}/send-slack-sample
 */
export const useSendSlackSample = () => {
  return useMutateData<any, { userId: string }>({
    method: "POST",
    url: (data) => `/api/v1/user-management/users/${data.userId}/send-slack-sample`,
    mutationKey: ["send-slack-sample"],
    onSuccess: (data) => {
    },
    onError: (error: any) => {
    },
  });
};

/**
 * Soft delete user
 * Endpoint: DELETE /v1/user-management/users/{userId}
 */
export const useSoftDeleteUser = () => {
  return useMutateData<any, { userId: string }>({
    method: "DELETE",
    url: (data) => `/api/v1/user-management/users/${data.userId}`,
    mutationKey: ["soft-delete-user"],
    onSuccess: () => {},
    onError: () => {},
  });
};

/**
 * Bulk soft delete users (move to recycle bin)
 * Sends a single consolidated Slack notification server-side instead of one per user.
 * Endpoint: DELETE /v1/user-management/users/bulk
 */
export const useBulkSoftDeleteUsers = () => {
  return useMutateData<
    { deletedCount: number; failedCount: number; failures: { id: string; reason: string }[] },
    { userIds: string[] }
  >({
    method: "DELETE",
    url: "/api/v1/user-management/users/bulk",
    mutationKey: ["bulk-soft-delete-users"],
    onSuccess: () => {},
    onError: () => {},
  });
};

/**
 * Bulk permanently purge deleted users
 * Sends a single consolidated Slack notification server-side instead of one per user.
 * Endpoint: DELETE /v1/user-management/users/bulk/purge
 */
export const useBulkPurgeUsers = () => {
  return useMutateData<
    { deletedCount: number; failedCount: number; failures: { id: string; reason: string }[] },
    { userIds: string[] }
  >({
    method: "DELETE",
    url: "/api/v1/user-management/users/bulk/purge",
    mutationKey: ["bulk-purge-users"],
    onSuccess: () => {},
    onError: () => {},
  });
};

/**
 * Restore soft deleted user
 * Endpoint: POST /v1/user-management/users/{userId}/restore
 */
export const useRestoreUser = () => {
  return useMutateData<any, { userId: string }>({
    method: "POST",
    url: (data) => `/api/v1/user-management/users/${data.userId}/restore`,
    mutationKey: ["restore-user"],
    onSuccess: () => {},
    onError: () => {},
  });
};

/**
 * Permanently purge deleted user
 * Endpoint: DELETE /v1/user-management/users/{userId}/purge
 */
export const usePurgeUser = () => {
  return useMutateData<any, { userId: string }>({
    method: "DELETE",
    url: (data) => `/api/v1/user-management/users/${data.userId}/purge`,
    mutationKey: ["purge-user"],
    onSuccess: () => {},
    onError: () => {},
  });
};
