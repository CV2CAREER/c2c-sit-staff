import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

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
    url: endpoints.ASSISTANT_CLIENTS_ASSIGNED,
    queryKey: ["assistant-dashboard-data"],
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
