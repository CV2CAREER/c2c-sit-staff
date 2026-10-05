"use client";

import { useFetchData } from "./useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { ADMIN_APPLICATIONS, ADMIN_APPLICATION_ASSURANCE } from "@/constants/apiEndpoints/admin.endpoint";
import { toast } from "react-hot-toast";

export type ApplicationState = "active" | "recycle";

export type ApplicationTrackerFilters = {
  status: string;
  aggregator: string;
  source: string;
};

export type ApplicationRecord = {
  id: string | number;
  [key: string]: unknown;
};

type ApplicationListPayload = {
  data: ApplicationRecord[];
  pagination?: {
    totalCount?: number;
    currentPage?: number;
    pageSize?: number;
    totalPages?: number;
  };
  uniqueCount?: number;
};

type ApplicationMutationInput = {
  id: string | number;
  action?: "soft-delete" | "restore";
};

const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiError;
  }
  return {
    success: false,
    message: error instanceof Error ? error.message : "Unexpected error",
    data: null,
    statusCode: 500,
  };
};

export const useApplicationTracker = ({
  state,
  filters,
  page,
  pageSize,
}: {
  state: ApplicationState;
  filters: ApplicationTrackerFilters;
  page: number;
  pageSize: number;
}) => {
  const queryClient = useQueryClient();

  const baseParams = {
    isDeleted: state !== "active",
    ...(filters.aggregator !== "all" && { aggregator: filters.aggregator.toLowerCase() }),
    ...(filters.source !== "all" && { source: filters.source }),
  };

  const normalizeStatus = (status?: string) => {
    if (!status || status === "all") return undefined;
    const normalized = status.toLowerCase();
    if (normalized === "successful") return "Successful";
    if (normalized === "failed") return "Failed";
    if (normalized === "sample") return "Sample";
    return status;
  };

  const applicationsQuery = useFetchData<ApplicationListPayload>({
    method: "GET",
    url: ADMIN_APPLICATIONS,
    params: {
      ...baseParams,
      page: page + 1,
      pageSize,
      ...(filters.status !== "all" && { status: normalizeStatus(filters.status) }),
    },
    queryKey: ["application-tracker", state, filters, page, pageSize],
    enabled: true,
  });

  const successfulCountQuery = useFetchData<ApplicationListPayload>({
    method: "GET",
    url: ADMIN_APPLICATIONS,
    params: { ...baseParams, page: 1, pageSize: 1, status: normalizeStatus("successful") },
    queryKey: ["application-tracker-count-successful", state, filters.aggregator, filters.source],
    enabled: true,
    staleEarly: true,
  });

  const failedCountQuery = useFetchData<ApplicationListPayload>({
    method: "GET",
    url: ADMIN_APPLICATIONS,
    params: { ...baseParams, page: 1, pageSize: 1, status: normalizeStatus("failed") },
    queryKey: ["application-tracker-count-failed", state, filters.aggregator, filters.source],
    enabled: true,
    staleEarly: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["application-tracker"] });
  };

  const softDeleteApplication = useMutation<ApiSuccess<unknown>, ApiError, ApplicationMutationInput, string>({
    mutationKey: ["application-tracker-soft-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(`${ADMIN_APPLICATIONS}/${id}`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => {
      return toast.loading("Moving application to recycle bin...");
    },
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Application moved to recycle bin.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to move application to recycle bin.", { id: toastId });
    },
  });

  const restoreApplication = useMutation<ApiSuccess<unknown>, ApiError, ApplicationMutationInput, string>({
    mutationKey: ["application-tracker-restore"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(`${ADMIN_APPLICATIONS}/${id}/restore`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => {
      return toast.loading("Restoring application...");
    },
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Application restored successfully.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to restore application.", { id: toastId });
    },
  });

  const deleteApplication = useMutation<ApiSuccess<unknown>, ApiError, ApplicationMutationInput, string>({
    mutationKey: ["application-tracker-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(`${ADMIN_APPLICATIONS}/${id}/permanent`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => {
      return toast.loading("Permanently deleting application...");
    },
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Application deleted permanently.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to permanently delete application.", { id: toastId });
    },
  });

  // SPR-21-58-001: record the assurance result. The server stamps who (signed-in staff
  // member) and when; pass null to clear. Admins and assistants only (server-enforced).
  const updateAssurance = useMutation<
    ApiSuccess<unknown>,
    ApiError,
    { id: string | number; assuranceStatus: "ASSURED" | "FAILED" | null },
    string
  >({
    mutationKey: ["application-tracker-assurance"],
    mutationFn: async ({ id, assuranceStatus }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(
          ADMIN_APPLICATION_ASSURANCE(id),
          { assuranceStatus },
        );
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => {
      return toast.loading("Saving assurance...");
    },
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Assurance saved.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to save assurance.", { id: toastId });
    },
  });

  // useFetchData returns ApiSuccess<T>, so .data is the ApiSuccess wrapper
  // and .data.data is the ApplicationListPayload inner object
  const rows = applicationsQuery.data?.data?.data ?? [];
  const totalCount = applicationsQuery.data?.data?.pagination?.totalCount ?? rows.length;
  const counts = {
    successful: successfulCountQuery.data?.data?.pagination?.totalCount ?? 0,
    failed: failedCountQuery.data?.data?.pagination?.totalCount ?? 0,
  };

  return {
    rows,
    totalCount,
    counts,
    isLoading: applicationsQuery.isLoading,
    isFetching: applicationsQuery.isFetching,
    isError: applicationsQuery.isError,
    error: applicationsQuery.error,
    refetch: applicationsQuery.refetch,
    softDeleteApplication,
    restoreApplication,
    deleteApplication,
    updateAssurance,
  };
};
