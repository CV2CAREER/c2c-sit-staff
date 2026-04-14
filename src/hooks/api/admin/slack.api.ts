import { useFetchData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { toast } from 'react-hot-toast';
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

// Types
interface ISlackMessage {
  id?: string;
  message: string;
  variables: { key: string }[];
  category: string;
  attachments: Record<string, any>;
  isActive: boolean;
}

export const useSlackMutations = () => {
  const queryClient = useQueryClient();

  const createSlackMessage = useMutation({
    mutationKey: ["admin-create-slack-message"],
    mutationFn: async (values: Partial<ISlackMessage>) => {
      const response = await axiosInstance.post(endpoints.ADMIN_SLACK_MANAGE, {
        message: values.message,
        variables: values.variables || [],
        category: values.category,
        attachments: values.attachments || {},
        isActive: values.isActive ?? true
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-slack-messages"] });
      toast.success('Message created successfully');
    },
    onError: () => {
      toast.error('Failed to create message');
    }
  });

  const updateSlackMessage = useMutation({
    mutationKey: ["admin-update-slack-message"],
    mutationFn: async ({ id, values }: { id: string; values: Partial<ISlackMessage> }) => {
      const response = await axiosInstance.put(endpoints.ADMIN_SLACK_MANAGE_WITH_ID(id), values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-slack-messages"] });
      toast.success('Message updated successfully');
    },
    onError: () => {
      toast.error('Failed to update message');
    }
  });

  const deleteSlackMessage = useMutation({
    mutationKey: ["admin-delete-slack-message"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(endpoints.ADMIN_SLACK_MANAGE_WITH_ID(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-slack-messages"] });
      toast.success('Message deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete message');
    }
  });

  return {
    slackDomain: {
      createSlackMessage,
      updateSlackMessage,
      deleteSlackMessage
    }
  };
};

export const useSlackQueries = () => {
  const messages = useFetchData<ISlackMessage[]>({
    method: "GET",
    url: endpoints.ADMIN_SLACK_MANAGE,
    queryKey: ["admin-slack-messages"],
    enabled: true,
  });

  return {
    slackMessagesDomain: {
      data: messages.data?.data || [],
      isLoading: messages.isLoading,
      isSuccess: messages.isSuccess,
      isError: messages.isError,
      error: messages.error,
      refetch: messages.refetch,
    }
  };
};