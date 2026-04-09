// Re-export domain hooks for use in components
export {
  useCRTrackingQueries,
  useCRTrackingMutations,
  CR_QUERY_KEYS,
} from "@/hooks/api/admin/cr-tracking";

// ────────────────────────────────────────────────────
// Per-row mutation wrappers
// These are used inside renderCell (violating hooks rules
// intentionally for per-row state, matching v2 behaviour)
// ────────────────────────────────────────────────────
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import toast from "react-hot-toast";

/**
 * Restore a soft-deleted CR.
 * Used inside renderCell for per-row pending state.
 */
export const useRestoreCR = (
  id: string,
  setDataState: (state: "active" | "recycle") => void
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin-restore-cr", id],
    mutationFn: async () => {
      await axiosInstance.post(
        `${endpoints.ADMIN_CR_TRACKING_RESTORE}/?id=${id}`
      );
    },
    onSuccess: () => {
      toast.success("CR restored successfully.");
      setDataState("active");
      queryClient.invalidateQueries({ queryKey: ["admin-cr-tracking-data"] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Failed to restore CR.");
    },
  });
};

/**
 * Downgrade a CR type.
 * Used inside renderCell for per-row pending state.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useDowngradeCR = (id: string, refetch: any) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin-downgrade-cr", id],
    mutationFn: async () => {
      await axiosInstance.put(
        `${endpoints.ADMIN_CR_TRACKING_MODIFY}?id=${id}&downgradeOrUpgrade=downgrade`
      );
    },
    onSuccess: () => {
      toast.success("CR downgraded successfully.");
      refetch?.();
      queryClient.invalidateQueries({ queryKey: ["admin-cr-tracking-data"] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Failed to downgrade CR.");
    },
  });
};

/**
 * Upgrade a CR type.
 * Used inside renderCell for per-row pending state.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useUpgradeCR = (id: string, refetch: any) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["admin-upgrade-cr", id],
    mutationFn: async () => {
      await axiosInstance.put(
        `${endpoints.ADMIN_CR_TRACKING_MODIFY}?id=${id}&downgradeOrUpgrade=upgrade`
      );
    },
    onSuccess: () => {
      toast.success("CR upgraded successfully.");
      refetch?.();
      queryClient.invalidateQueries({ queryKey: ["admin-cr-tracking-data"] });
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Failed to upgrade CR.");
    },
  });
};
