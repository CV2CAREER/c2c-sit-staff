import { useMemo } from "react";
import { useFetchData } from "../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

interface CoachQueriesOptions {
  fetchSessions?: boolean;
  fetchProfile?: boolean;
  fetchSchedules?: boolean;
  sessionId?: string;
  limit?: number;
}

export const useCoachQueries = (options: CoachQueriesOptions = {}) => {
  const {
    fetchSessions = false,
    fetchProfile = false,
    fetchSchedules = false,
    sessionId = "",
    limit = 10,
  } = options;

  const sessions = useFetchData<any>({
    method: "GET",
    url: endpoints.COACH_SESSIONS,
    params: { limit },
    queryKey: ["coach-sessions", limit],
    enabled: fetchSessions,
  });

  const sessionDetail = useFetchData<any>({
    method: "GET",
    url: sessionId ? endpoints.COACH_SESSION_DETAIL(sessionId) : "",
    queryKey: ["coach-session-detail", sessionId],
    enabled: !!sessionId,
  });

  const coachProfile = useFetchData<any>({
    method: "GET",
    url: endpoints.COACH_ME,
    queryKey: ["coach-profile"],
    enabled: fetchProfile,
  });

  const schedules = useFetchData<any>({
    method: "GET",
    url: endpoints.COACH_SCHEDULES,
    queryKey: ["coach-schedules"],
    enabled: fetchSchedules,
  });

  return useMemo(() => ({
    sessionsDomain: {
      data: sessions.data?.data,
      isLoading: sessions.isLoading,
      isSuccess: sessions.isSuccess,
      isError: sessions.isError,
      isFetching: sessions.isFetching,
      refetch: sessions.refetch,
    },
    sessionDetailDomain: {
      data: sessionDetail.data?.data,
      isLoading: sessionDetail.isLoading,
      isSuccess: sessionDetail.isSuccess,
      isError: sessionDetail.isError,
      refetch: sessionDetail.refetch,
    },
    coachProfileDomain: {
      data: coachProfile.data?.data,
      isLoading: coachProfile.isLoading,
      isSuccess: coachProfile.isSuccess,
      isError: coachProfile.isError,
      refetch: coachProfile.refetch,
    },
    schedulesDomain: {
      data: schedules.data?.data,
      isLoading: schedules.isLoading,
      isSuccess: schedules.isSuccess,
      isError: schedules.isError,
      refetch: schedules.refetch,
    },
  }), [sessions, sessionDetail, coachProfile, schedules]);
};

export const useCoachMutations = () => {
  const queryClient = useQueryClient();

  const completeSession = useMutation({
    mutationKey: ["coach-complete-session"],
    mutationFn: async (sessionId: string) => {
      const response = await axiosInstance.patch(endpoints.COACH_SESSION_COMPLETE(sessionId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
  });

  const createSchedule = useMutation({
    mutationKey: ["coach-create-schedule"],
    mutationFn: async (payload: any) => {
      const response = await axiosInstance.post(endpoints.COACH_SCHEDULES, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-schedules"] });
    },
  });

  const deleteSchedule = useMutation({
    mutationKey: ["coach-delete-schedule"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`${endpoints.COACH_SCHEDULE_DETAIL(id)}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-schedules"] });
    },
  });

  const updateSession = useMutation({
    mutationKey: ["coach-update-session"],
    mutationFn: async (payload: { id: string; additionalInfo?: string; meetingLink?: string }) => {
      const response = await axiosInstance.patch(endpoints.COACH_SESSION_DETAIL(payload.id), {
        additionalInfo: payload.additionalInfo,
        meetingLink: payload.meetingLink,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
  });

  return {
    createSchedule,
    deleteSchedule,
    updateSession,
    completeSession,
  };
};
