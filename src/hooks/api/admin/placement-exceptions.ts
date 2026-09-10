import { useFetchData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions, PlacementExceptions } from "./types";

export const usePlacementExceptionsQueries = (options: AdminQueriesOptions) => {
  const placementExceptions = useFetchData<PlacementExceptions>({
    method: "GET",
    url: endpoints.ADMIN_PLACEMENT_EXCEPTIONS,
    queryKey: ["admin-placement-exceptions"],
    enabled: !!options.fetchPlacementExceptions,
    forceRefresh: true,
  });

  return {
    placementExceptionsDomain: {
      data: placementExceptions.data?.data,
      isLoading: placementExceptions.isLoading,
      isSuccess: placementExceptions.isSuccess,
      isError: placementExceptions.isError,
      error: placementExceptions.error,
    },
  };
};
