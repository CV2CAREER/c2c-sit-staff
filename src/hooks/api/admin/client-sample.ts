import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import { useQueryClient } from "@tanstack/react-query";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import {
  ClientSampleUser,
  ClientSampleRow,
  ClientSamplePayload,
  RemoveFromQueuePayload,
  RetryClientSamplePayload
} from "@/types/client-sample.types";
import toast from "react-hot-toast";

export const useClientSampleQueries = (options: AdminQueriesOptions) => {
  const {
    fetchClientSampleUsers = false,
    fetchClientSampleTable = false,
    sampleTableVariance = "queue",
    selectedJobsite = "",
    selectedEnv = "",
  } = options;

  const clientSampleUsers = useFetchData<ClientSampleUser[]>({
    method: "GET",
    url: endpoints.ADMIN_CLIENT_SAMPLE_USERS,
    queryKey: ["admin-client-sample-users"],
    enabled: fetchClientSampleUsers,
  });

  const clientSampleTable = useFetchData<ClientSampleRow[]>({
    method: "GET",
    url: sampleTableVariance === "completed" ? endpoints.ADMIN_CLIENT_SAMPLE : endpoints.ADMIN_CLIENT_SAMPLE_TABLE,
    params: { 
      variance: sampleTableVariance, 
      environment: selectedEnv, 
      jobsite: selectedJobsite 
    },
    queryKey: ["admin-client-sample-table", sampleTableVariance, selectedEnv, selectedJobsite],
    enabled: fetchClientSampleTable,
  });

  return useMemo(() => ({
    clientSampleUsersDomain: {
      data: clientSampleUsers.data?.data || [],
      isLoading: clientSampleUsers.isLoading,
      isSuccess: clientSampleUsers.isSuccess,
      isError: clientSampleUsers.isError,
      error: clientSampleUsers.error,
    },
    clientSampleTableDomain: {
      data: clientSampleTable.data?.data || [],
      isLoading: clientSampleTable.isLoading,
      isSuccess: clientSampleTable.isSuccess,
      isError: clientSampleTable.isError,
      error: clientSampleTable.error,
    },
  }), [
    clientSampleUsers, clientSampleTable
  ]);
};

export const useClientSampleMutations = () => {
  const queryClient = useQueryClient();

  return {
    runClientSampleMutation: useMutateData<any, ClientSamplePayload>({
      method: "POST",
      url: endpoints.ADMIN_CLIENT_SAMPLE_TABLE,
      mutationKey: ["admin-run-client-sample"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-client-sample-table"] });
      },
      onError: () => {},
    }),
    removeFromQueueMutation: useMutateData<any, RemoveFromQueuePayload>({
      method: "DELETE",
      url: endpoints.ADMIN_CLIENT_SAMPLE_TABLE,
      mutationKey: ["admin-remove-from-queue"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-client-sample-table"] });
        toast.success("Removed from queue successfully");
      },
      onError: () => {},
    }),
    retryClientSampleMutation: useMutateData<any, RetryClientSamplePayload>({
      method: "POST",
      url: endpoints.ADMIN_CLIENT_SAMPLE_TABLE,
      mutationKey: ["admin-retry-client-sample"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-client-sample-table"] });
        toast.success("Retry initiated successfully");
      },
      onError: () => {},
    }),
  };
};
