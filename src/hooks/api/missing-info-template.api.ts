import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/missing-info-template.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type MissingInfoTemplate = {
  id: string;
  name: string;
  category: "identity" | "work_rights" | "references" | "certifications" | "banking";
  type: "referee_block" | "free_form";
  status: "draft" | "published";
  createdById: string;
  publishCount: number;
  fields?: MissingInfoTemplateField[];
  createdAt: string;
  updatedAt: string;
};

export type MissingInfoTemplateField = {
  id: string;
  templateId: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  isVisible: boolean;
  options: { label: string; value: string }[] | null;
  helpText: string | null;
  sortOrder: number;
  isRefereeBlock: boolean;
  refereeBlockIndex: number | null;
  createdAt: string;
  updatedAt: string;
};

type CreateTemplatePayload = {
  name: string;
  category: string;
  type: string;
  fields?: Partial<MissingInfoTemplateField>[];
};

type UpdateTemplatePayload = Partial<CreateTemplatePayload> & { id: string };

export function useMissingInfoTemplates(filter?: { category?: string; status?: string }) {
  const queryClient = useQueryClient();

  const queryKey = [
    "missing-info-templates",
    filter?.status ?? "all",
    filter?.category ?? "all",
  ];

  const templatesQuery = useFetchData<MissingInfoTemplate[]>({
    method: "GET",
    url: endpoints.MISSING_INFO_TEMPLATES,
    queryKey,
    enabled: true,
    params: filter?.status || filter?.category
      ? { ...(filter.status && { status: filter.status }), ...(filter.category && { category: filter.category }) }
      : undefined,
  });

  const invalidateTemplates = async () => {
    await queryClient.invalidateQueries({ queryKey: ["missing-info-templates"] });
  };

  const createTemplate = useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const response = await axiosInstance.post<ApiSuccess<MissingInfoTemplate>>(
        endpoints.MISSING_INFO_TEMPLATES,
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const updateTemplate = useMutation({
    mutationFn: async (payload: UpdateTemplatePayload) => {
      const { id, ...data } = payload;
      const response = await axiosInstance.put<ApiSuccess<MissingInfoTemplate>>(
        endpoints.MISSING_INFO_TEMPLATE(id),
        data,
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(
        endpoints.MISSING_INFO_TEMPLATE(id),
      );
      return response.data;
    },
    onSuccess: invalidateTemplates,
  });

  const publishTemplate = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.post<ApiSuccess<MissingInfoTemplate>>(
        endpoints.MISSING_INFO_TEMPLATE_PUBLISH(id),
      );
      return response.data.data;
    },
    onSuccess: invalidateTemplates,
  });

  const templates = templatesQuery.data?.data ?? [];

  return {
    templatesDomain: {
      data: templates,
      isLoading: templatesQuery.isLoading,
      isSuccess: templatesQuery.isSuccess,
      isError: templatesQuery.isError,
      error: templatesQuery.error,
      refetch: templatesQuery.refetch,
    },
    actions: {
      createTemplate: createTemplate.mutateAsync,
      updateTemplate: updateTemplate.mutateAsync,
      deleteTemplate: deleteTemplate.mutateAsync,
      publishTemplate: publishTemplate.mutateAsync,
      isMutating:
        createTemplate.isPending ||
        updateTemplate.isPending ||
        deleteTemplate.isPending ||
        publishTemplate.isPending,
    },
  };
}

export function useMissingInfoTemplate(id: string) {
  const queryClient = useQueryClient();

  const templateQuery = useFetchData<MissingInfoTemplate>({
    method: "GET",
    url: endpoints.MISSING_INFO_TEMPLATE(id),
    queryKey: ["missing-info-template", id],
    enabled: !!id,
  });

  const template = templateQuery.data?.data ?? null;

  const updateMutation = useMutation({
    mutationFn: async (payload: Omit<UpdateTemplatePayload, "id">) => {
      const response = await axiosInstance.put<ApiSuccess<MissingInfoTemplate>>(
        endpoints.MISSING_INFO_TEMPLATE(id),
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["missing-info-template", id] });
      await queryClient.invalidateQueries({ queryKey: ["missing-info-templates"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post<ApiSuccess<MissingInfoTemplate>>(
        endpoints.MISSING_INFO_TEMPLATE_PUBLISH(id),
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["missing-info-template", id] });
      await queryClient.invalidateQueries({ queryKey: ["missing-info-templates"] });
    },
  });

  return {
    templateDomain: {
      data: template,
      isLoading: templateQuery.isLoading,
      isSuccess: templateQuery.isSuccess,
      isError: templateQuery.isError,
      error: templateQuery.error,
      refetch: templateQuery.refetch,
    },
    actions: {
      updateTemplate: updateMutation.mutateAsync,
      publishTemplate: publishMutation.mutateAsync,
      isSaving: updateMutation.isPending,
      isPublishing: publishMutation.isPending,
    },
  };
}

export type SendRequestPayload = {
  clientId: string;
  templateId: string;
  jobApplicationId?: string;
  personalMessage?: string;
  channel: "email" | "whatsapp";
};

export type OutstandingRequest = {
  id: string;
  clientName: string;
  clientEmail: string;
  channel: string;
  templateId: string;
  templateName?: string;
  status: string;
  reminderCount: number;
  createdAt: string;
  ageDays: number;
  requestedByName: string;
};

export type RequestStats = {
  pending: number;
  viewed: number;
  in_progress: number;
  submitted: number;
  total: number;
  templateCount: number;
};

export function useSendRequest() {
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async (payload: SendRequestPayload) => {
      const response = await axiosInstance.post<ApiSuccess<any>>(
        endpoints.MISSING_INFO_REQUESTS_STAFF_SEND,
        payload,
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["missing-info-outstanding"] });
      await queryClient.invalidateQueries({ queryKey: ["missing-info-stats"] });
    },
  });

  return {
    sendRequest: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
}

export function useOutstandingRequests(filters?: { status?: string; age?: string; page?: number }) {
  const query = useFetchData<{ requests: OutstandingRequest[]; pagination: any }>({
    method: "GET",
    url: endpoints.MISSING_INFO_REQUESTS_STAFF_OUTSTANDING,
    queryKey: ["missing-info-outstanding", filters?.status ?? "all", filters?.age ?? "all", filters?.page ?? 1],
    enabled: true,
    params: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.age && { age: filters.age }),
      ...(filters?.page && { page: filters.page }),
    },
  });

  return {
    data: query.data?.data?.requests ?? [],
    pagination: query.data?.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useRequestStats() {
  const query = useFetchData<RequestStats>({
    method: "GET",
    url: endpoints.MISSING_INFO_REQUESTS_STAFF_STATS,
    queryKey: ["missing-info-stats"],
    enabled: true,
  });

  return {
    stats: query.data?.data ?? { pending: 0, viewed: 0, in_progress: 0, submitted: 0, total: 0, templateCount: 0 },
    isLoading: query.isLoading,
  };
}

export function useBulkReminder() {
  const queryClient = useQueryClient();

  const bulkMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      const response = await axiosInstance.post<ApiSuccess<any>>(
        endpoints.MISSING_INFO_REQUESTS_STAFF_BULK_REMINDER,
        { requestIds },
      );
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["missing-info-outstanding"] });
      await queryClient.invalidateQueries({ queryKey: ["missing-info-stats"] });
    },
  });

  return {
    sendBulkReminder: bulkMutation.mutateAsync,
    isSending: bulkMutation.isPending,
  };
}
