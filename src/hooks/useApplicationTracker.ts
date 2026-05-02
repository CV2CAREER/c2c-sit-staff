"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { ADMIN_APPLICATIONS } from "@/constants/apiEndpoints/admin.endpoint";
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
  };
  metrics?: {
    successful?: number;
    failed?: number;
    successCount?: number;
    failedCount?: number;
  };
  counts?: {
    successful?: number;
    failed?: number;
    successCount?: number;
    failedCount?: number;
  };
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

const unwrap = <T,>(response: ApiSuccess<T>) => response.data;

const normalizeCounts = (payload: ApplicationListPayload | null | undefined) => {
  const counts = payload?.metrics ?? payload?.counts ?? {};

  return {
    successful:
      counts.successful ??
      counts.successCount ??
      0,
    failed:
      counts.failed ??
      counts.failedCount ??
      0,
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

  const applicationsQuery = useQuery<ApplicationListPayload, ApiError>({
    queryKey: ["application-tracker", state, filters, page, pageSize],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<ApplicationListPayload>>(ADMIN_APPLICATIONS, {
          params: {
            state,
            page: page + 1,
            limit: pageSize,
            active: state === "active",
            recycle: state === "recycle",
            status: filters.status,
            aggregator: filters.aggregator,
            source: filters.source,
          },
        });

        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const countersQuery = useQuery<{ successful: number; failed: number }, ApiError>({
    queryKey: ["application-tracker-counts", filters],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<ApplicationListPayload>>(ADMIN_APPLICATIONS, {
          params: {
            dataCount: true,
            status: filters.status,
            aggregator: filters.aggregator,
            source: filters.source,
          },
        });

        return normalizeCounts(unwrap(response.data));
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["application-tracker"] });
    void queryClient.invalidateQueries({ queryKey: ["application-tracker-counts"] });
  };

  const softDeleteApplication = useMutation<ApiSuccess<unknown>, ApiError, ApplicationMutationInput>({
    mutationKey: ["application-tracker-soft-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(ADMIN_APPLICATIONS, {
          isDeleted: true,
        }, {
          params: { id, action: "soft-delete" },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success("Application moved to recycle bin.");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to move application to recycle bin.");
    },
  });

  const restoreApplication = useMutation<ApiSuccess<unknown>, ApiError, ApplicationMutationInput>({
    mutationKey: ["application-tracker-restore"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(ADMIN_APPLICATIONS, {
          isDeleted: false,
        }, {
          params: { id, action: "restore" },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success("Application restored successfully.");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to restore application.");
    },
  });

  const deleteApplication = useMutation<ApiSuccess<unknown>, ApiError, ApplicationMutationInput>({
    mutationKey: ["application-tracker-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(ADMIN_APPLICATIONS, {
          params: { id },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      toast.success("Application deleted permanently.");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to permanently delete application.");
    },
  });

  const rows = applicationsQuery.data?.data ?? [];
  const totalCount = applicationsQuery.data?.pagination?.totalCount ?? rows.length;
  const counts = countersQuery.data ?? normalizeCounts(applicationsQuery.data);

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
  };
};
