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

export type CvVariantDesign = {
  accent_color: string;
  font_family: "sans" | "serif";
  density: "compact" | "standard" | "spacious";
  /** Which structural PDF/DOCX layout renders — see htmlDocumentGenerator.ts on the backend. Always present on a generated result (the backend defaults it), so no separate `style_variant` plumbing is needed when passing `design` through to save. */
  style_variant: CvVariantStyle;
};

/**
 * The AI prompt behind this (edited via Admin > Prompts, and known to drift
 * — see cvVariantFormat.ts) can return a differently-shaped object at any
 * time, so this is a *hint* at the fields we render specially, not a
 * contract on what the API returns. `Record<string, unknown>` lets any other
 * shape through so the generic renderer can still turn it into a readable
 * document instead of the app breaking on a missing field.
 */
export type CvVariantResult = Record<string, unknown> & Partial<{
  client_name: string;
  style_variant: CvVariantStyle;
  style_reasoning: string;
  top_level_flags: string[];
  design: CvVariantDesign;
  header: CvVariantHeader;
  summary: { runs: CvVariantTextRun[] };
  skills: CvVariantTextRun[];
  experience: CvVariantExperience[];
  education: CvVariantEducation[];
  certifications: CvVariantCertification[];
  additional_sections: CvVariantAdditionalSection[];
}>;

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
  design?: CvVariantDesign;
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
