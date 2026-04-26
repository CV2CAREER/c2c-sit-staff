import { useFetchData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { PromptCategory, PromptQuestion, PromptSimulation } from "@/data/ai-prompts";
import { useMemo } from "react";

export const usePromptsQueries = (options: { basePath: string; enabled?: boolean; isCvAi?: boolean }) => {
  const { basePath, enabled = true, isCvAi = false } = options;

  const allData = useFetchData<{ full: PromptCategory[]; prompts: PromptQuestion[]; simulations: PromptSimulation[] }>({
    method: "GET",
    url: endpoints.ADMIN_PROMPTS_BASE(basePath),
    queryKey: ["admin-prompts-data", basePath],
    enabled: enabled && !!basePath,
  });

  const simulations = useFetchData<PromptSimulation[]>({
    method: "GET",
    url: endpoints.ADMIN_PROMPTS_SIMULATION(basePath),
    queryKey: ["admin-prompts-simulations", basePath],
    enabled: enabled && !!basePath,
  });

  const queue = useFetchData<any[]>({
    method: "GET",
    url: endpoints.ADMIN_PROMPTS_QUEUE(basePath),
    queryKey: ["admin-prompts-queue", basePath],
    enabled: enabled && !!basePath,
  });

  const vcs = useFetchData<{ prompts: any[]; activePrompt: string }>({
    method: "GET",
    url: endpoints.ADMIN_PROMPTS_VCS(basePath),
    queryKey: ["admin-prompts-vcs", basePath],
    enabled: enabled && !!basePath,
  });

  const cvStyle = useFetchData<{ result: string }>({
    method: "GET",
    url: endpoints.ADMIN_PROMPTS_CV_STYLE,
    queryKey: ["admin-prompts-cv-style"],
    enabled: enabled && isCvAi,
  });

  const queuePayload: any = queue.data?.data;

  return useMemo(() => ({
    promptsDataDomain: {
      data: allData.data?.data,
      isLoading: allData.isLoading,
      isSuccess: allData.isSuccess,
      isError: allData.isError,
      refetch: allData.refetch,
    },
    simulationsDomain: {
      data: simulations.data?.data || [],
      isLoading: simulations.isLoading,
      isSuccess: simulations.isSuccess,
      isError: simulations.isError,
      refetch: simulations.refetch,
    },
    queueDomain: {
      data: Array.isArray(queuePayload)
        ? queuePayload
        : queuePayload?.result || [],
      isLoading: queue.isLoading,
      isSuccess: queue.isSuccess,
      isError: queue.isError,
      refetch: queue.refetch,
    },
    vcsDomain: {
      data: vcs.data?.data,
      isLoading: vcs.isLoading,
      isSuccess: vcs.isSuccess,
      isError: vcs.isError,
      refetch: vcs.refetch,
    },
    cvStyleDomain: {
      data: cvStyle.data?.data,
      isLoading: cvStyle.isLoading,
      isSuccess: cvStyle.isSuccess,
      isError: cvStyle.isError,
      refetch: cvStyle.refetch,
    }
  }), [allData, simulations, queue, queuePayload, vcs, cvStyle]);
};

export const usePromptsMutations = (basePath: string) => {
  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationKey: ["admin-create-prompt-category", basePath],
    mutationFn: async (name: string) => {
      const response = await axiosInstance.post(`${endpoints.ADMIN_PROMPTS_BASE(basePath)}?type=category`, { name });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-data", basePath] });
    }
  });

  const deleteCategory = useMutation({
    mutationKey: ["admin-delete-prompt-category", basePath],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`${endpoints.ADMIN_PROMPTS_BASE(basePath)}?type=category&id=${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-data", basePath] });
    }
  });

  const createPrompt = useMutation({
    mutationKey: ["admin-create-prompt", basePath],
    mutationFn: async (values: Partial<PromptQuestion> & { categoryId: string }) => {
      const response = await axiosInstance.post(`${endpoints.ADMIN_PROMPTS_BASE(basePath)}?type=prompt`, values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-data", basePath] });
    }
  });

  const updatePrompt = useMutation({
    mutationKey: ["admin-update-prompt", basePath],
    mutationFn: async ({ id, values }: { id: string; values: Partial<PromptQuestion> }) => {
      const response = await axiosInstance.put(`${endpoints.ADMIN_PROMPTS_BASE(basePath)}?id=${id}`, values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-data", basePath] });
    }
  });

  const deletePrompt = useMutation({
    mutationKey: ["admin-delete-prompt", basePath],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`${endpoints.ADMIN_PROMPTS_BASE(basePath)}?type=prompts&id=${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-data", basePath] });
    }
  });

  const addToQueue = useMutation({
    mutationKey: ["admin-add-to-prompt-queue", basePath],
    mutationFn: async (input: string) => {
      const response = await axiosInstance.post(endpoints.ADMIN_PROMPTS_QUEUE(basePath), { input });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-queue", basePath] });
    }
  });

  const clearQueue = useMutation({
    mutationKey: ["admin-clear-prompt-queue", basePath],
    mutationFn: async () => {
      const response = await axiosInstance.delete(endpoints.ADMIN_PROMPTS_QUEUE(basePath));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-queue", basePath] });
    }
  });

  const submitToVcs = useMutation({
    mutationKey: ["admin-submit-to-vcs", basePath],
    mutationFn: async (prompt: string) => {
      const response = await axiosInstance.post(endpoints.ADMIN_PROMPTS_VCS(basePath), { prompt });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-vcs", basePath] });
    }
  });

  const rollbackVcs = useMutation({
    mutationKey: ["admin-rollback-vcs", basePath],
    mutationFn: async (promptId: string) => {
      const response = await axiosInstance.put(endpoints.ADMIN_PROMPTS_VCS(basePath), { promptId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-vcs", basePath] });
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-data", basePath] });
    }
  });

  const saveCvStyle = useMutation({
    mutationKey: ["admin-save-cv-style"],
    mutationFn: async (input: string) => {
      const response = await axiosInstance.post(endpoints.ADMIN_PROMPTS_CV_STYLE, { input });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-prompts-cv-style"] });
    }
  });

  return {
    createCategory,
    deleteCategory,
    createPrompt,
    updatePrompt,
    deletePrompt,
    addToQueue,
    clearQueue,
    submitToVcs,
    rollbackVcs,
    saveCvStyle,
  };
};
