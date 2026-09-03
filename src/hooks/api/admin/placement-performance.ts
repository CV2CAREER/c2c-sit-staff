import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { PerformanceRange, PlacementPerformance } from "./types";

// Range-driven, page-local state — not routed through the big options-bag
// aggregator since the caller toggles it interactively (Last 1 day / Last 5 days).
export const usePlacementPerformanceQuery = (range: PerformanceRange) => {
  const query = useFetchData<PlacementPerformance>({
    method: "GET",
    url: endpoints.ADMIN_PLACEMENT_PERFORMANCE,
    queryKey: ["admin-placement-performance", range],
    enabled: true,
    params: { range },
    forceRefresh: true,
  });

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
