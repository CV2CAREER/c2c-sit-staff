import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import axios from "axios";

const TOAST_ID = "cec-tracker-action";

const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiError;
  }
  return {
    success: false,
    message: error instanceof Error ? error.message : "Unexpected error",
    data: null,
    statusCode: 500,
  };
};

export function useCecMutations(apiBase: string, queryKey: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [queryKey] });
  };

  const createRow = useMutation<ApiSuccess<any>, ApiError, Record<string, any>>({
    mutationKey: [`${queryKey}-create`],
    mutationFn: async (body) => {
      try {
        const res = await axiosInstance.post<ApiSuccess<any>>(apiBase, body);
        return res.data;
      } catch (err) {
        throw toApiError(err);
      }
    },
    onMutate: () => {
      toast.loading("Saving...", { id: TOAST_ID });
    },
    onSuccess: () => {
      toast.success("Saved", { id: TOAST_ID });
      invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save", { id: TOAST_ID });
    },
  });

  const updateRow = useMutation<ApiSuccess<any>, ApiError, { id: string; field: string; value: any }>({
    mutationKey: [`${queryKey}-update`],
    mutationFn: async ({ id, field, value }) => {
      try {
        const res = await axiosInstance.put<ApiSuccess<any>>(`${apiBase}/${id}`, { [field]: value });
        return res.data;
      } catch (err) {
        throw toApiError(err);
      }
    },
    onMutate: () => {
      toast.loading("Saving...", { id: TOAST_ID });
    },
    onSuccess: () => {
      toast.success("Saved", { id: TOAST_ID });
      invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save", { id: TOAST_ID });
    },
  });

  const deleteRow = useMutation<ApiSuccess<any>, ApiError, { id: string }>({
    mutationKey: [`${queryKey}-delete`],
    mutationFn: async ({ id }) => {
      try {
        const res = await axiosInstance.delete<ApiSuccess<any>>(`${apiBase}/${id}`);
        return res.data;
      } catch (err) {
        throw toApiError(err);
      }
    },
    onMutate: () => {
      toast.loading("Deleting...", { id: TOAST_ID });
    },
    onSuccess: () => {
      toast.success("Deleted", { id: TOAST_ID });
      invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete", { id: TOAST_ID });
    },
  });

  return { createRow, updateRow, deleteRow };
}
