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

type PreviewCoverLetterPayload = {
  userId: string;
  resumeUploadId: string;
  coverLetter: string;
  format: SaveCoverLetterFormat;
};

// Pulls the filename the backend set via Content-Disposition — falls back to
// a generic name if it's ever missing rather than failing the download.
const filenameFromContentDisposition = (
  header: string | undefined,
  fallback: string,
): string => {
  const match = header?.match(/filename="?([^";]+)"?/);
  return match?.[1] || fallback;
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

  // Renders a not-yet-saved cover letter to a real file so an admin can
  // check it before deciding to save — nothing here touches the client's
  // Document History.
  const previewMutation = useMutation({
    mutationFn: async (payload: PreviewCoverLetterPayload) => {
      const response = await axiosInstance.post(endpoints.ADMIN_PREVIEW_COVER_LETTER, payload, {
        responseType: "blob",
      });
      const filename = filenameFromContentDisposition(
        response.headers["content-disposition"],
        `Cover_Letter_Preview.${payload.format}`,
      );
      return { blob: response.data as Blob, filename };
    },
  });

  return {
    generateCoverLetter: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    previewCoverLetter: previewMutation.mutateAsync,
    isPreviewing: previewMutation.isPending,
    saveCoverLetter: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    savingFormat: saveMutation.variables?.format,
    getDownloadUrl,
  };
}
