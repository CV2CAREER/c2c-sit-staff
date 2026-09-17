import { useMemo } from "react";
import { useFetchData, useMutateData } from "@/hooks/useApi";
import { ADMIN_USER_SEGMENTS, ADMIN_USER_SEGMENT_DETAIL } from "@/constants/apiEndpoints/admin.endpoint";
import { UserFilterState, normalizeFilterState } from "./user-filters";

export interface SavedSegmentDTO {
  id: string;
  name: string;
  filters: UserFilterState;
  createdAt: string;
}

interface SegmentsResponse {
  data: SavedSegmentDTO[];
}

// The Users page sidebar's DB-backed "Saved segments" — shared between
// admin and assistant (same convention as useGetAllUsers living here and
// both pages importing it).
export const useUserSegments = () => {
  const query = useFetchData<SegmentsResponse["data"]>({
    method: "GET",
    url: ADMIN_USER_SEGMENTS,
    queryKey: ["user-segments"],
    enabled: true,
  });

  return useMemo(
    () => ({
      segments: ((query.data as any)?.data ?? []).map((seg: SavedSegmentDTO) => ({
        ...seg,
        filters: normalizeFilterState(seg.filters),
      })),
      isLoading: query.isLoading,
      refetch: query.refetch,
    }),
    [query.data, query.isLoading, query.refetch],
  );
};

export const useCreateUserSegment = () =>
  useMutateData<SavedSegmentDTO, { name: string; filters: UserFilterState }>({
    method: "POST",
    url: ADMIN_USER_SEGMENTS,
    mutationKey: ["create-user-segment"],
    onSuccess: () => {},
    onError: () => {},
  });

export const useDeleteUserSegment = () =>
  useMutateData<null, { id: string }>({
    method: "DELETE",
    url: (data) => ADMIN_USER_SEGMENT_DETAIL(data.id),
    mutationKey: ["delete-user-segment"],
    onSuccess: () => {},
    onError: () => {},
  });
