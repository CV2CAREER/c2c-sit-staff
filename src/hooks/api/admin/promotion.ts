import { useFetchData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { IPromotions, IPromotionLength } from "@/types/promotion.types";
import { useMemo } from "react";

export const usePromotionQueries = () => {
  const promotionsList = useFetchData<IPromotions[]>({
    method: "GET",
    url: endpoints.ADMIN_PROMOTION,
    queryKey: ["admin-promotions"],
    enabled: true,
  });

  const promotionLength = useFetchData<IPromotionLength[]>({
    method: "GET",
    url: endpoints.ADMIN_PROMOTION,
    params: { variant: "length" },
    queryKey: ["admin-promotion-length"],
    enabled: true,
  });

  return useMemo(() => ({
    promotionsListDomain: {
      data: promotionsList.data?.data || (promotionsList.data as any)?.model, // fallback for legacy response shape
      isLoading: promotionsList.isLoading,
      isSuccess: promotionsList.isSuccess,
      isError: promotionsList.isError,
      isFetching: promotionsList.isFetching,
      error: promotionsList.error,
      refetch: promotionsList.refetch,
    },
    promotionLengthDomain: {
      data: promotionLength.data?.data || (promotionLength.data as any)?.model, // fallback for legacy response shape
      isLoading: promotionLength.isLoading,
      isSuccess: promotionLength.isSuccess,
      isError: promotionLength.isError,
      isFetching: promotionLength.isFetching,
      error: promotionLength.error,
      refetch: promotionLength.refetch,
    },
  }), [promotionsList, promotionLength]);
};

export const usePromotionMutations = () => {
  const queryClient = useQueryClient();

  const createPromotion = useMutation({
    mutationKey: ["admin-create-promotion"],
    mutationFn: async (values: any) => {
      const response = await axiosInstance.post(endpoints.ADMIN_PROMOTION, values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    }
  });

  const deletePromotion = useMutation({
    mutationKey: ["admin-delete-promotion"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(endpoints.ADMIN_PROMOTION_WITH_ID(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    }
  });

  const createPromotionLength = useMutation({
    mutationKey: ["admin-create-promotion-length"],
    mutationFn: async (values: any) => {
      const response = await axiosInstance.post(`${endpoints.ADMIN_PROMOTION}?variant=length`, values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-length"] });
    }
  });

  const updatePromotionLength = useMutation({
    mutationKey: ["admin-update-promotion-length"],
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const response = await axiosInstance.patch(`${endpoints.ADMIN_PROMOTION}?variant=length&id=${id}`, values);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-length"] });
    }
  });

  return {
    createPromotion,
    deletePromotion,
    createPromotionLength,
    updatePromotionLength,
  };
};
