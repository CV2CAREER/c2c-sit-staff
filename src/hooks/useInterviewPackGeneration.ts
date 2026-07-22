import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type InterviewPackProcessStatus = "in_progress" | "failed" | "completed";

export type InterviewPackGapItem = {
  requirement: string;
  evidenceLevel: "strong" | "partial" | "none";
  cvBasis: string;
  bridgeNote: string | null;
};

export type InterviewPackStage1Result = {
  candidateProfile: {
    yearsExperience: string;
    coreSkills: string[];
    industries: string[];
    currentlyEmployed: boolean;
    employmentGapsDetected: string[];
  };
  gapAnalysis: InterviewPackGapItem[];
  positioning: {
    statement: string;
    pillars: { lead: string; body: string }[];
    gapScript: string;
  };
  foundational: {
    tellMeAboutYourself: string;
    whyThisRole: string;
    whyLeavingOrCareerPivot: string;
    keyDeliverables: string;
    noticePeriod: string;
    workingRights: { statement: string | null; needsCoachInput: boolean };
    salaryOfferResponse: string;
    salaryCurrentPayDecline: string;
    salaryExpectationsFlip: string;
    topThreeStrengths: string;
    developmentArea: string;
    careerGoals: string;
  };
};

export type InterviewPackStarStory = {
  id: string;
  title: string;
  useWhenAskedAbout: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  sourceType: "employment" | "academic_project" | "personal_project";
};

export type InterviewPackStage2Result = {
  starBank: InterviewPackStarStory[];
};

export type InterviewPackStage3Result = {
  technicalDeepDive: { topic: string; script: string }[];
  technicalPractice: {
    category: string;
    question: string;
    modelAnswer: string;
    codeExample: string | null;
  }[];
};

export type InterviewPackStage4Result = {
  panelQuestions: {
    aboutRole: string[];
    aboutTeam: string[];
    aboutGrowth: string[];
    closingQuestion: string;
  };
  playbook: {
    first60Seconds: string[];
    pacingAndTone: string[];
    last60Seconds: string;
    thingsToAvoid: string[];
    nightBeforeChecklist: string[];
  };
};

export type InterviewPackProcess = {
  id: string;
  userId: string;
  resumeUploadId: string;
  jobLink: string | null;
  jobContent: string;
  currentStage: number;
  status: InterviewPackProcessStatus;
  stage1Result?: InterviewPackStage1Result;
  stage2Result?: InterviewPackStage2Result;
  stage3Result?: InterviewPackStage3Result;
  stage4Result?: InterviewPackStage4Result;
  errorMessage?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SaveInterviewPackFormat = "pdf" | "docx";

type StartInterviewPackPayload = {
  userId: string;
  resumeUploadId: string;
  jobContent: string;
  jobLink?: string;
};

type RunInterviewPackStagePayload = {
  userId: string;
  processId: string;
};

type SaveInterviewPackPayload = {
  userId: string;
  resumeUploadId: string;
  interviewPack: string;
  format: SaveInterviewPackFormat;
};

type InterviewPackDocument = {
  publicId: string;
  name: string;
  url?: string;
};

type SaveInterviewPackResponse = {
  upload: { document: InterviewPackDocument };
};

/**
 * Drives the 4-stage "Generate Interview Pack" flow — start (or transparently
 * resume) a process, then run one stage at a time so the frontend can show
 * genuine per-stage progress, then save the admin-formatted combined result.
 * Mirrors useCvVariantGeneration's hook shape.
 */
export function useInterviewPackGeneration() {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: async (payload: StartInterviewPackPayload) => {
      const response = await axiosInstance.post<ApiSuccess<{ process: InterviewPackProcess }>>(
        endpoints.ADMIN_START_INTERVIEW_PACK,
        payload,
      );
      return response.data.data.process;
    },
  });

  const runStageMutation = useMutation({
    mutationFn: async (payload: RunInterviewPackStagePayload) => {
      const response = await axiosInstance.post<ApiSuccess<{ process: InterviewPackProcess }>>(
        endpoints.ADMIN_RUN_INTERVIEW_PACK_STAGE,
        payload,
      );
      return response.data.data.process;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: SaveInterviewPackPayload) => {
      const response = await axiosInstance.post<ApiSuccess<SaveInterviewPackResponse>>(
        endpoints.ADMIN_SAVE_INTERVIEW_PACK,
        payload,
      );
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-documents", variables.userId] });
    },
  });

  const getInterviewPackProcess = async (processId: string, userId: string) => {
    const response = await axiosInstance.get<ApiSuccess<{ process: InterviewPackProcess }>>(
      endpoints.ADMIN_GET_INTERVIEW_PACK_PROCESS(processId),
      { params: { userId } },
    );
    return response.data.data.process;
  };

  const getDownloadUrl = async (filePath: string, filename: string) => {
    const response = await axiosInstance.get<ApiSuccess<{ url: string }>>(
      endpoints.ADMIN_DOCUMENTS_GET_SIGNED_URL,
      { params: { filePath, filename } },
    );
    return response.data.data.url;
  };

  return {
    startInterviewPack: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    runInterviewPackStage: runStageMutation.mutateAsync,
    isRunningStage: runStageMutation.isPending,
    getInterviewPackProcess,
    saveInterviewPack: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    savingFormat: saveMutation.variables?.format,
    getDownloadUrl,
  };
}
