import { useFetchData, useMutateData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * @title Chatbot Trainer Hook
 * @description Manages chatbot training data (Support AI Prompt)
 */

export const useChatbotQueries = (options: AdminQueriesOptions) => {
  const { 
    fetchChatbotTrainer = false,
    fetchChatbotLogs = false,
    chatbotLogsDate = "",
  } = options;

  const supportAiPrompt = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CHATBOT_TRAIN,
    queryKey: ["admin-support-ai-prompt"],
    enabled: fetchChatbotTrainer,
  });

  const chatbotLogs = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CHATBOT_LOGS}?date=${chatbotLogsDate}`,
    queryKey: ["admin-chatbot-logs", chatbotLogsDate],
    enabled: fetchChatbotLogs && !!chatbotLogsDate,
  });

  return useMemo(() => ({
    supportAiPromptDomain: {
      data: supportAiPrompt.data?.data,
      isLoading: supportAiPrompt.isLoading,
      isSuccess: supportAiPrompt.isSuccess,
      isError: supportAiPrompt.isError,
      error: supportAiPrompt.error,
      refetch: supportAiPrompt.refetch,
    },
    chatbotLogsDomain: {
      data: chatbotLogs.data?.data || chatbotLogs.data, // Handle both {data: [...]} and direct array
      isLoading: chatbotLogs.isLoading,
      isSuccess: chatbotLogs.isSuccess,
      isError: chatbotLogs.isError,
      error: chatbotLogs.error,
      refetch: chatbotLogs.refetch,
    },
  }), [supportAiPrompt, chatbotLogs]);
};

export const useChatbotMutations = () => {
  const queryClient = useQueryClient();

  return {
    saveChatbotEntryMutation: useMutateData<any, { question: string; response: string }>({
      method: "POST",
      url: endpoints.ADMIN_CHATBOT_TRAIN,
      mutationKey: ["admin-save-chatbot-entry"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-support-ai-prompt"] });
      },
      onError: () => {},
    }),
    deleteChatbotEntryMutation: useMutateData<any, { question: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_CHATBOT_TRAIN,
      mutationKey: ["admin-delete-chatbot-entry"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-support-ai-prompt"] });
      },
      onError: () => {},
    }),
  };
};
