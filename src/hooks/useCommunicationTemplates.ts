import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

type CommunicationTemplateUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email: string;
  role?: string;
  phoneNumber?: string | null;
  isEmailVerified?: boolean;
};

export type CommunicationTemplate = {
  _id: string;
  id: string;
  templateName: string;
  persona: string;
  subject: string;
  body: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type NotifyPayload = {
  userId: string;
  missingInfoType: string;
  missingInfoUrl: string;
  mode?: "email" | "whatsapp";
};

type TemplatePayload = {
  id?: string;
  templateName: string;
  persona: string;
  subject: string;
  body: string;
};

export function useCommunicationTemplates({
  fetchUsers = true,
  recycleBin = false,
}: {
  fetchUsers?: boolean;
  recycleBin?: boolean;
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
    queryKey: ["communication-templates", recycleBin ? "deleted" : "active"],
    enabled: true,
    params: recycleBin ? { type: "deleted" } : {},
  });

  const invalidateTemplates = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["communication-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["communication-templates-users"] }),
    ]);
  };

  const createTemplate = useMutation({
    mutationFn: async (payload: TemplatePayload) => {
      const response = await axiosInstance.post<ApiSuccess<CommunicationTemplate>>(
        endpoints.ADMIN_TEMPLATES,
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const updateTemplate = useMutation({
    mutationFn: async (payload: TemplatePayload & { id: string }) => {
      const response = await axiosInstance.patch<ApiSuccess<CommunicationTemplate>>(
        endpoints.ADMIN_TEMPLATES,
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const softDeleteTemplate = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await axiosInstance.patch<ApiSuccess<CommunicationTemplate>>(
        `${endpoints.ADMIN_TEMPLATES}?action=soft-delete&templateName=${encodeURIComponent(identifier)}`,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const restoreTemplate = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await axiosInstance.patch<ApiSuccess<CommunicationTemplate>>(
        `${endpoints.ADMIN_TEMPLATES}?action=restore&templateName=${encodeURIComponent(identifier)}`,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateName: string) => {
      const response = await axiosInstance.post<ApiSuccess<CommunicationTemplate>>(
        `${endpoints.ADMIN_TEMPLATES}?request=duplicate&templateName=${encodeURIComponent(templateName)}`,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(
        `${endpoints.ADMIN_TEMPLATES}?templateName=${encodeURIComponent(identifier)}`,
      );
      return response.data;
    },
    onSuccess: invalidateTemplates,
  });

  const notifyMissingInfo = useMutation({
    mutationFn: async (payload: NotifyPayload) => {
      const endpoint =
        payload.mode === "whatsapp"
          ? endpoints.ADMIN_TEMPLATE_NOTIFY_WHATSAPP
          : endpoints.ADMIN_TEMPLATE_NOTIFY;
      const response = await axiosInstance.post<ApiSuccess<unknown>>(endpoint, payload);
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
      duplicateTemplate: duplicateTemplate.mutateAsync,
      deleteTemplate: deleteTemplate.mutateAsync,
      notifyMissingInfo: notifyMissingInfo.mutateAsync,
      isMutating:
        createTemplate.isPending ||
        updateTemplate.isPending ||
        softDeleteTemplate.isPending ||
        restoreTemplate.isPending ||
        duplicateTemplate.isPending ||
        deleteTemplate.isPending ||
        notifyMissingInfo.isPending,
    },
    backendStatus: {
      templatesReady: true,
      notificationsReady: true,
      usersReady: true,
    },
  };
}
