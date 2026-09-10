import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/social-verification.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export const SOCIAL_PLATFORM_SLUGS = [
  "facebook",
  "x",
  "youtube",
  "instagram",
  "linkedin",
  "tiktok",
  "threads",
] as const;

export type SocialPlatformSlug = (typeof SOCIAL_PLATFORM_SLUGS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatformSlug, string> = {
  facebook: "Facebook",
  x: "X (Twitter)",
  youtube: "YouTube",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  threads: "Threads",
};

export type SocialVerificationRow = {
  id: string;
  userId: string;
  platform: SocialPlatformSlug;
  username: string;
  profileUrl: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SocialVerificationUserSummary = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string | null;
  socialVerificationExempt: boolean;
  capturedCount: number;
  approvedCount: number;
  pendingCount: number;
  requiredCount: number;
  complete: boolean;
  lastCapturedAt: string | null;
  rows: SocialVerificationRow[];
};

export type SocialVerificationQueueResponse = {
  items: SocialVerificationUserSummary[];
  total: number;
  page: number;
  limit: number;
};

export type QueueStatus = "pending" | "approved" | "all";

const QUEUE_KEY = ["admin-social-verifications"] as const;

export function useSocialVerificationQueue(opts: {
  q?: string;
  status?: QueueStatus;
  page?: number;
  limit?: number;
}) {
  const queryClient = useQueryClient();

  const query = useFetchData<SocialVerificationQueueResponse>({
    method: "GET",
    url: endpoints.SOCIAL_VERIFICATION_QUEUE,
    queryKey: [...QUEUE_KEY, opts.status ?? "all", opts.q ?? "", opts.page ?? 1, opts.limit ?? 25],
    enabled: true,
    forceRefresh: true,
    params: {
      q: opts.q || undefined,
      status: opts.status ?? undefined,
      page: opts.page ?? 1,
      limit: opts.limit ?? 25,
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
  };

  const approveRow = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post<ApiSuccess<SocialVerificationRow>>(
        endpoints.SOCIAL_VERIFICATION_APPROVE(id),
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const rejectRow = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete<ApiSuccess<{ id: string }>>(
        endpoints.SOCIAL_VERIFICATION_REJECT(id),
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const exemptUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await axiosInstance.post<ApiSuccess<{ userId: string }>>(
        endpoints.SOCIAL_VERIFICATION_EXEMPT(userId),
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  const unExemptUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await axiosInstance.delete<ApiSuccess<{ userId: string }>>(
        endpoints.SOCIAL_VERIFICATION_EXEMPT(userId),
      );
      return res.data.data;
    },
    onSuccess: invalidate,
  });

  return {
    listDomain: {
      items: query.data?.data?.items ?? [],
      total: query.data?.data?.total ?? 0,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      refetch: query.refetch,
    },
    actions: {
      approveRow: approveRow.mutateAsync,
      rejectRow: rejectRow.mutateAsync,
      exemptUser: exemptUser.mutateAsync,
      unExemptUser: unExemptUser.mutateAsync,
      isApproving: approveRow.isPending,
      isRejecting: rejectRow.isPending,
      isExempting: exemptUser.isPending || unExemptUser.isPending,
    },
  };
}
