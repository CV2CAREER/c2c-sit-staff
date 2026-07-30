"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import {
  ADMIN_DISCOVERY_TRACKER,
  ADMIN_DISCOVERY_TRACKER_FILTER_VALUES,
} from "@/constants/apiEndpoints/admin.endpoint";

// Real manual_applications columns the "Users Filter" dropdown can narrow
// the grid by — mirrors FILTERABLE_FIELDS in discovery-tracker.service.ts.
export const DISCOVERY_FILTER_FIELDS = [
  { value: "Advertiser", label: "Advertiser" },
  { value: "Job_Type", label: "Job Type" },
  { value: "Country", label: "Country" },
  { value: "Status", label: "Status" },
  { value: "Internal_Jobsite", label: "Internal Jobsite" },
  { value: "External_Jobsite", label: "External Jobsite" },
];

export type DiscoveryState = "active" | "recycle";

// One row = one manual_applications record, every column included.
export type DiscoveryRecord = {
  id: string;
  Client?: string;
  Status?: string;
  StatusReason?: string;
  Job_Title?: string;
  JobId?: string;
  Internal_Jobsite?: string;
  External_Jobsite?: string;
  Job_Type?: string;
  Advertiser?: string;
  Location?: string;
  Country?: string;
  ApplicationSubmittedBy?: string;
  ApplicationSubmissionDate?: string;
  DiscoveredBy?: string;
  DiscoveryDate?: string;
  VettedBy?: string;
  VettedDate?: string;
  QualityScore?: string | null;
  isDeleted?: boolean;
  CoverLetterRequired?: boolean | null;
  DeclinedReasons?: string | null;
  ApprovedBy?: string | null;
  ApprovedDate?: string | null;
  ReturnReason?: string | null;
  ReturnedBy?: string | null;
  ReturnedDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type DiscoveryListPayload = {
  rows: DiscoveryRecord[];
  totalCount: number;
};

type DiscoveryMutationInput = {
  id: string | number;
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

export const useDiscoveryTracker = ({
  state,
  field,
  value,
}: {
  state: DiscoveryState;
  field?: string;
  value?: string;
}) => {
  const queryClient = useQueryClient();

  const discoveryQuery = useQuery<DiscoveryListPayload, ApiError>({
    queryKey: ["discovery-tracker", state, field, value],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<DiscoveryListPayload>>(
          ADMIN_DISCOVERY_TRACKER,
          {
            params: {
              field,
              value,
              state,
              isDeleted: state === "recycle",
            },
          },
        );

        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
    // The grid loads every row for the current filter in one shot (no
    // server-side pagination) — keep it cached so navigating away and back
    // doesn't re-fetch the whole table every time. Mutations below still
    // force a fresh fetch via invalidateQueries regardless of this window.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filterValuesQuery = useQuery<string[], ApiError>({
    queryKey: ["discovery-tracker-filter-values", field],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<string[]>>(
          ADMIN_DISCOVERY_TRACKER_FILTER_VALUES,
          { params: { field } },
        );
        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: !!field,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["discovery-tracker"] });
  };

  const softDeleteRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-soft-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(
          ADMIN_DISCOVERY_TRACKER,
          { isDeleted: true },
          { params: { id, action: "soft-delete" } },
        );
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const restoreRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-restore"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(
          ADMIN_DISCOVERY_TRACKER,
          { isDeleted: false },
          { params: { id, action: "restore" } },
        );
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const deleteRecord = useMutation<ApiSuccess<unknown>, ApiError, DiscoveryMutationInput>({
    mutationKey: ["discovery-tracker-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(ADMIN_DISCOVERY_TRACKER, {
          params: { id },
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
    mutationFn: async ({ id, body = {} }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(ADMIN_DISCOVERY_TRACKER, body, {
          params: { id },
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
    filterValues: filterValuesQuery.data ?? [],
    softDeleteRecord,
    restoreRecord,
    deleteRecord,
    updateRecord,
  };
};
