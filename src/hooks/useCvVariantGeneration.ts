import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";
import { rethrowWithBlobErrorMessage } from "@/lib/axios-blob-error";

export type SaveCvVariantFormat = "pdf" | "docx";

export type ConfirmedAnswer = { question: string; answer: string };

// A "Please confirm: ..." question pulled from the AI's generated CV. When
// the AI supplies a short set of likely answers, `options` lets the admin
// pick one instead of typing a free-text answer.
export type ConfirmQuestion = { question: string; options?: string[] };

type GenerateCvVariantPayload = {
  userId: string;
  resumeUploadId: string;
  confirmedAnswers?: ConfirmedAnswer[];
};

// The AI now authors a complete, self-styled HTML document directly (its own
// colors/layout/fonts) — there's no structured JSON to type here anymore,
// see cvVariantHtmlRenderer.ts on the backend for how this gets rendered.
// `confirmQuestions` are pulled from the document's own "Please Confirm"
// section (see extractConfirmQuestions on the backend) so the admin can
// resolve them before ever seeing the review/save step.
type GenerateCvVariantResponse = {
  html: string;
  confirmQuestions: ConfirmQuestion[];
};

type SaveCvVariantPayload = {
  userId: string;
  resumeUploadId: string;
  cvVariant: string;
  format: SaveCvVariantFormat;
};

type CvVariantDocument = {
  publicId: string;
  name: string;
  url?: string;
};

type SaveCvVariantResponse = {
  upload: { document: CvVariantDocument };
};

type PreviewCvVariantPayload = {
  userId: string;
  resumeUploadId: string;
  cvVariant: string;
  format: SaveCvVariantFormat;
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
 * Generate/save/download actions behind the "Generate CV Variant" column —
 * mirrors useCoverLetterGeneration's hook shape.
 */
export function useCvVariantGeneration() {
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (payload: GenerateCvVariantPayload) => {
      const response = await axiosInstance.post<ApiSuccess<GenerateCvVariantResponse>>(
        endpoints.ADMIN_GENERATE_CV_VARIANT,
        payload,
      );
      return response.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SaveCvVariantPayload) => {
      const response = await axiosInstance.post<ApiSuccess<SaveCvVariantResponse>>(
        endpoints.ADMIN_SAVE_CV_VARIANT,
        payload,
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      // Refresh the Client Documents grid so the new resume upload shows up
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

  // Renders a not-yet-saved CV variant to a real file so an admin can check
  // it before deciding to save — nothing here touches the client's
  // Document History or onboarding progress.
  const previewMutation = useMutation({
    mutationFn: async (payload: PreviewCvVariantPayload) => {
      try {
        const response = await axiosInstance.post(endpoints.ADMIN_PREVIEW_CV_VARIANT, payload, {
          responseType: "blob",
        });
        const filename = filenameFromContentDisposition(
          response.headers["content-disposition"],
          `CV_Variant_Preview.${payload.format}`,
        );
        return { blob: response.data as Blob, filename };
      } catch (error) {
        return rethrowWithBlobErrorMessage(error);
      }
    },
  });

  return {
    generateCvVariant: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    previewCvVariant: previewMutation.mutateAsync,
    isPreviewing: previewMutation.isPending,
    saveCvVariant: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    savingFormat: saveMutation.variables?.format,
    getDownloadUrl,
  };
}
