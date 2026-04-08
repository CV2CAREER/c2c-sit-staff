"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { ADMIN_JOB_PREFERENCES } from "@/constants/apiEndpoints/admin.endpoint";

export type DiscoveryCategory =
  | "advertisers"
  | "classification"
  | "country-states-cities"
  | "craft"
  | "job-type"
  | "salary-options"
  | "working-rights";

export type DiscoveryState = "active" | "recycle";

export type DiscoveryOption = {
  _id?: string;
  id?: string | number;
  label?: string;
  value?: string;
  country?: string;
  states?: string[];
  cities?: string[];
  [key: string]: unknown;
};

type DiscoveryListPayload = {
  rows: DiscoveryOption[];
  totalCount: number;
};

type DiscoveryMutationInput = {
  id?: string | number;
  category: string;
  action?: "soft-delete" | "restore";
  body?: Record<string, unknown>;
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

const normalizeDiscoveryPayload = (payload: unknown): DiscoveryListPayload => {
  const source = payload as
    | {
        rows?: DiscoveryOption[];
        totalCount?: number;
        items?: DiscoveryOption[];
        total?: number;
        data?: DiscoveryOption[];
        count?: number;
      }
    | DiscoveryOption[]
    | null
    | undefined;

  if (Array.isArray(source)) {
    return { rows: source, totalCount: source.length };
  }

  return {
    rows: source?.rows ?? source?.items ?? source?.data ?? [],
    totalCount:
      source?.totalCount ??
      source?.total ??
      source?.count ??
      (source?.rows?.length ?? source?.items?.length ?? source?.data?.length ?? 0),
  };
};

export const useDiscoveryTracker = ({
  state,
  category,
  page,
  pageSize,
}: {
  state: DiscoveryState;
  category: DiscoveryCategory;
  page: number;
  pageSize: number;
}) => {
  const queryClient = useQueryClient();
  const skip = page * pageSize;

  const discoveryQuery = useQuery<DiscoveryListPayload, ApiError>({
    queryKey: ["discovery-tracker", state, category, page, pageSize],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<unknown>>(ADMIN_JOB_PREFERENCES, {
          params: {
            category,
            state,
            skip,
            limit: pageSize,
            page: page + 1,
            isDeleted: state === "recycle",
          },
        });

        return normalizeDiscoveryPayload(unwrap(response.data));
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["discovery-tracker"] });
  };

  const softDeleteRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-soft-delete"],
    mutationFn: async ({ id, category: rowCategory }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(ADMIN_JOB_PREFERENCES, {
          isDeleted: true,
        }, {
          params: { id, category: rowCategory, action: "soft-delete" },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const restoreRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-restore"],
    mutationFn: async ({ id, category: rowCategory }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(ADMIN_JOB_PREFERENCES, {
          isDeleted: false,
        }, {
          params: { id, category: rowCategory, action: "restore" },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const deleteRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-delete"],
    mutationFn: async ({ id, category: rowCategory }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(ADMIN_JOB_PREFERENCES, {
          params: { id, category: rowCategory },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-update"],
    mutationFn: async ({ id, category: rowCategory, body = {} }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(ADMIN_JOB_PREFERENCES, body, {
          params: { id, category: rowCategory },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return {
    rows: discoveryQuery.data?.rows ?? [],
    totalCount: discoveryQuery.data?.totalCount ?? 0,
    isLoading: discoveryQuery.isLoading,
    isFetching: discoveryQuery.isFetching,
    isError: discoveryQuery.isError,
    error: discoveryQuery.error,
    refetch: discoveryQuery.refetch,
    softDeleteRecord,
    restoreRecord,
    deleteRecord,
    updateRecord,
  };
};
