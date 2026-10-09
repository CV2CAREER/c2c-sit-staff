import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/jobsite-verification.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";
import {
  JobsiteVerification,
  JobsiteVerificationStatus,
  JobsiteConfig,
  JobsiteRejectReason,
  JobsiteVerificationQueueResponse,
  ClientJobsiteVerificationResponse,
} from "@/types/jobsite-verification.types";

const QUEUE_KEY = ["admin-jobsite-verifications"] as const;
const CONFIGS_KEY = ["admin-jobsite-configs"] as const;

export function useJobsiteVerificationQueue(opts: {
  status?: JobsiteVerificationStatus | "all";
  country?: string;
  jobsiteId?: string;
  clientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const query = useFetchData<JobsiteVerificationQueueResponse>({
    method: "GET",
    url: endpoints.JOBSITE_VERIFICATION_QUEUE,
    queryKey: [
      ...QUEUE_KEY,
      opts.status ?? "all",
      opts.country ?? "",
      opts.jobsiteId ?? "",
      opts.clientId ?? "",
      opts.search ?? "",
      opts.page ?? 1,
      opts.limit ?? 50,
    ],
    enabled: true,
    forceRefresh: true,
    params: {
      status: opts.status === "all" ? undefined : opts.status,
      country: opts.country || undefined,
      jobsiteId: opts.jobsiteId || undefined,
      clientId: opts.clientId || undefined,
      search: opts.search || undefined,
      page: opts.page ?? 1,
      limit: opts.limit ?? 50,
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  };

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteVerification>>(
        endpoints.JOBSITE_VERIFICATION_VERIFY(id),
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      id,
      rejectReason,
    }: {
      id: string;
      rejectReason: string;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteVerification>>(
        endpoints.JOBSITE_VERIFICATION_REJECT(id),
        { rejectReason },
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const exemptMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      clientId?: string;
      jobsiteId?: string;
      country?: string;
      exemptReason?: string;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<any>>(
        endpoints.JOBSITE_VERIFICATION_EXEMPT,
        payload,
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const unexemptMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      clientId?: string;
      jobsiteId?: string;
      country?: string;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<any>>(
        endpoints.JOBSITE_VERIFICATION_UNEXEMPT,
        payload,
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  return {
    listDomain: {
      items: query.data?.data?.verifications ?? [],
      total: query.data?.data?.total ?? 0,
      page: query.data?.data?.page ?? 1,
      totalPages: query.data?.data?.totalPages ?? 1,
      stats: query.data?.data?.stats ?? {
        pendingCount: 0,
        approvedCount: 0,
        totalClients: 0,
      },
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,
    },
    actions: {
      verify: verifyMutation.mutateAsync,
      reject: rejectMutation.mutateAsync,
      exempt: exemptMutation.mutateAsync,
      unexempt: unexemptMutation.mutateAsync,
      isVerifying: verifyMutation.isPending,
      isRejecting: rejectMutation.isPending,
      isExempting: exemptMutation.isPending,
      isUnexempting: unexemptMutation.isPending,
    },
  };
}

export function useClientJobsiteVerifications(clientId: string) {
  const queryClient = useQueryClient();

  const query = useFetchData<ClientJobsiteVerificationResponse>({
    method: "GET",
    url: endpoints.JOBSITE_VERIFICATION_CLIENT(clientId),
    queryKey: ["client-jobsite-verifications", clientId],
    enabled: Boolean(clientId),
    forceRefresh: true,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["client-jobsite-verifications", clientId],
    });
    await queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  };

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteVerification>>(
        endpoints.JOBSITE_VERIFICATION_VERIFY(id),
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async ({
      id,
      rejectReason,
    }: {
      id: string;
      rejectReason: string;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteVerification>>(
        endpoints.JOBSITE_VERIFICATION_REJECT(id),
        { rejectReason },
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    actions: {
      verify: verifyMutation.mutateAsync,
      reject: rejectMutation.mutateAsync,
      isVerifying: verifyMutation.isPending,
      isRejecting: rejectMutation.isPending,
    },
  };
}

export function useJobsiteRejectReasons() {
  const query = useFetchData<JobsiteRejectReason[]>({
    method: "GET",
    url: endpoints.JOBSITE_VERIFICATION_REJECT_REASONS,
    queryKey: ["jobsite-reject-reasons"],
    enabled: true,
  });

  return {
    reasons: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useJobsiteConfigs() {
  const queryClient = useQueryClient();

  const query = useFetchData<Record<string, JobsiteConfig[]>>({
    method: "GET",
    url: endpoints.JOBSITE_VERIFICATION_CONFIGS,
    queryKey: [...CONFIGS_KEY],
    enabled: true,
    forceRefresh: true,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: CONFIGS_KEY });
  };

  const toggleRequiredMutation = useMutation({
    mutationFn: async (payload: {
      jobsiteId: string;
      country: string;
      required: boolean;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteConfig>>(
        endpoints.JOBSITE_VERIFICATION_CONFIG_TOGGLE,
        payload,
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const updateVideoGuideMutation = useMutation({
    mutationFn: async (payload: {
      jobsiteId: string;
      country: string;
      videoGuideUrl: string;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteConfig>>(
        endpoints.JOBSITE_VERIFICATION_CONFIG_VIDEO_GUIDE,
        payload,
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const addJobsiteConfigMutation = useMutation({
    mutationFn: async (payload: {
      jobsiteId: string;
      country: string;
      required?: boolean;
      videoGuideUrl?: string;
    }) => {
      const res = await axiosInstance.post<ApiSuccess<JobsiteConfig>>(
        endpoints.JOBSITE_VERIFICATION_CONFIG_ADD,
        payload,
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  return {
    configsByCountry: query.data?.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    actions: {
      toggleRequired: toggleRequiredMutation.mutateAsync,
      updateVideoGuide: updateVideoGuideMutation.mutateAsync,
      addJobsite: addJobsiteConfigMutation.mutateAsync,
      isSavingRequired: toggleRequiredMutation.isPending,
      isSavingGuide: updateVideoGuideMutation.isPending,
      isAdding: addJobsiteConfigMutation.isPending,
    },
  };
}
