import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

type CommunicationTemplateUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email: string;
  role?: string;
  phoneNumber?: string | null;
  isEmailVerified?: boolean;
};

export type EmailTemplateType = "admin" | "customer";

export type CommunicationTemplate = {
  id: string;
  key: string;
  name: string;
  type: EmailTemplateType;
  body: string;
  variables: string[];
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type NotifyPayload = {
  userId: string;
  missingInfoType: string;
  missingInfoUrl: string;
  mode?: "email" | "whatsapp";
};

export type EmailTrigger = {
  triggerKey: string;
  label: string;
  reassignable: boolean;
  isBound: boolean;
  resolvedTemplate: CommunicationTemplate | null;
};

type TestSendResolution = {
  templateId: string;
  triggerKeyUsed: string | null;
  variables: Record<string, string>;
};

type CreateTemplatePayload = {
  key: string;
  name: string;
  type: EmailTemplateType;
  body: string;
  variables?: string[];
};

type UpdateTemplatePayload = {
  id: string;
  name?: string;
  type?: EmailTemplateType;
  body?: string;
  variables?: string[];
};

export function useCommunicationTemplates({
  fetchUsers = true,
  recycleBin = false,
  category,
}: {
  fetchUsers?: boolean;
  recycleBin?: boolean;
  category?: EmailTemplateType;
} = {}) {
  const queryClient = useQueryClient();

  const usersQuery = useFetchData<{ users: CommunicationTemplateUser[]; count: number }>({
    method: "GET",
    url: endpoints.USER_ALL,
    queryKey: ["communication-templates-users"],
    enabled: fetchUsers,
  });

  const templatesQuery = useFetchData<CommunicationTemplate[]>({
    method: "GET",
    url: endpoints.ADMIN_TEMPLATES,
    queryKey: ["communication-templates", recycleBin ? "deleted" : "active", category ?? "all"],
    enabled: true,
    params: {
      ...(recycleBin ? { status: "deleted" } : {}),
      ...(category ? { category } : {}),
    },
  });

  const triggersQuery = useFetchData<EmailTrigger[]>({
    method: "GET",
    url: endpoints.ADMIN_EMAIL_TRIGGERS,
    queryKey: ["email-triggers"],
    enabled: true,
  });

  const invalidateTemplates = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["communication-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["communication-templates-users"] }),
    ]);
  };

  const invalidateTriggers = async () => {
    await queryClient.invalidateQueries({ queryKey: ["email-triggers"] });
  };

  const createTemplate = useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const response = await axiosInstance.post<ApiSuccess<CommunicationTemplate>>(
        endpoints.ADMIN_TEMPLATES,
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const updateTemplate = useMutation({
    mutationFn: async (payload: UpdateTemplatePayload) => {
      const response = await axiosInstance.patch<ApiSuccess<CommunicationTemplate>>(
        endpoints.ADMIN_TEMPLATES,
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const softDeleteTemplate = useMutation({
    mutationFn: async (key: string) => {
      const response = await axiosInstance.patch<ApiSuccess<CommunicationTemplate>>(
        `${endpoints.ADMIN_TEMPLATES}?action=soft-delete&key=${encodeURIComponent(key)}`,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const restoreTemplate = useMutation({
    mutationFn: async (key: string) => {
      const response = await axiosInstance.patch<ApiSuccess<CommunicationTemplate>>(
        `${endpoints.ADMIN_TEMPLATES}?action=restore&key=${encodeURIComponent(key)}`,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const notifyMissingInfo = useMutation({
    mutationFn: async (payload: NotifyPayload) => {
      const response = await axiosInstance.post<ApiSuccess<unknown>>(
        endpoints.COMMUNICATION_TEMPLATE_NOTIFY_MISSING_INFO,
        payload,
      );
      return response.data;
    },
  });

  const rebindTrigger = useMutation({
    mutationFn: async ({ triggerKey, templateId }: { triggerKey: string; templateId: string }) => {
      const response = await axiosInstance.patch<ApiSuccess<EmailTrigger>>(
        endpoints.ADMIN_EMAIL_TRIGGER_BINDING(triggerKey),
        { templateId },
      );
      return response.data.data;
    },
    onSuccess: invalidateTriggers,
  });

  const resetTrigger = useMutation({
    mutationFn: async (triggerKey: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(
        endpoints.ADMIN_EMAIL_TRIGGER_BINDING(triggerKey),
      );
      return response.data.data;
    },
    onSuccess: invalidateTriggers,
  });

  const resolveTestSend = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await axiosInstance.get<ApiSuccess<TestSendResolution>>(
        endpoints.ADMIN_TEMPLATE_TEST_SEND_RESOLVE(templateId),
      );
      return response.data.data;
    },
  });

  const sendTestEmail = useMutation({
    mutationFn: async ({
      templateId,
      values,
      triggerKeyUsed,
    }: {
      templateId: string;
      values: Record<string, string>;
      triggerKeyUsed?: string | null;
    }) => {
      const response = await axiosInstance.post<ApiSuccess<{ success: boolean; recipientEmail: string }>>(
        endpoints.ADMIN_TEMPLATE_TEST_SEND(templateId),
        { values, triggerKeyUsed },
      );
      return response.data.data;
    },
  });

  const clientUsers = useMemo(() => {
    const users = usersQuery.data?.data?.users ?? [];
    return users
      .filter((user) => user.role === "client" && user.isEmailVerified !== false)
      .sort((a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.middleName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.middleName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [usersQuery.data]);

  return {
    usersDomain: {
      data: clientUsers,
      total: clientUsers.length,
      isLoading: usersQuery.isLoading,
      isSuccess: usersQuery.isSuccess,
      isError: usersQuery.isError,
      error: usersQuery.error,
      refetch: usersQuery.refetch,
    },
    templatesDomain: {
      data: templatesQuery.data?.data ?? [],
      isLoading: templatesQuery.isLoading,
      isSuccess: templatesQuery.isSuccess,
      isError: templatesQuery.isError,
      error: templatesQuery.error,
      refetch: templatesQuery.refetch,
    },
    triggersDomain: {
      data: triggersQuery.data?.data ?? [],
      isLoading: triggersQuery.isLoading,
      isSuccess: triggersQuery.isSuccess,
      isError: triggersQuery.isError,
      error: triggersQuery.error,
      refetch: triggersQuery.refetch,
    },
    actions: {
      createTemplate: createTemplate.mutateAsync,
      updateTemplate: updateTemplate.mutateAsync,
      softDeleteTemplate: softDeleteTemplate.mutateAsync,
      restoreTemplate: restoreTemplate.mutateAsync,
      notifyMissingInfo: notifyMissingInfo.mutateAsync,
      rebindTrigger: rebindTrigger.mutateAsync,
      resetTrigger: resetTrigger.mutateAsync,
      resolveTestSend: resolveTestSend.mutateAsync,
      sendTestEmail: sendTestEmail.mutateAsync,
      isMutating:
        createTemplate.isPending ||
        updateTemplate.isPending ||
        softDeleteTemplate.isPending ||
        restoreTemplate.isPending ||
        notifyMissingInfo.isPending ||
        rebindTrigger.isPending ||
        resetTrigger.isPending ||
        sendTestEmail.isPending,
    },
    backendStatus: {
      templatesReady: true,
      notificationsReady: true,
      usersReady: true,
    },
  };
}
