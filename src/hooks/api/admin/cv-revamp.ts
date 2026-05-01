import { useFetchData, useMutateData } from "../../useApi";
import { ADMIN_CV_REVAMP } from "@/constants/apiEndpoints/admin.endpoint";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export interface CvRevamp {
  _id: string;
  sourceFile: {
    _id: string;
    fileName: string;
    url: string;
  };
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  fullName: string;
  url: string;
  status: "pending" | "approved" | "declined";
  fileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CvRevampQueryOptions {
  enabled?: boolean;
  docId?: string;
  userId?: string;
}

/**
 * Hook for fetching CV revamp data
 */
export const useCvRevampQueries = (options: CvRevampQueryOptions = {}) => {
  const { enabled = true, docId, userId } = options;

  // Build query params
  const queryParams = new URLSearchParams();
  if (docId) queryParams.append("docId", docId);
  if (userId) queryParams.append("userId", userId);
  const queryString = queryParams.toString();
  const url = queryString ? `${ADMIN_CV_REVAMP}?${queryString}` : ADMIN_CV_REVAMP;

  const cvRevamps = useFetchData<CvRevamp[]>({
    method: "GET",
    url,
    queryKey: ["admin-cv-revamps", docId, userId],
    enabled,
  });

  return {
    cvRevampsDomain: {
      data: cvRevamps.data?.data ?? [],
      isLoading: cvRevamps.isLoading,
      isFetching: cvRevamps.isFetching,
      isSuccess: cvRevamps.isSuccess,
      isError: cvRevamps.isError,
      error: cvRevamps.error,
      refetch: cvRevamps.refetch,
    },
  };
};

/**
 * Hook for CV revamp mutations
 */
export const useCvRevampMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCvRevampQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-cv-revamps"] });
  };

  // Create CV revamp
  const createCvRevampMutation = useMutateData<
    CvRevamp,
    { sourceFile?: string; userId: string; fullName: string; url: string; fileName?: string }
  >({
    method: "POST",
    url: ADMIN_CV_REVAMP,
    mutationKey: ["admin-create-cv-revamp"],
    onSuccess: () => {
      invalidateCvRevampQueries();
      toast.success("CV revamp created successfully");
    },
    onError: () => {
      toast.error("Failed to create CV revamp");
    },
  });

  // Create CV revamp from existing CV (legacy format)
  const createFromCvMutation = useMutateData<CvRevamp, { cvId: string }>({
    method: "GET",
    url: (params) => `${ADMIN_CV_REVAMP}?cvId=${params?.cvId}&create=true`,
    mutationKey: ["admin-create-cv-revamp-from-cv"],
    onSuccess: () => {
      invalidateCvRevampQueries();
      toast.success("CV revamp initiated successfully");
    },
    onError: () => {
      toast.error("Failed to initiate CV revamp");
    },
  });

  // Approve CV revamp
  const approveCvRevampMutation = useMutateData<CvRevamp, { docId: string }>({
    method: "PATCH",
    url: (params) => `${ADMIN_CV_REVAMP}?docId=${params?.docId}&action=approved`,
    mutationKey: ["admin-approve-cv-revamp"],
    onSuccess: () => {
      invalidateCvRevampQueries();
      toast.success("CV revamp approved successfully");
    },
    onError: () => {
      toast.error("Failed to approve CV revamp");
    },
  });

  // Decline CV revamp
  const declineCvRevampMutation = useMutateData<CvRevamp, { docId: string }>({
    method: "PATCH",
    url: (params) => `${ADMIN_CV_REVAMP}?docId=${params?.docId}&action=declined`,
    mutationKey: ["admin-decline-cv-revamp"],
    onSuccess: () => {
      invalidateCvRevampQueries();
      toast.success("CV revamp declined");
    },
    onError: () => {
      toast.error("Failed to decline CV revamp");
    },
  });

  // Delete CV revamp
  const deleteCvRevampMutation = useMutateData<CvRevamp, { id: string }>({
    method: "DELETE",
    url: (params) => `${ADMIN_CV_REVAMP}/${params?.id}`,
    mutationKey: ["admin-delete-cv-revamp"],
    onSuccess: () => {
      invalidateCvRevampQueries();
      toast.success("CV revamp deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete CV revamp");
    },
  });

  return {
    createCvRevampMutation,
    createFromCvMutation,
    approveCvRevampMutation,
    declineCvRevampMutation,
    deleteCvRevampMutation,
  };
};
