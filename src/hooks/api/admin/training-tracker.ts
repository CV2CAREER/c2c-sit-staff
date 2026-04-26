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
    trainingSessionNumber = 1,
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

  const trainingData = useFetchData<any[]>({
    method: "GET",
    url: `${endpoints.ADMIN_TRAINING_TRACKER}?sessionNumber=${trainingSessionNumber}&isDeleted=${trainingIsDeleted}`,
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
    onSuccess: (res) => {
      toast.success(res.message || "Record added successfully.");
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add new record.");
    },
  });

  const updateMutation = useMutateData<any, { newRow: any; trackerId: string }>({
    method: "PATCH",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}?id=${data.trackerId}`,
    mutationKey: ["admin-update-training-tracker"],
    onSuccess: (res) => {
      toast.success(res.message || "Record updated successfully.");
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update record.");
    },
  });

  const softDeleteMutation = useMutateData<any, { trackerId: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}/soft?id=${data.trackerId}`,
    mutationKey: ["admin-soft-delete-training-tracker"],
    onSuccess: (res) => {
      toast.success(res.message || "Successfully moved to recycle bin.");
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to soft-delete tracker.");
    },
  });

  const permanentDeleteMutation = useMutateData<any, { trackerId: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}?id=${data.trackerId}`,
    mutationKey: ["admin-permanent-delete-training-tracker"],
    onSuccess: (res) => {
      toast.success(res.message || "Successfully permanently deleted record.");
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to permanently delete record.");
    },
  });

  const restoreMutation = useMutateData<any, { trackerId: string; userId: string }>({
    method: "PATCH",
    url: (data) => `${endpoints.ADMIN_TRAINING_TRACKER}/restore?id=${data.trackerId}`,
    mutationKey: ["admin-restore-training-tracker"],
    onSuccess: (res) => {
      toast.success(res.message || "Successfully restored record.");
      invalidateTracker();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to restore tracker.");
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
