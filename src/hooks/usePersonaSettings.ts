"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ADMIN_PERSONA_RULES } from "@/constants/apiEndpoints/admin.endpoint";
import { Persona, ViewAsRules } from "@/constants/viewAsRules";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";

type PersonaRuleRecord = {
  persona: Persona;
  allowedTargets: Array<Persona | "*">;
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

const toRulesMap = (records: PersonaRuleRecord[] = []): ViewAsRules => {
  return records.reduce((acc, record) => {
    acc[record.persona] = record.allowedTargets as Persona[];
    return acc;
  }, {} as ViewAsRules);
};

export function usePersonaSettings() {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery<ViewAsRules, ApiError>({
    queryKey: ["persona-rules"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<PersonaRuleRecord[]>>(ADMIN_PERSONA_RULES);
        return toRulesMap(unwrap(response.data));
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const saveRule = useMutation<ApiSuccess<unknown>, ApiError, { persona: Persona; allowedTargets: Array<Persona | "*"> }>({
    mutationKey: ["persona-rules-save"],
    mutationFn: async (payload) => {
      try {
        const response = await axiosInstance.put<ApiSuccess<unknown>>(ADMIN_PERSONA_RULES, payload);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["persona-rules"] });
    },
  });

  return {
    rules: rulesQuery.data,
    isLoading: rulesQuery.isLoading,
    isFetching: rulesQuery.isFetching,
    isError: rulesQuery.isError,
    error: rulesQuery.error,
    refetch: rulesQuery.refetch,
    saveRule,
  };
}
