import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type RoleTitleStatus = "Evidenced" | "Adjacent" | "Aspirational";
export type RoleTitleResilienceRating = "High" | "Medium" | "Low";

export type RoleTitleRow = {
  role_title: string;
  classification: string;
  craft: string;
  industry: string;
  status: RoleTitleStatus;
  ai_career_resilience_rating: RoleTitleResilienceRating;
  evidence_note?: string;
};

export type QaFlag = {
  type: string;
  description: string;
};

export type RoleTitleGenerationResult = {
  candidate_name: string;
  qa_flags: QaFlag[];
  roles: RoleTitleRow[];
};

type GenerateRoleTitlesPayload = {
  userId: string;
  resumeUploadId: string;
};

type SaveRoleTitlesPayload = {
  userId: string;
  aiResult: RoleTitleGenerationResult;
};

/**
 * Generate/save actions behind the "Generate RTR" column — mirrors the
 * useCommunicationTemplates hook shape (mutations wrapping axiosInstance +
 * endpoint constants, exposed as plain async actions).
 */
export function useRoleTitleGeneration() {
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (payload: GenerateRoleTitlesPayload) => {
      const response = await axiosInstance.post<ApiSuccess<RoleTitleGenerationResult>>(
        endpoints.ADMIN_GENERATE_ROLE_TITLES,
        payload,
      );
      return response.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SaveRoleTitlesPayload) => {
      const response = await axiosInstance.post<ApiSuccess<unknown>>(
        endpoints.ADMIN_SAVE_ROLE_TITLE_RECOMMENDATIONS,
        payload,
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      // Refresh the Client Documents grid so the new document shows up
      // without requiring a manual page refresh.
      queryClient.invalidateQueries({ queryKey: ["client-support-documents", variables.userId] });
    },
  });

  return {
    generateRoleTitles: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    saveRoleTitles: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
