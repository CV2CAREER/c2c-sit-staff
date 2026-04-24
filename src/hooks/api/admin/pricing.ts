import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import { useQueryClient } from "@tanstack/react-query";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { PricingLocation, PricingPlan, UpdateMultiplierPayload, UpdatePlanPayload } from "@/types/pricing.types";
import toast from "react-hot-toast";

const SUPPORTED_PRICING_CURRENCIES = ["AUD", "GBP", "EUR", "NGN", "CAD", "USD"] as const;
type SupportedPricingCurrency = (typeof SUPPORTED_PRICING_CURRENCIES)[number];
const PRICING_PLAN_ORDER = ["Emerald", "Bronze", "Silver", "Gold", "Platinum", "Coral"] as const;
const EXCLUDED_PLAN_TITLES = new Set(["copper"]);

const isSupportedPricingCurrency = (code: string): code is SupportedPricingCurrency =>
  SUPPORTED_PRICING_CURRENCIES.includes(code as SupportedPricingCurrency);

const sortLocations = (locations: PricingLocation[]) => {
  const supportedOrder = new Map<SupportedPricingCurrency, number>(
    SUPPORTED_PRICING_CURRENCIES.map((code, index) => [code, index]),
  );
  const dedupedByCurrency = new Map<SupportedPricingCurrency, PricingLocation>();

  for (const location of locations) {
    const normalizedCode = String(location.currencyCode || "").trim().toUpperCase();

    if (!isSupportedPricingCurrency(normalizedCode)) {
      continue;
    }

    const existing = dedupedByCurrency.get(normalizedCode);
    if (!existing) {
      dedupedByCurrency.set(normalizedCode, { ...location, currencyCode: normalizedCode });
      continue;
    }

    const existingStamp = Date.parse(existing.updatedAt ?? existing.createdAt ?? "");
    const nextStamp = Date.parse(location.updatedAt ?? location.createdAt ?? "");
    const shouldReplace =
      Number.isFinite(nextStamp) &&
      (!Number.isFinite(existingStamp) || nextStamp > existingStamp);

    if (shouldReplace) {
      dedupedByCurrency.set(normalizedCode, { ...location, currencyCode: normalizedCode });
    }
  }

  return [...dedupedByCurrency.values()]
    .sort((left, right) => {
      const leftRank = isSupportedPricingCurrency(left.currencyCode)
        ? (supportedOrder.get(left.currencyCode) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;
      const rightRank = isSupportedPricingCurrency(right.currencyCode)
        ? (supportedOrder.get(right.currencyCode) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.currencyCode.localeCompare(right.currencyCode);
    });
};

const normalizePricingPlans = (plans: PricingPlan[]) => {
  const byTitle = new Map<string, PricingPlan>();

  for (const plan of plans) {
    const normalizedTitle = String(plan.title || "").trim();
    if (!normalizedTitle) {
      continue;
    }

    if (EXCLUDED_PLAN_TITLES.has(normalizedTitle.toLowerCase())) {
      continue;
    }

    const existing = byTitle.get(normalizedTitle);
    if (!existing) {
      byTitle.set(normalizedTitle, plan);
      continue;
    }

    const existingStamp = Date.parse(existing.updatedAt ?? existing.createdAt ?? "");
    const nextStamp = Date.parse(plan.updatedAt ?? plan.createdAt ?? "");
    if (Number.isFinite(nextStamp) && (!Number.isFinite(existingStamp) || nextStamp > existingStamp)) {
      byTitle.set(normalizedTitle, plan);
    }
  }

  const orderedPlans: PricingPlan[] = [];
  for (const title of PRICING_PLAN_ORDER) {
    const matching = byTitle.get(title);
    if (matching) {
      orderedPlans.push(matching);
      byTitle.delete(title);
    }
  }

  const remainingPlans = [...byTitle.values()].sort((left, right) => {
    const leftPrice = Number(left.price);
    const rightPrice = Number(right.price);
    const normalizedLeftPrice = Number.isFinite(leftPrice) ? leftPrice : Number.MAX_SAFE_INTEGER;
    const normalizedRightPrice = Number.isFinite(rightPrice) ? rightPrice : Number.MAX_SAFE_INTEGER;
    if (normalizedLeftPrice !== normalizedRightPrice) {
      return normalizedLeftPrice - normalizedRightPrice;
    }
    return left.title.localeCompare(right.title);
  });

  return [...orderedPlans, ...remainingPlans];
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
      data: pricingPlans.data?.data ? normalizePricingPlans(pricingPlans.data.data) : [],
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
