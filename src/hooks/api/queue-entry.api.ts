import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/queue-entry.endpoint";
import { ApiSuccess } from "@/types/apiResponse.types";

export type QueueEntry = {
  id: string;
  queue: "staff" | "system";
  title: string;
  raisedById: string;
  raisedByName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  status: "open" | "resolved";
  resolvedById: string | null;
  resolvedByName: string | null;
  resolutionNote: string | null;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  triggerKey: string | null;
  routedStaff: Record<string, unknown> | null;
  escalationLevel: number;
  nextEscalationAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivePC = {
  name: string;
  email: string;
  role: string;
  id: string;
};

/**
 * Unified Outstanding-Requests queue (Staff + System tabs).
 * SPR-21-51-002 (staff) / SPR-21-51-003 (system).
 */
export function useQueueEntries(queue: "staff" | "system", status?: "open" | "resolved") {
  const query = useFetchData<{ entries: QueueEntry[]; total: number }>({
    method: "GET",
    url: endpoints.QUEUE_ENTRIES,
    queryKey: ["queue-entries", queue, status ?? "all"],
    enabled: true,
    params: {
      queue,
      ...(status && { status }),
    },
  });

  return {
    entries: query.data?.data?.entries ?? [],
    total: query.data?.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useQueueEntryActions() {
  const queryClient = useQueryClient();

  const invalidateQueue = async () => {
    await queryClient.invalidateQueries({ queryKey: ["queue-entries"] });
  };

  const raiseTask = useMutation({
    mutationFn: async (payload: { templateId: string; ownerId?: string; ownerName?: string }) => {
      const response = await axiosInstance.post<ApiSuccess<{ entry: QueueEntry }>>(
        endpoints.QUEUE_ENTRY_STAFF_TASKS,
        payload,
      );
      return response.data.data.entry;
    },
    onSuccess: invalidateQueue,
  });

  const assign = useMutation({
    mutationFn: async (payload: { id: string; ownerId: string; ownerName: string }) => {
      const { id, ...data } = payload;
      const response = await axiosInstance.patch<ApiSuccess<{ entry: QueueEntry }>>(
        endpoints.QUEUE_ENTRY_ASSIGN(id),
        data,
      );
      return response.data.data.entry;
    },
    onSuccess: invalidateQueue,
  });

  const resolve = useMutation({
    mutationFn: async (payload: { id: string; note?: string }) => {
      const { id, ...data } = payload;
      const response = await axiosInstance.post<ApiSuccess<{ entry: QueueEntry }>>(
        endpoints.QUEUE_ENTRY_RESOLVE(id),
        data,
      );
      return response.data.data.entry;
    },
    onSuccess: invalidateQueue,
  });

  return {
    raiseTask: raiseTask.mutateAsync,
    assign: assign.mutateAsync,
    resolve: resolve.mutateAsync,
    isRaising: raiseTask.isPending,
    isAssigning: assign.isPending,
    isResolving: resolve.isPending,
  };
}

/** Active Placement Controller roster — Staff-queue owner dropdown + routing. */
export function useActivePCs() {
  const query = useFetchData<{ pcs: ActivePC[]; total: number }>({
    method: "GET",
    url: endpoints.ADMIN_ACTIVE_PCS,
    queryKey: ["active-pcs"],
    enabled: true,
  });

  return {
    pcs: query.data?.data?.pcs ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
