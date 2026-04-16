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

const toArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.rows)) return value.rows as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.samples)) return value.samples as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  return [];
};

const normalizeStatus = (status: unknown): ClientSampleRow["status"] => {
  const value = String(status ?? "").toLowerCase();

  if (value === "success" || value === "completed" || value === "done") return "Success";
  if (value === "failed" || value === "error") return "Failed";
  if (value === "running" || value === "processing" || value === "in-progress") return "Running";
  return "Pending";
};

const normalizeClientSampleUser = (user: any): ClientSampleUser => ({
  Alias_Email: user?.Alias_Email ?? user?.aliasEmail ?? user?.email ?? "",
  Full_Name: user?.Full_Name ?? user?.fullName ?? user?.name ?? "",
  uid: user?.uid ?? user?._id ?? user?.id ?? "",
});

const normalizeClientSampleRow = (row: any, index: number): ClientSampleRow => {
  const uid = row?.uid ?? row?._id ?? row?.userId ?? "";
  const email = row?.email ?? row?.Alias_Email ?? row?.aliasEmail ?? "";
  const aggregator = row?.aggregator ?? row?.queue ?? "";
  const startTime = row?.startTime ?? row?.start_time ?? null;

  return {
    id:
      row?.id ??
      row?._id ??
      row?.uid ??
      row?.credentialId ??
      `${email || "row"}-${aggregator || "queue"}-${startTime || index}`,
    uid,
    name: row?.name ?? row?.Full_Name ?? row?.fullName ?? "",
    email,
    jobsiteEmail: row?.jobsiteEmail ?? row?.jobsite_email ?? email,
    aggregator,
    bot: row?.bot ?? row?.botAssigned ?? null,
    startTime,
    endTime: row?.endTime ?? row?.end_time ?? null,
    progress: Number(row?.progress ?? 0),
    status: normalizeStatus(row?.status),
    env: row?.env ?? row?.environment ?? "",
    credentialId: row?.credentialId ?? row?.credential_id,
  };
};

export const useClientSampleQueries = (options: AdminQueriesOptions) => {
  const {
    fetchClientSampleUsers = false,
    fetchClientSampleTable = false,
    sampleTableVariance = "queue",
    selectedJobsite = "",
    selectedEnv = "",
  } = options;
  const normalizedEnv = selectedEnv && selectedEnv !== "All" ? selectedEnv : "";
  const normalizedJobsite = selectedJobsite && selectedJobsite !== "All" ? selectedJobsite : "";

  const tableParams = useMemo(
    () => ({
      variance: sampleTableVariance,
      ...(normalizedEnv ? { environment: normalizedEnv } : {}),
      ...(normalizedJobsite ? { jobsite: normalizedJobsite } : {}),
    }),
    [sampleTableVariance, normalizedEnv, normalizedJobsite]
  );

  const clientSampleUsers = useFetchData<ClientSampleUser[]>({
    method: "GET",
    url: endpoints.ADMIN_CLIENT_SAMPLE_USERS,
    queryKey: ["admin-client-sample-users"],
    enabled: fetchClientSampleUsers,
  });

  const clientSampleTable = useFetchData<ClientSampleRow[]>({
    method: "GET",
    url: sampleTableVariance === "completed" ? endpoints.ADMIN_CLIENT_SAMPLE : endpoints.ADMIN_CLIENT_SAMPLE_TABLE,
    params: tableParams,
    queryKey: ["admin-client-sample-table", sampleTableVariance, normalizedEnv, normalizedJobsite],
    enabled: fetchClientSampleTable,
  });

  const usersData = useMemo(() => {
    const users = toArray(clientSampleUsers.data?.data);
    return users
      .map(normalizeClientSampleUser)
      .filter((user) => Boolean(user.Alias_Email));
  }, [clientSampleUsers.data?.data]);

  const tableData = useMemo(() => {
    const rows = toArray(clientSampleTable.data?.data);
    return rows.map(normalizeClientSampleRow);
  }, [clientSampleTable.data?.data]);

  return useMemo(() => ({
    clientSampleUsersDomain: {
      data: usersData,
      isLoading: clientSampleUsers.isLoading,
      isSuccess: clientSampleUsers.isSuccess,
      isError: clientSampleUsers.isError,
      error: clientSampleUsers.error,
    },
    clientSampleTableDomain: {
      data: tableData,
      isLoading: clientSampleTable.isLoading,
      isSuccess: clientSampleTable.isSuccess,
      isError: clientSampleTable.isError,
      error: clientSampleTable.error,
    },
  }), [
    clientSampleUsers,
    usersData,
    clientSampleTable,
    tableData,
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
