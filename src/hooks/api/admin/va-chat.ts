import { useMutateData, useFetchData } from "@/hooks/useApi";
import { ASSISTANT_VA_CHAT } from "@/constants/apiEndpoints/admin.endpoint";
import { useQueryClient } from "@tanstack/react-query";

export interface VaChatMessage {
  role: "user" | "assistant" | "system";
  message: string;
}

export interface SendMessagePayload {
  message: string;
  sessionId: string;
  userId?: string;
  jobUrl?: string;
  type?: string;
}

export interface SendMessageResponse {
  message: string;
  sessionId: string;
}

export interface DeleteSessionPayload {
  sessionId: string;
}

/** Fetch chat history for a given session */
export const useVaChatMessages = (sessionId: string, enabled = false) => {
  const result = useFetchData<VaChatMessage[]>({
    method: "GET",
    url: ASSISTANT_VA_CHAT,
    queryKey: ["va-chat-messages", sessionId],
    enabled: enabled && !!sessionId,
    params: { sessionId },
    staleEarly: true,
  });

  return {
    messages: result.data?.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: result.refetch,
  };
};

/** Mutations: send message and delete session */
export const useVaChatMutations = (sessionId?: string) => {
  const queryClient = useQueryClient();

  const invalidateMessages = () => {
    if (sessionId) {
      queryClient.invalidateQueries({ queryKey: ["va-chat-messages", sessionId] });
    }
  };

  const sendMessage = useMutateData<SendMessageResponse, SendMessagePayload>({
    method: "POST",
    url: ASSISTANT_VA_CHAT,
    mutationKey: ["va-chat-send", sessionId ?? ""],
    onSuccess: invalidateMessages,
    onError: () => {},
  });

  const deleteSession = useMutateData<{ message: string }, DeleteSessionPayload>({
    method: "DELETE",
    url: (data) => `${ASSISTANT_VA_CHAT}?sessionId=${data.sessionId}`,
    mutationKey: ["va-chat-delete", sessionId ?? ""],
    onSuccess: () => {
      if (sessionId) {
        queryClient.removeQueries({ queryKey: ["va-chat-messages", sessionId] });
      }
    },
    onError: () => {},
  });

  return { sendMessage, deleteSession };
};
