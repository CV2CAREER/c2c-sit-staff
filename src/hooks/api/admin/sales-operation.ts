import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface SalesOperationQueriesOptions {
  fetchActive?: boolean;
  fetchRecycle?: boolean;
}

const normalizeSalesRow = (row: any) => ({
  ...row,
  _id: row?._id ?? row?.id,
});

export const SALES_OP_QUERY_KEYS = {
  active: ["admin-sales-operation", "active"],
  recycle: ["admin-sales-operation", "recycle"],
};

export const useSalesOperationQueries = (
  options: SalesOperationQueriesOptions = {}
) => {
  const { fetchActive = false, fetchRecycle = false } = options;

  const activeData = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_SALES_OPERATION}?active=true`,
    queryKey: SALES_OP_QUERY_KEYS.active,
    enabled: fetchActive,
  });

  const recycleData = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_SALES_OPERATION}?recycle=true`,
    queryKey: SALES_OP_QUERY_KEYS.recycle,
    enabled: fetchRecycle,
  });

  return useMemo(
    () => ({
      activeDataDomain: {
        data: (activeData.data?.data || []).map(normalizeSalesRow),
        isLoading: activeData.isLoading || activeData.isFetching,
        isSuccess: activeData.isSuccess,
        refetch: activeData.refetch,
      },
      recycleDataDomain: {
        data: (recycleData.data?.data || []).map(normalizeSalesRow),
        isLoading: recycleData.isLoading || recycleData.isFetching,
        isSuccess: recycleData.isSuccess,
        refetch: recycleData.refetch,
      },
    }),
    [activeData, recycleData]
  );
};

export const useSalesOperationMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-sales-operation"] });
  };

  const createMutation = useMutateData<any, any>({
    method: "POST",
    url: endpoints.ADMIN_SALES_OPERATION,
    mutationKey: ["admin-create-sales-operation"],
    onSuccess: (res) => {
      toast.success(res?.message || "Entry created successfully!");
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to create entry.");
    },
  });

  const updateMutation = useMutateData<any, any>({
    method: "PUT",
    url: (data) => `${endpoints.ADMIN_SALES_OPERATION}?id=${data._id}`,
    mutationKey: ["admin-update-sales-operation"],
    onSuccess: (res) => {
      toast.success(res?.message || "Entry updated successfully!");
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to update entry.");
    },
  });

  const softDeleteMutation = useMutateData<any, { id: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_SALES_OPERATION}?id=${data.id}`,
    mutationKey: ["admin-soft-delete-sales-operation"],
    onSuccess: (res) => {
      toast.success(res?.message || "Moved to recycle bin.");
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to delete entry.");
    },
  });

  const hardDeleteMutation = useMutateData<any, { id: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_SALES_OPERATION_HARD_DELETE}?id=${data.id}`,
    mutationKey: ["admin-hard-delete-sales-operation"],
    onSuccess: (res) => {
      toast.success(res?.message || "Deleted permanently.");
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to permanently delete.");
    },
  });

  const restoreMutation = useMutateData<any, { id: string }>({
    method: "POST",
    url: (data) => `${endpoints.ADMIN_SALES_OPERATION_RESTORE}?id=${data.id}`,
    mutationKey: ["admin-restore-sales-operation"],
    onSuccess: (res) => {
      toast.success(res?.message || "Entry restored successfully.");
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to restore entry.");
    },
  });

  return {
    createMutation,
    updateMutation,
    softDeleteMutation,
    hardDeleteMutation,
    restoreMutation,
  };
};
