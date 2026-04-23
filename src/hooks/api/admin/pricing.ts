import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import { useQueryClient } from "@tanstack/react-query";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { PricingLocation, PricingPlan, UpdateMultiplierPayload, UpdatePlanPayload } from "@/types/pricing.types";
import toast from "react-hot-toast";
import { PLAN_ORDER } from "@/utils/constants";

const SUPPORTED_PRICING_CURRENCIES = ["AUD", "GBP", "EUR", "NGN", "CAD", "USD"] as const;

const sortLocations = (locations: PricingLocation[]) => {
  const supportedOrder = new Map(
    SUPPORTED_PRICING_CURRENCIES.map((code, index) => [code, index]),
  );

  return [...locations]
    .filter((location) => Boolean(location.currencyCode))
    .sort((left, right) => {
      const leftRank = supportedOrder.get(left.currencyCode) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = supportedOrder.get(right.currencyCode) ?? Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.currencyCode.localeCompare(right.currencyCode);
    });
};

const sortPricingPlans = (plans: PricingPlan[]) => {
  const order = new Map(PLAN_ORDER.map((title, index) => [title.toLowerCase(), index]));

  return [...plans].sort((left, right) => {
    const leftRank = order.get(left.title.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = order.get(right.title.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.title.localeCompare(right.title);
  });
};

export const usePricingQueries = (options: AdminQueriesOptions) => {
  const {
    fetchAdminLocations = false,
    fetchPricingPlans = false,
    locationId = "",
  } = options;

  const adminLocations = useFetchData<PricingLocation[]>({
    method: "GET",
    url: endpoints.ADMIN_LOCATIONS,
    queryKey: ["admin-locations"],
    enabled: fetchAdminLocations,
  });

  const pricingPlans = useFetchData<PricingPlan[]>({
    method: "GET",
    url: endpoints.ADMIN_PRICING,
    params: { locationId },
    queryKey: ["admin-pricing-plans", locationId],
    enabled: fetchPricingPlans,
  });

  return useMemo(() => ({
    adminLocationsDomain: {
      data: adminLocations.data?.data ? sortLocations(adminLocations.data.data) : [],
      isLoading: adminLocations.isLoading,
      isSuccess: adminLocations.isSuccess,
      isError: adminLocations.isError,
      error: adminLocations.error,
    },
    pricingPlansDomain: {
      data: pricingPlans.data?.data ? sortPricingPlans(pricingPlans.data.data) : [],
      isLoading: pricingPlans.isLoading,
      isSuccess: pricingPlans.isSuccess,
      isError: pricingPlans.isError,
      error: pricingPlans.error,
    },
  }), [
    adminLocations, pricingPlans
  ]);
};

export const usePricingMutations = () => {
  const queryClient = useQueryClient();

  return {
    updateMultiplierMutation: useMutateData<unknown, UpdateMultiplierPayload>({
      method: "PATCH",
      url: endpoints.ADMIN_LOCATIONS,
      mutationKey: ["admin-update-multiplier"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
        toast.success("Multiplier updated successfully");
      },
      onError: () => {},
    }),
    updatePricingPlanMutation: useMutateData<unknown, UpdatePlanPayload>({
      method: "PATCH",
      url: endpoints.ADMIN_PRICING,
      mutationKey: ["admin-update-pricing-plan"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
        toast.success("Pricing plan updated successfully");
      },
      onError: () => {},
    }),
  };
};
