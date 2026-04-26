import { useFetchData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { IPromotions, IPromotionLength } from "@/types/promotion.types";
import { useMemo } from "react";

const normalizePromotion = (promotion: any): IPromotions => ({
  _id: promotion?._id || promotion?.id || "",
  name: promotion?.name || "",
  country: promotion?.country || "",
  expiryDate: promotion?.expiryDate || "",
  countryCode: promotion?.countryCode || "",
  type: promotion?.type || "CODE",
  promotionCode: promotion?.promotionCode || "",
});

const normalizePromotionLength = (promotionLength: any): IPromotionLength => ({
  _id: promotionLength?._id || promotionLength?.id || "",
  numberOfReferralsBeforePromo:
    Number(promotionLength?.numberOfReferralsBeforePromo ?? promotionLength?.duration ?? 0) || 0,
  numberOfFreePromo:
    Number(promotionLength?.numberOfFreePromo ?? 0) || 0,
});

const normalizePromotionPayload = (values: Record<string, unknown>) => {
  const payload = { ...values } as Record<string, unknown>;
  const rawDate = payload.date;

  if (
    typeof payload.expiryDate !== "string" &&
    (typeof rawDate === "string" || rawDate instanceof Date)
  ) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      payload.expiryDate = parsed.toISOString();
    }
  }

  delete payload.date;
  return payload;
};

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
      data: ((promotionsList.data?.data || (promotionsList.data as any)?.model || []) as any[]).map(
        normalizePromotion,
      ),
      isLoading: promotionsList.isLoading,
      isSuccess: promotionsList.isSuccess,
      isError: promotionsList.isError,
      isFetching: promotionsList.isFetching,
      error: promotionsList.error,
      refetch: promotionsList.refetch,
    },
    promotionLengthDomain: {
      data: ((promotionLength.data?.data || (promotionLength.data as any)?.model || []) as any[]).map(
        normalizePromotionLength,
      ),
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
      const response = await axiosInstance.post(
        endpoints.ADMIN_PROMOTION,
        normalizePromotionPayload(values),
      );
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
      const response = await axiosInstance.post(`${endpoints.ADMIN_PROMOTION}?variant=length`, {
        numberOfReferralsBeforePromo: Number(values?.numberOfReferralsBeforePromo || 0),
        numberOfFreePromo: Number(values?.numberOfFreePromo || 0),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotion-length"] });
    }
  });

  const updatePromotionLength = useMutation({
    mutationKey: ["admin-update-promotion-length"],
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
      const response = await axiosInstance.patch(`${endpoints.ADMIN_PROMOTION}?variant=length&id=${id}`, {
        numberOfReferralsBeforePromo: Number(values?.numberOfReferralsBeforePromo || 0),
        numberOfFreePromo: Number(values?.numberOfFreePromo || 0),
      });
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
