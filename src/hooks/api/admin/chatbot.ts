import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { useMemo } from "react";

/**
 * @title Chatbot Logs Hook
 * @description Fetches chatbot conversation logs for a given date
 */

export const useChatbotQueries = (options: AdminQueriesOptions) => {
  const {
    fetchChatbotLogs = false,
    chatbotLogsDate = "",
  } = options;

  const chatbotLogs = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CHATBOT_LOGS}?date=${chatbotLogsDate}`,
    queryKey: ["admin-chatbot-logs", chatbotLogsDate],
    enabled: fetchChatbotLogs && !!chatbotLogsDate,
  });

  return useMemo(() => ({
    chatbotLogsDomain: {
      data: chatbotLogs.data?.data || chatbotLogs.data, // Handle both {data: [...]} and direct array
      isLoading: chatbotLogs.isLoading,
      isSuccess: chatbotLogs.isSuccess,
      isError: chatbotLogs.isError,
      error: chatbotLogs.error,
      refetch: chatbotLogs.refetch,
    },
  }), [chatbotLogs]);
};
