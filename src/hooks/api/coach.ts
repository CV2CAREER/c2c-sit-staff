import { useMemo } from "react";
import { useFetchData } from "../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as coachEndpoints from "@/constants/apiEndpoints/coach.endpoint";

interface CoachQueriesOptions {
  fetchSessions?: boolean;
  fetchProfile?: boolean;
  fetchSchedules?: boolean;
  fetchClientAvailabilities?: boolean;
  sessionId?: string;
  limit?: number;
}

export const useCoachQueries = (options: CoachQueriesOptions = {}) => {
  const {
    fetchSessions = false,
    fetchProfile = false,
    fetchSchedules = false,
    fetchClientAvailabilities = false,
    sessionId = "",
    limit = 10,
  } = options;

  const sessions = useFetchData<any>({
    method: "GET",
    url: coachEndpoints.COACH_SESSIONS,
    params: { limit },
    queryKey: ["coach-sessions", limit],
    enabled: fetchSessions,
  });

  const sessionDetail = useFetchData<any>({
    method: "GET",
    url: sessionId ? coachEndpoints.COACH_SESSION_DETAIL(sessionId) : "",
    queryKey: ["coach-session-detail", sessionId],
    enabled: !!sessionId,
  });

  const coachProfile = useFetchData<any>({
    method: "GET",
    url: coachEndpoints.COACH_ME,
    queryKey: ["coach-profile"],
    enabled: fetchProfile,
  });

  const schedules = useFetchData<any>({
    method: "GET",
    url: coachEndpoints.COACH_SCHEDULE,
    queryKey: ["coach-schedules"],
    enabled: fetchSchedules,
  });

  const clientAvailabilities = useFetchData<any>({
    method: "GET",
    url: coachEndpoints.CLIENT_AVAILABILITIES,
    queryKey: ["client-availabilities"],
    enabled: fetchClientAvailabilities,
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
    clientAvailabilitiesDomain: {
      data: clientAvailabilities.data?.data || [],
      isLoading: clientAvailabilities.isLoading,
      isSuccess: clientAvailabilities.isSuccess,
      isError: clientAvailabilities.isError,
      refetch: clientAvailabilities.refetch,
    },
  }), [sessions, sessionDetail, coachProfile, schedules, clientAvailabilities]);
};

export const useCoachMutations = () => {
  const queryClient = useQueryClient();

  const cancelSession = useMutation({
    mutationKey: ["coach-cancel-session"],
    mutationFn: async (sessionId: string) => {
      const response = await axiosInstance.patch(coachEndpoints.COACH_SESSION_CANCEL(sessionId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
  });

  const completeSession = useMutation({
    mutationKey: ["coach-complete-session"],
    mutationFn: async (sessionId: string) => {
      const response = await axiosInstance.patch(coachEndpoints.COACH_SESSION_COMPLETE(sessionId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
  });

  const createSchedule = useMutation({
    mutationKey: ["coach-create-schedule"],
    mutationFn: async (payload: any) => {
      const response = await axiosInstance.post(coachEndpoints.COACH_SCHEDULE, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-schedules"] });
    },
  });

  const deleteSchedule = useMutation({
    mutationKey: ["coach-delete-schedule"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(coachEndpoints.COACH_SCHEDULE_DETAIL(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-schedules"] });
    },
  });

  const updateSession = useMutation({
    mutationKey: ["coach-update-session"],
    mutationFn: async (payload: { id: string; additionalInfo?: string; meetingLink?: string }) => {
      const response = await axiosInstance.patch(coachEndpoints.COACH_SESSION_DETAIL(payload.id), {
        additionalInfo: payload.additionalInfo,
        meetingLink: payload.meetingLink,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
  });

  const gradeSession = useMutation({
    mutationKey: ["coach-grade-session"],
    mutationFn: async (payload: {
      sessionId: string;
      score?: number;
      maxScore?: number;
      feedback?: string;
      criteria?: Array<{
        name: string;
        score: number;
        maxScore: number;
        feedback?: string;
      }>;
    }) => {
      const { sessionId, ...grading } = payload;
      const response = await axiosInstance.post(coachEndpoints.COACH_GRADE_SESSION(sessionId), grading);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coach-sessions"] });
    },
  });

  const acceptClientAvailability = useMutation({
    mutationKey: ["coach-accept-client-availability"],
    mutationFn: async (payload: { id: string; meetingLink?: string }) => {
      const { id, ...body } = payload;
      const response = await axiosInstance.post(coachEndpoints.CLIENT_AVAILABILITY_ACCEPT(id), body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-availabilities"] });
    },
  });

  const declineClientAvailability = useMutation({
    mutationKey: ["coach-decline-client-availability"],
    mutationFn: async (payload: { id: string; reason: string }) => {
      const { id, ...body } = payload;
      const response = await axiosInstance.post(coachEndpoints.CLIENT_AVAILABILITY_DECLINE(id), body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-availabilities"] });
    },
  });

  const rescheduleSession = useMutation({
    mutationKey: ["coach-reschedule-session"],
    mutationFn: async (payload: {
      sessionId: string;
      startTime: string;
      endTime: string;
      date: string;
      timezone: string;
      meetingLink?: string;
    }) => {
      const { sessionId, ...body } = payload;
      const response = await axiosInstance.patch(coachEndpoints.COACH_SESSION_RESCHEDULE(sessionId), body);
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
    cancelSession,
    gradeSession,
    acceptClientAvailability,
    declineClientAvailability,
    rescheduleSession,
  };
};
