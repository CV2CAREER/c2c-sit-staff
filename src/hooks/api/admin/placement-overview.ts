import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { PerformanceRange, PlacementOverview } from "./types";

// Range-driven, page-local state — same pattern as usePlacementPerformanceQuery.
export const usePlacementOverviewQuery = (range: PerformanceRange) => {
  const query = useFetchData<PlacementOverview>({
    method: "GET",
    url: endpoints.ADMIN_PLACEMENT_OVERVIEW,
    queryKey: ["admin-placement-overview", range],
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
