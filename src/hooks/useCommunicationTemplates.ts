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

  const invalidateTemplates = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["communication-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["communication-templates-users"] }),
    ]);
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
    actions: {
      createTemplate: createTemplate.mutateAsync,
      updateTemplate: updateTemplate.mutateAsync,
      softDeleteTemplate: softDeleteTemplate.mutateAsync,
      restoreTemplate: restoreTemplate.mutateAsync,
      notifyMissingInfo: notifyMissingInfo.mutateAsync,
      isMutating:
        createTemplate.isPending ||
        updateTemplate.isPending ||
        softDeleteTemplate.isPending ||
        restoreTemplate.isPending ||
        notifyMissingInfo.isPending,
    },
    backendStatus: {
      templatesReady: true,
      notificationsReady: true,
      usersReady: true,
    },
  };
}
