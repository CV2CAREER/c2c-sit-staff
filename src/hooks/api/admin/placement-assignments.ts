import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions, AssignmentRoleKey, AssignmentRowDetail, ClientComment, PlacementAssignments } from "./types";

export const usePlacementAssignmentsQueries = (options: AdminQueriesOptions) => {
  const placementAssignments = useFetchData<PlacementAssignments>({
    method: "GET",
    url: endpoints.ADMIN_PLACEMENT_ASSIGNMENTS,
    queryKey: ["admin-placement-assignments"],
    enabled: !!options.fetchPlacementAssignments,
    forceRefresh: true,
  });

  return {
    placementAssignmentsDomain: {
      data: placementAssignments.data?.data,
      isLoading: placementAssignments.isLoading,
      isSuccess: placementAssignments.isSuccess,
      isError: placementAssignments.isError,
      error: placementAssignments.error,
    },
  };
};

export interface BulkAssignPayload {
  credIds: string[];
  role: AssignmentRoleKey;
  controllerName: string | null;
  controllerEmail: string | null;
}

export interface BulkAssignResult {
  success: true;
  updated: number;
  clientNames: string[];
}

export const usePlacementAssignmentsMutations = () => {
  const bulkAssignMutation = useMutateData<BulkAssignResult, BulkAssignPayload>({
    method: "POST",
    url: endpoints.ADMIN_PLACEMENT_ASSIGNMENTS_BULK,
    mutationKey: ["admin-placement-assignments-bulk"],
    onSuccess: () => {},
    onError: () => {},
  });

  return { bulkAssignMutation };
};

// Not part of the aggregator options bag — the Assignments drawer calls this
// directly with whichever client's credId is currently open.
export const useClientCommentsQuery = (credId: string | null) => {
  const query = useFetchData<ClientComment[]>({
    method: "GET",
    url: credId ? endpoints.ADMIN_PLACEMENT_CLIENT_COMMENTS(credId) : "",
    queryKey: ["admin-placement-client-comments", credId],
    enabled: !!credId,
    forceRefresh: true,
  });

  return {
    comments: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

export interface AddCommentPayload {
  credId: string;
  comment: string;
}

export const useAddClientCommentMutation = () =>
  useMutateData<ClientComment, AddCommentPayload>({
    method: "POST",
    url: (data) => endpoints.ADMIN_PLACEMENT_CLIENT_COMMENTS(data.credId),
    mutationKey: ["admin-add-client-comment"],
    onSuccess: () => {},
    onError: () => {},
  });

// Backs the shared assignment drawer — works for any client (in-flight or
// on-hold), independent of whichever list page opened it.
export const useAssignmentDetailQuery = (credId: string | null) => {
  const query = useFetchData<AssignmentRowDetail>({
    method: "GET",
    url: credId ? endpoints.ADMIN_PLACEMENT_ASSIGNMENT_DETAIL(credId) : "",
    queryKey: ["admin-placement-assignment-detail", credId],
    enabled: !!credId,
    forceRefresh: true,
  });

  return {
    detail: query.data?.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
