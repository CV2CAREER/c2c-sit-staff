import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type CvVariantStyle = "modern" | "classic" | "contemporary";

export type CvVariantTextRun = {
  text: string;
  is_new: boolean;
};

export type CvVariantHeader = {
  name: string;
  headline: CvVariantTextRun;
  contact_line: string;
  work_rights_line: { text: string | null; is_new: boolean; flag: string | null };
};

export type CvVariantExperienceSubSection = {
  label: string;
  bullets: CvVariantTextRun[];
};

export type CvVariantExperience = {
  title: string;
  company: string;
  location: string | null;
  dates: string;
  flags: string[];
  bullets: CvVariantTextRun[];
  sub_sections: CvVariantExperienceSubSection[];
};

export type CvVariantEducation = {
  qualification: string;
  institution: string;
  dates: string;
  detail: { text: string | null; is_new: boolean };
  flags: string[];
};

export type CvVariantCertification = CvVariantTextRun & {
  flag: string | null;
};

export type CvVariantAdditionalSection = {
  heading: string;
  items: CvVariantTextRun[];
};

export type CvVariantResult = {
  client_name: string;
  style_variant: CvVariantStyle;
  style_reasoning: string;
  top_level_flags: string[];
  header: CvVariantHeader;
  summary: { runs: CvVariantTextRun[] };
  skills: CvVariantTextRun[];
  experience: CvVariantExperience[];
  education: CvVariantEducation[];
  certifications: CvVariantCertification[];
  additional_sections: CvVariantAdditionalSection[];
};

export type SaveCvVariantFormat = "pdf" | "docx";

type GenerateCvVariantPayload = {
  userId: string;
  resumeUploadId: string;
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

/**
 * Generate/save/download actions behind the "Generate CV Variant" column —
 * mirrors useCoverLetterGeneration's hook shape.
 */
export function useCvVariantGeneration() {
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (payload: GenerateCvVariantPayload) => {
      const response = await axiosInstance.post<ApiSuccess<CvVariantResult>>(
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

  return {
    generateCvVariant: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    saveCvVariant: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    savingFormat: saveMutation.variables?.format,
    getDownloadUrl,
  };
}
