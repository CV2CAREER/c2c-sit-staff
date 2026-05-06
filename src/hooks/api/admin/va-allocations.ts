import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface VaAllocationItem {
  name: string;
  clients: string[];
  stats: {
    yearly: number;
    quarterly: number;
    monthly: number;
    weekly: number;
    daily: number;
  };
}

export const useVaAllocationsQueries = (options: any) => {
  const vaAllocationsDomain = useQuery({
    queryKey: ["va-allocations-client-allocation"],
    queryFn: async () => {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:51001";
      const url = `${baseURL}/api/v1/admin/client-allocation`;
      console.log("📡 Fetching VA allocations from:", url);
      
      const response = await axios.get(url);
      console.log("✅ VA allocations response:", response.data);
      
      return response.data;
    },
    enabled: true, // Always fetch regardless of options
  });

  return {
    vaAllocationsDomain,
  };
};
