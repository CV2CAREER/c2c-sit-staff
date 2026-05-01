import { useFetchData } from "@/hooks/useApi";
import * as placementEndpoints from "@/constants/apiEndpoints/placement.endpoint";

export interface PlacementApplication {
  id: string;
  client_id?: string;
  Status?: string;
  createdAt?: string;
  Application_Mode?: string;
}

export interface PlacementDashboardData {
  clients: string[];
  clientsApplication: PlacementApplication[];
  totalApplications: number;
  totalUnattended: number;
}

export function usePlacementDashboard(fetchDashboard = true) {
  const dashboard = useFetchData<PlacementDashboardData>({
    method: "GET",
    url: placementEndpoints.PLACEMENT_SUMMARY,
    queryKey: ["placement-dashboard-summary"],
    enabled: fetchDashboard,
  });

  return {
    placementDashboardDomain: {
      data: dashboard.data?.data,
      isLoading: dashboard.isLoading,
      isSuccess: dashboard.isSuccess,
      isError: dashboard.isError,
      error: dashboard.error,
      refetch: dashboard.refetch,
    },
  };
}
