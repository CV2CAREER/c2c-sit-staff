import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import { useQueryClient } from "@tanstack/react-query";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { PricingLocation, PricingPlan, UpdateMultiplierPayload, UpdatePlanPayload } from "@/types/pricing.types";
import toast from "react-hot-toast";

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
    url: endpoints.ADMIN_PRICING_PLANS,
    params: { locationId },
    queryKey: ["admin-pricing-plans", locationId],
    enabled: fetchPricingPlans,
  });

  return useMemo(() => ({
    adminLocationsDomain: {
      data: adminLocations.data?.data,
      isLoading: adminLocations.isLoading,
      isSuccess: adminLocations.isSuccess,
      isError: adminLocations.isError,
      error: adminLocations.error,
    },
    pricingPlansDomain: {
      data: pricingPlans.data?.data,
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
    updateMultiplierMutation: useMutateData<any, UpdateMultiplierPayload>({
      method: "PATCH",
      url: endpoints.ADMIN_LOCATIONS,
      mutationKey: ["admin-update-multiplier"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
        toast.success("Multiplier updated successfully");
      },
      onError: () => {},
    }),
    updatePricingPlanMutation: useMutateData<any, UpdatePlanPayload>({
      method: "PATCH",
      url: endpoints.ADMIN_PRICING_PLANS,
      mutationKey: ["admin-update-pricing-plan"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
        toast.success("Pricing plan updated successfully");
      },
      onError: () => {},
    }),
  };
};
