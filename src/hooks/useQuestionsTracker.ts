"use client";

import { useFetchData } from "./useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { ADMIN_QUESTIONS } from "@/constants/apiEndpoints/admin.endpoint";
import { toast } from "react-hot-toast";

export type QuestionState = "active" | "recycle";

export type QuestionsTrackerFilters = {
  approved: string;
  ratings: string;
  review: string;
  aggregator: string;
  source: string;
};

export type QuestionRecord = {
  id: string | number;
  [key: string]: unknown;
};

type QuestionsListPayload = {
  data: QuestionRecord[];
  pagination?: {
    totalCount?: number;
    currentPage?: number;
    pageSize?: number;
    totalPages?: number;
  };
};

type QuestionMutationInput = {
  id: string | number;
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

export const useQuestionsTracker = ({
  state,
  filters,
  page,
  pageSize,
}: {
  state: QuestionState;
  filters: QuestionsTrackerFilters;
  page: number;
  pageSize: number;
}) => {
  const queryClient = useQueryClient();

  const questionsQuery = useFetchData<QuestionsListPayload>({
    method: "GET",
    url: ADMIN_QUESTIONS,
    params: {
      page: page + 1,
      pageSize,
      isDeleted: state !== "active",
    },
    queryKey: ["questions-tracker", state, page, pageSize],
    enabled: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["questions-tracker"] });
  };

  const softDeleteQuestion = useMutation<ApiSuccess<unknown>, ApiError, QuestionMutationInput, string>({
    mutationKey: ["questions-tracker-soft-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(`${ADMIN_QUESTIONS}/${id}`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => toast.loading("Moving question to recycle bin..."),
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Question moved to recycle bin.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to move question to recycle bin.", { id: toastId });
    },
  });

  const restoreQuestion = useMutation<ApiSuccess<unknown>, ApiError, QuestionMutationInput, string>({
    mutationKey: ["questions-tracker-restore"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(`${ADMIN_QUESTIONS}/${id}/restore`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => toast.loading("Restoring question..."),
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Question restored successfully.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to restore question.", { id: toastId });
    },
  });

  const deleteQuestion = useMutation<ApiSuccess<unknown>, ApiError, QuestionMutationInput, string>({
    mutationKey: ["questions-tracker-delete"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(`${ADMIN_QUESTIONS}/${id}/permanent`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onMutate: () => toast.loading("Permanently deleting question..."),
    onSuccess: (_data, _vars, toastId) => {
      toast.success("Question deleted permanently.", { id: toastId });
      invalidate();
    },
    onError: (error, _vars, toastId) => {
      toast.error(error.message || "Failed to permanently delete question.", { id: toastId });
    },
  });

  // Flatten nested user object and compute derived fields for table display
  const rawRows = questionsQuery.data?.data?.data ?? [];
  const rows = rawRows.map((row: any) => ({
    ...row,
    userName: `${row.user?.firstName || ""} ${row.user?.lastName || ""}`.trim() || "N/A",
    userEmail: row.user?.email || "N/A",
    questionCount: row.interview?.interview?.length ?? 0,
    documentCount: Array.isArray(row.uploadedDocuments) ? row.uploadedDocuments.length : 0,
  }));

  const totalCount = questionsQuery.data?.data?.pagination?.totalCount ?? rows.length;

  return {
    rows,
    totalCount,
    isLoading: questionsQuery.isLoading,
    isFetching: questionsQuery.isFetching,
    isError: questionsQuery.isError,
    error: questionsQuery.error,
    refetch: questionsQuery.refetch,
    softDeleteQuestion,
    restoreQuestion,
    deleteQuestion,
  };
};
