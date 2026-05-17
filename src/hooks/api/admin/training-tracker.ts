import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const normalizeTrainingRow = (row: any) => ({
  ...row,
  _id: row?._id || row?.id,
  traineeId: row?.traineeId || row?.userId,
  coachId: row?.coachId || row?.pcId,
});

export const useTrainingTrackerQueries = (options: AdminQueriesOptions) => {
  const {
    fetchTrainingSessions = false,
    fetchTrainingTracker = false,
    trainingSessionNumber = null,
    trainingIsDeleted = false,
    fetchUsersFullName = false,
  } = options;

  const sessions = useFetchData<any[]>({
    method: "GET",
    url: endpoints.ADMIN_TRAINING_TRACKER_SESSION,
    queryKey: ["admin-training-sessions"],
    enabled: fetchTrainingSessions,
  });

  const coaches = useFetchData<any[]>({
    method: "GET",
    url: `${endpoints.ADMIN_COACHES_VARIANT}?variance=coaches`,
    queryKey: ["admin-coaches"],
    enabled: fetchTrainingTracker,
  });

  const usersFullName = useFetchData<any[]>({
    method: "GET",
    url: endpoints.ADMIN_USERS_FULL_NAME,
    queryKey: ["admin-users-full-name-training"],
    enabled: fetchUsersFullName,
  });

  const trainingDataUrl = trainingSessionNumber != null
    ? `${endpoints.ADMIN_TRAINING_TRACKER}?sessionNumber=${trainingSessionNumber}&isDeleted=${trainingIsDeleted}`
    : `${endpoints.ADMIN_TRAINING_TRACKER}?isDeleted=${trainingIsDeleted}`;

  const trainingData = useFetchData<any[]>({
    method: "GET",
    url: trainingDataUrl,
    queryKey: ["admin-training-tracker", trainingSessionNumber, trainingIsDeleted],
    enabled: fetchTrainingTracker,
  });

  return useMemo(() => ({
    sessionsDomain: {
      data: (sessions.data?.data || []).map(normalizeTrainingRow),
      isLoading: sessions.isLoading,
      isSuccess: sessions.isSuccess,
    },
    coachesDomain: {
      data: coaches.data?.data || [],
      isLoading: coaches.isLoading,
      isSuccess: coaches.isSuccess,
    },
    usersFullNameDomain: {
      data: usersFullName.data?.data || [],
      isLoading: usersFullName.isLoading,
      isSuccess: usersFullName.isSuccess,
    },
    trainingDataDomain: {
      data: (trainingData.data?.data || []).map(normalizeTrainingRow),
      isLoading: trainingData.isLoading,
      isSuccess: trainingData.isSuccess,
      refetch: trainingData.refetch,
    },
  }), [sessions, coaches, usersFullName, trainingData]);
};

export const useTrainingTrackerMutations = () => {
  const queryClient = useQueryClient();

  const invalidateTracker = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-training-tracker"] });
  };

  const createMutation = useMutateData<any, any>({
    method: "POST",
    url: endpoints.ADMIN_TRAINING_TRACKER,
    mutationKey: ["admin-create-training-tracker"],
    onMutate: () => { toast.loading("Adding record...", { id: "tt-create" }); },
    onSuccess: (res) => {
      toast.success(res.message || "Record added successfully.", { id: "tt-create" });
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add new record.", { id: "tt-create" });
    },
  });

  const updateMutation = useMutateData<any, { newRow: any; trackerId: string }>({
    method: "PATCH",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}?id=${data.trackerId}`,
    mutationKey: ["admin-update-training-tracker"],
    onMutate: () => { toast.loading("Updating record...", { id: "tt-update" }); },
    onSuccess: (res) => {
      toast.success(res.message || "Record updated successfully.", { id: "tt-update" });
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update record.", { id: "tt-update" });
    },
  });

  const softDeleteMutation = useMutateData<any, { trackerId: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}/soft?id=${data.trackerId}`,
    mutationKey: ["admin-soft-delete-training-tracker"],
    onMutate: () => { toast.loading("Moving to recycle bin...", { id: "tt-soft-delete" }); },
    onSuccess: (res) => {
      toast.success(res.message || "Successfully moved to recycle bin.", { id: "tt-soft-delete" });
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to soft-delete tracker.", { id: "tt-soft-delete" });
    },
  });

  const permanentDeleteMutation = useMutateData<any, { trackerId: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}?id=${data.trackerId}`,
    mutationKey: ["admin-permanent-delete-training-tracker"],
    onMutate: () => { toast.loading("Permanently deleting record...", { id: "tt-perm-delete" }); },
    onSuccess: (res) => {
      toast.success(res.message || "Record permanently deleted.", { id: "tt-perm-delete" });
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to permanently delete record.", { id: "tt-perm-delete" });
    },
  });

  const restoreMutation = useMutateData<any, { trackerId: string; userId: string }>({
    method: "PATCH",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}/restore?id=${data.trackerId}`,
    mutationKey: ["admin-restore-training-tracker"],
    onMutate: () => { toast.loading("Restoring record...", { id: "tt-restore" }); },
    onSuccess: (res) => {
      toast.success(res.message || "Record restored successfully.", { id: "tt-restore" });
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to restore tracker.", { id: "tt-restore" });
    },
  });

  return {
    createMutation,
    updateMutation,
    softDeleteMutation,
    permanentDeleteMutation,
    restoreMutation,
  };
};
