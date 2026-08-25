import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/dropdown-option.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export const DROPDOWN_OPTION_LIST_KEYS = [
  "job_types",
  "advertisers",
  "industries",
  "situations",
  "salary_amounts",
  "working_rights",
] as const;

export type DropdownOptionListKey = (typeof DROPDOWN_OPTION_LIST_KEYS)[number];

export const DROPDOWN_OPTION_LIST_KEY_LABELS: Record<DropdownOptionListKey, string> = {
  job_types: "Job Types",
  advertisers: "Advertisers",
  industries: "Industries & Classifications",
  situations: "Situation",
  salary_amounts: "Salary Amounts",
  working_rights: "Working Rights",
};

// listKeys whose children are load-bearing groups (industries -> its
// classifications, salary_amounts -> its period's amounts, working_rights ->
// a country's visa/right entries).
export const GROUPED_LIST_KEYS: DropdownOptionListKey[] = ["industries", "salary_amounts", "working_rights"];

export type DropdownOptionRow = {
  id: string;
  listKey: DropdownOptionListKey;
  parentId: string | null;
  label: string;
  value: string;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  createdById: string | null;
  deletedById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  children?: DropdownOptionRow[];
};

type TreeListResponse = { items: DropdownOptionRow[] };
type PagedListResponse = { items: DropdownOptionRow[]; total: number; page: number; limit: number };

type CreateOptionPayload = {
  label: string;
  value: string;
  parentId?: string | null;
  isActive?: boolean;
};

type UpdateOptionPayload = Partial<CreateOptionPayload> & { id: string };
type ReorderItem = { id: string; sortOrder: number; parentId?: string | null };

export function useDropdownOptions(
  listKey: DropdownOptionListKey,
  options: { recycleBinOpen?: boolean; q?: string; page?: number; limit?: number } = {},
) {
  const queryClient = useQueryClient();
  const isPaged = listKey === "advertisers";

  const listQuery = useFetchData<TreeListResponse | PagedListResponse>({
    method: "GET",
    url: endpoints.DROPDOWN_OPTIONS(listKey),
    queryKey: ["dropdown-options", listKey, isPaged ? { q: options.q, page: options.page } : null],
    enabled: true,
    forceRefresh: true,
    params: isPaged ? { q: options.q || undefined, page: options.page ?? 1, limit: options.limit ?? 50 } : undefined,
  });

  const deletedQuery = useFetchData<DropdownOptionRow[]>({
    method: "GET",
    url: endpoints.DROPDOWN_OPTIONS_RECYCLE_BIN(listKey),
    queryKey: ["dropdown-options", listKey, "recycle-bin"],
    enabled: !!options.recycleBinOpen,
    forceRefresh: true,
  });

  const invalidateList = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dropdown-options", listKey] });
  };

  const createOption = useMutation({
    mutationFn: async (payload: CreateOptionPayload) => {
      const response = await axiosInstance.post<ApiSuccess<DropdownOptionRow>>(
        endpoints.DROPDOWN_OPTIONS(listKey),
        payload,
      );
      return response.data.data;
    },
    onSuccess: invalidateList,
  });

  const updateOption = useMutation({
    mutationFn: async (payload: UpdateOptionPayload) => {
      const { id, ...data } = payload;
      const response = await axiosInstance.put<ApiSuccess<DropdownOptionRow>>(
        endpoints.DROPDOWN_OPTION(id),
        data,
      );
      return response.data.data;
    },
    onSuccess: invalidateList,
  });

  const deleteOption = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(endpoints.DROPDOWN_OPTION(id));
      return response.data;
    },
    onSuccess: invalidateList,
  });

  const restoreOption = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.post<ApiSuccess<DropdownOptionRow>>(
        endpoints.DROPDOWN_OPTION_RESTORE(id),
      );
      return response.data.data;
    },
    onSuccess: invalidateList,
  });

  const hardDeleteOption = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete<ApiSuccess<unknown>>(endpoints.DROPDOWN_OPTION_PERMANENT(id));
      return response.data;
    },
    onSuccess: invalidateList,
  });

  const reorderOptions = useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      const response = await axiosInstance.post<ApiSuccess<TreeListResponse>>(
        endpoints.DROPDOWN_OPTIONS_REORDER(listKey),
        { items },
      );
      return response.data.data;
    },
    onSuccess: invalidateList,
  });

  const listData = listQuery.data?.data;
  const items = listData?.items ?? [];

  return {
    listDomain: {
      items,
      total: isPaged ? (listData as PagedListResponse | undefined)?.total ?? 0 : items.length,
      isLoading: listQuery.isLoading,
      isSuccess: listQuery.isSuccess,
      isError: listQuery.isError,
      error: listQuery.error,
      refetch: listQuery.refetch,
    },
    deletedDomain: {
      data: deletedQuery.data?.data ?? [],
      isLoading: deletedQuery.isLoading,
      refetch: deletedQuery.refetch,
    },
    actions: {
      createOption: createOption.mutateAsync,
      updateOption: updateOption.mutateAsync,
      deleteOption: deleteOption.mutateAsync,
      restoreOption: restoreOption.mutateAsync,
      hardDeleteOption: hardDeleteOption.mutateAsync,
      reorderOptions: reorderOptions.mutateAsync,
      isMutating: createOption.isPending || updateOption.isPending || reorderOptions.isPending,
      isRestoring: restoreOption.isPending,
      isHardDeleting: hardDeleteOption.isPending,
    },
  };
}
