import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import axiosInstance from "@/services/api-client";
import { ApiSuccess } from "@/types/apiResponse.types";

type SupportUser = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export type SupportSession = {
  id: string;
  customerId?: string;
  assignedStaffId?: string;
  subject?: string;
  status: "open" | "active" | "closed" | "resolved";
  createdAt?: string;
  updatedAt?: string;
  customer?: SupportUser;
  assignedStaff?: SupportUser;
};

export type SupportMessage = {
  id: string;
  supportSessionId: string;
  senderType: "customer" | "staff" | "system";
  senderId?: string;
  message: string;
  createdAt?: string;
  updatedAt?: string;
  sender?: SupportUser;
};

type SessionsResponse = {
  data: SupportSession[];
  total: number;
};

type SendMessagePayload = {
  sessionId: string;
  message: string;
  senderType?: "customer" | "staff" | "system";
};

type AssignStaffPayload = {
  sessionId: string;
  staffId: string;
};

type UseSupportDeskOptions = {
  sessionId?: string | null;
  page?: number;
  limit?: number;
  pollIntervalMs?: number;
};

const SUPPORT_SESSIONS_QUERY_KEY = ["support-desk-sessions"];
const SUPPORT_MESSAGES_QUERY_KEY = "support-desk-messages";

export function useSupportDesk({
  sessionId,
  page = 1,
  limit = 20,
  pollIntervalMs = 15000,
}: UseSupportDeskOptions = {}) {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: [...SUPPORT_SESSIONS_QUERY_KEY, page, limit],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiSuccess<SessionsResponse>>(
        endpoints.ADMIN_SUPPORT_DESK,
        {
          params: { page, limit },
        },
      );
      return response.data.data;
    },
    refetchInterval: pollIntervalMs,
  });

  const messagesQuery = useQuery({
    queryKey: [SUPPORT_MESSAGES_QUERY_KEY, sessionId],
    queryFn: async () => {
      const response = await axiosInstance.get<ApiSuccess<SupportMessage[]>>(
        endpoints.ADMIN_SUPPORT_DESK_MESSAGES(sessionId as string),
      );
      return response.data.data;
    },
    enabled: Boolean(sessionId),
    refetchInterval: sessionId ? Math.max(5000, pollIntervalMs) : false,
  });

  const invalidateSupportQueries = React.useCallback(
    async (currentSessionId?: string | null) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: SUPPORT_SESSIONS_QUERY_KEY,
        }),
        currentSessionId
          ? queryClient.invalidateQueries({
              queryKey: [SUPPORT_MESSAGES_QUERY_KEY, currentSessionId],
            })
          : Promise.resolve(),
      ]);
    },
    [queryClient],
  );

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      sessionId: targetSessionId,
      message,
      senderType = "staff",
    }: SendMessagePayload) => {
      const response = await axiosInstance.post<ApiSuccess<SupportMessage>>(
        endpoints.ADMIN_SUPPORT_DESK_MESSAGES(targetSessionId),
        {
          message,
          senderType,
        },
      );
      return response.data.data;
    },
    onSuccess: async (_, variables) => {
      await invalidateSupportQueries(variables.sessionId);
    },
  });

  const assignStaffMutation = useMutation({
    mutationFn: async (payload: AssignStaffPayload) => {
      const response = await axiosInstance.put<ApiSuccess<SupportSession>>(
        endpoints.ADMIN_SUPPORT_DESK_ASSIGN,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async (_, variables) => {
      await invalidateSupportQueries(variables.sessionId);
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async (targetSessionId: string) => {
      const response = await axiosInstance.put<ApiSuccess<SupportSession>>(
        endpoints.ADMIN_SUPPORT_DESK_END(targetSessionId),
      );
      return response.data.data;
    },
    onSuccess: async (_, targetSessionId) => {
      await invalidateSupportQueries(targetSessionId);
    },
  });

  return {
    sessionsDomain: {
      data: sessionsQuery.data?.data ?? [],
      total: sessionsQuery.data?.total ?? 0,
      isLoading: sessionsQuery.isLoading,
      isFetching: sessionsQuery.isFetching,
      isError: sessionsQuery.isError,
      error: sessionsQuery.error,
      refetch: sessionsQuery.refetch,
    },
    messagesDomain: {
      data: messagesQuery.data ?? [],
      isLoading: messagesQuery.isLoading,
      isFetching: messagesQuery.isFetching,
      isError: messagesQuery.isError,
      error: messagesQuery.error,
      refetch: messagesQuery.refetch,
    },
    actions: {
      sendMessage: sendMessageMutation.mutateAsync,
      sendingMessage: sendMessageMutation.isPending,
      assignStaff: assignStaffMutation.mutateAsync,
      assigningStaff: assignStaffMutation.isPending,
      endSession: endSessionMutation.mutateAsync,
      endingSession: endSessionMutation.isPending,
    },
  };
}
