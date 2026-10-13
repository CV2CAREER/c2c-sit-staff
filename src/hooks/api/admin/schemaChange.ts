import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import type {
  ChangeRequest,
  OperationInput,
  PlanResult,
  RowCondition,
  RowsResponse,
  Structure,
} from "@/app/admin/schema-changes/_components/types";
import type { ImportAnswers, Interpretation, LoadedWorkbook, ParsedSheet } from "@/app/admin/schema-changes/_components/import-types";

export { schemaDiffErrorMessage as schemaChangeErrorMessage } from "./schemaDiff";

const unwrap = <T>(response: { data?: { success?: boolean; message?: string; data?: T } }): T => {
  if (!response.data?.success) throw new Error(response.data?.message || "Request failed");
  return response.data.data as T;
};

export const useSchemaChanges = (status?: string) =>
  useQuery<ChangeRequest[]>({
    queryKey: ["admin-schema-changes", status || "all"],
    queryFn: async () => unwrap<ChangeRequest[]>(await axiosInstance.get(endpoints.ADMIN_SCHEMA_CHANGES, { params: status ? { status } : {} })),
    refetchInterval: 30_000,
  });

export const useSchemaChange = (id: string) =>
  useQuery<ChangeRequest>({
    queryKey: ["admin-schema-change", id],
    queryFn: async () => unwrap<ChangeRequest>(await axiosInstance.get(endpoints.ADMIN_SCHEMA_CHANGE(id))),
    enabled: !!id,
    // Keep an eye on running/waiting requests (another admin may act).
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "running" ? 3000 : s === "pending_approval" || s === "approved" ? 20_000 : false;
    },
  });

export const useSchemaChangeStructure = (key: string) =>
  useQuery<Structure>({
    queryKey: ["admin-schema-change-structure", key],
    queryFn: async () => unwrap<Structure>(await axiosInstance.get(endpoints.ADMIN_SCHEMA_CHANGE_STRUCTURE, { params: { key } })),
    enabled: !!key,
    staleTime: 60_000,
    retry: false,
  });

export const useSchemaChangePreview = () =>
  useMutation<PlanResult, unknown, { targetKey: string; operations: OperationInput[] }>({
    mutationFn: async (body) => unwrap<PlanResult>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_PREVIEW, body)),
  });

export const useSchemaChangeRows = () =>
  useMutation<
    RowsResponse,
    unknown,
    { targetKey: string; schema: string; table: string; conditions: RowCondition[]; page: number; pageSize: number }
  >({
    mutationFn: async (body) => unwrap<RowsResponse>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_ROWS, body)),
  });

export const useImportLoad = () =>
  useMutation<LoadedWorkbook, unknown, { file?: File; url?: string }>({
    mutationFn: async ({ file, url }) => {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        return unwrap<LoadedWorkbook>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_IMPORT_LOAD, form, { timeout: 60_000 }));
      }
      return unwrap<LoadedWorkbook>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_IMPORT_LOAD, { url }, { timeout: 60_000 }));
    },
  });

export const useImportInterpret = () =>
  useMutation<
    Interpretation,
    unknown,
    { targetKey: string; source: string; sheetName: string; headers: string[]; rows: ParsedSheet["rows"]; answers: ImportAnswers }
  >({
    mutationFn: async (body) => unwrap<Interpretation>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_IMPORT_INTERPRET, body, { timeout: 120_000 })),
  });

export const useSchemaChangeExplain = () =>
  useMutation<{ explanation: string }, unknown, { requestId?: string; plan?: PlanResult }>({
    mutationFn: async (body) => unwrap(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_EXPLAIN, body)),
  });

export const useCreateSchemaChange = () => {
  const qc = useQueryClient();
  return useMutation<ChangeRequest, unknown, { targetKey: string; operations: OperationInput[]; title: string; reason: string }>({
    mutationFn: async (body) => unwrap<ChangeRequest>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGES, body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-schema-changes"] }),
  });
};

type Action = "approve" | "reject" | "cancel" | "apply" | "revert";

export const useSchemaChangeAction = (id: string) => {
  const qc = useQueryClient();
  return useMutation<ChangeRequest, unknown, { action: Action; reason?: string; confirmation?: string; masterKey?: string }>({
    mutationFn: async ({ action, ...body }) =>
      unwrap<ChangeRequest>(await axiosInstance.post(endpoints.ADMIN_SCHEMA_CHANGE_ACTION(id, action), body)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-schema-change", id] });
      qc.invalidateQueries({ queryKey: ["admin-schema-changes"] });
    },
  });
};
