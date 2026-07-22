import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type SaveCoverLetterFormat = "pdf" | "docx";

type GenerateCoverLetterPayload = {
  userId: string;
  resumeUploadId: string;
  jobLink: string;
  jobContent: string;
};

type SaveCoverLetterPayload = {
  userId: string;
  resumeUploadId: string;
  coverLetter: string;
  format: SaveCoverLetterFormat;
};

type CoverLetterDocument = {
  publicId: string;
  name: string;
  url?: string;
};

type SaveCoverLetterResponse = {
  upload: { document: CoverLetterDocument };
};

/**
 * Generate/save/download actions behind the "Generate Cover Letter" column —
 * mirrors the useCommunicationTemplates hook shape (mutations wrapping
 * axiosInstance + endpoint constants, exposed as plain async actions).
 */
export function useCoverLetterGeneration() {
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (payload: GenerateCoverLetterPayload) => {
      const response = await axiosInstance.post<ApiSuccess<{ coverLetter: string }>>(
        endpoints.ADMIN_GENERATE_COVER_LETTER,
        payload,
      );
      return response.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SaveCoverLetterPayload) => {
      const response = await axiosInstance.post<ApiSuccess<SaveCoverLetterResponse>>(
        endpoints.ADMIN_SAVE_COVER_LETTER,
        payload,
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      // Refresh the Client Documents grid so the new upload shows up
      // without requiring a manual page refresh.
      queryClient.invalidateQueries({ queryKey: ["admin-user-documents", variables.userId] });
    },
  });

  const getDownloadUrl = async (filePath: string, filename: string) => {
    const response = await axiosInstance.get<ApiSuccess<{ url: string }>>(
      endpoints.ADMIN_DOCUMENTS_GET_SIGNED_URL,
      { params: { filePath, filename } },
    );
    return response.data.data.url;
  };

  return {
    generateCoverLetter: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    saveCoverLetter: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    savingFormat: saveMutation.variables?.format,
    getDownloadUrl,
  };
}
