import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { useFetchData } from "../../useApi";
import type {
  AiResponse,
  CompareRequest,
  CompareResult,
  PingResult,
  TableUsage,
  TargetsResponse,
} from "@/app/admin/schema-compare/_components/types";

// The backend already turns pg/network failures into admin-readable
// messages ("Authentication failed for ...", "no free connection slots"),
// so surface its `message` rather than axios' generic one.
export const schemaDiffErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Could not reach the staff backend. Check your connection and try again.";
    return (err.response.data as { message?: string } | undefined)?.message || `Request failed (${err.response.status}).`;
  }
  return (err as { message?: string } | null)?.message || "Something went wrong.";
};

const post = async <T>(url: string, body: unknown): Promise<T> => {
  const response = await axiosInstance.post(url, body);
  if (!response.data?.success) {
    throw new Error(response.data?.message || "Request failed");
  }
  return response.data.data as T;
};

export const useSchemaDiffTargets = () =>
  useFetchData<TargetsResponse>({
    method: "GET",
    url: endpoints.ADMIN_SCHEMA_DIFF_TARGETS,
    queryKey: ["admin-schema-diff-targets"],
    enabled: true,
    staleEarly: true,
  });

export const useSchemaDiffPing = () =>
  useMutation<PingResult, unknown, string>({
    mutationKey: ["admin-schema-diff-ping"],
    mutationFn: (key) => post<PingResult>(endpoints.ADMIN_SCHEMA_DIFF_PING, { key }),
  });

export const useSchemaDiffCompare = () =>
  useMutation<CompareResult, unknown, CompareRequest>({
    mutationKey: ["admin-schema-diff-compare"],
    mutationFn: (body) => post<CompareResult>(endpoints.ADMIN_SCHEMA_DIFF_COMPARE, body),
  });

export const useSchemaDiffAi = () =>
  useMutation<AiResponse, unknown, CompareRequest & { question?: string }>({
    mutationKey: ["admin-schema-diff-ai"],
    mutationFn: (body) => post<AiResponse>(endpoints.ADMIN_SCHEMA_DIFF_AI, body),
  });

export const useSchemaDiffTableUsage = () =>
  useMutation<{ table: string; usage: TableUsage | null }, unknown, { table: string; usage: TableUsage | null }>({
    mutationKey: ["admin-schema-diff-table-usage"],
    mutationFn: (body) => post(endpoints.ADMIN_SCHEMA_DIFF_TABLE_USAGE, body),
  });
