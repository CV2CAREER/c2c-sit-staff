"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/services/api-client";
import { ApiError, ApiSuccess } from "@/types/apiResponse.types";
import { ADMIN_ACCESS_LEVELS } from "@/constants/apiEndpoints/admin.endpoint";

export type AccessRule = {
  _id: string;
  description: string;
  path: string;
  access: string[];
};

export type AccessLevel = {
  _id: string;
  name: string;
  description: string;
  personas: string[];
  rules?: AccessRule[];
};

export type AccessUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type MasterPasswordInfo = {
  updated: string;
  updatedBy: string;
};

const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error) && error.response?.data) {
    return error.response.data as ApiError;
  }

  return {
    success: false,
    message: error instanceof Error ? error.message : "Unexpected error",
    data: null,
    statusCode: 500,
  };
};

const unwrap = <T,>(response: ApiSuccess<T>) => response.data;

export const useAccessControl = ({
  selectedAccessLevelId,
  selectedUserId,
}: {
  selectedAccessLevelId?: string | null;
  selectedUserId?: string | null;
} = {}) => {
  const queryClient = useQueryClient();

  const accessLevelsQuery = useQuery<AccessLevel[], ApiError>({
    queryKey: ["access-levels"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<AccessLevel[]>>(ADMIN_ACCESS_LEVELS);
        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const allUsersQuery = useQuery<AccessUser[], ApiError>({
    queryKey: ["access-levels-users", "all"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<AccessUser[]>>(`${ADMIN_ACCESS_LEVELS}/users`);
        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const accessUsersQuery = useQuery<AccessUser[], ApiError>({
    queryKey: ["access-levels-users", selectedAccessLevelId],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<AccessUser[]>>(`${ADMIN_ACCESS_LEVELS}/users`, {
          params: { accessLevel: selectedAccessLevelId, variant: "users" },
        });
        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: !!selectedAccessLevelId,
  });

  const userAccessQuery = useQuery<AccessLevel[], ApiError>({
    queryKey: ["user-access-levels", selectedUserId],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<AccessLevel[]>>(`${ADMIN_ACCESS_LEVELS}/users/${selectedUserId}`);
        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
    enabled: !!selectedUserId,
  });

  const masterPasswordInfoQuery = useQuery<MasterPasswordInfo, ApiError>({
    queryKey: ["access-levels-master-password"],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get<ApiSuccess<MasterPasswordInfo>>(`${ADMIN_ACCESS_LEVELS}/master-password`);
        return unwrap(response.data);
      } catch (error) {
        throw toApiError(error);
      }
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["access-levels"] });
    void queryClient.invalidateQueries({ queryKey: ["access-levels-users"] });
    void queryClient.invalidateQueries({ queryKey: ["user-access-levels"] });
    void queryClient.invalidateQueries({ queryKey: ["access-levels-master-password"] });
  };

  const assignAccess = useMutation<ApiSuccess<unknown>, ApiError, { userId: string; accessLevel: string }>({
    mutationKey: ["assign-access-level"],
    mutationFn: async (payload) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(`${ADMIN_ACCESS_LEVELS}/users`, payload, {
          params: { action: "add" },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const removeAccess = useMutation<ApiSuccess<unknown>, ApiError, { userId: string; accessLevel: string }>({
    mutationKey: ["remove-access-level"],
    mutationFn: async (payload) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(`${ADMIN_ACCESS_LEVELS}/users`, payload, {
          params: { action: "remove" },
        });
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const createRule = useMutation<ApiSuccess<unknown>, ApiError, { accessLevel: string; description: string; path: string; access: string[] }>({
    mutationKey: ["create-access-rule"],
    mutationFn: async (payload) => {
      try {
        const response = await axiosInstance.post<ApiSuccess<unknown>>(`${ADMIN_ACCESS_LEVELS}/rules`, payload);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateRule = useMutation<ApiSuccess<unknown>, ApiError, { id: string; description: string; path: string; access: string[] }>({
    mutationKey: ["update-access-rule"],
    mutationFn: async ({ id, ...payload }) => {
      try {
        const response = await axiosInstance.patch<ApiSuccess<unknown>>(`${ADMIN_ACCESS_LEVELS}/rules/${id}`, payload);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const deleteRule = useMutation<ApiSuccess<unknown>, ApiError, { id: string }>({
    mutationKey: ["delete-access-rule"],
    mutationFn: async ({ id }) => {
      try {
        const response = await axiosInstance.delete<ApiSuccess<unknown>>(`${ADMIN_ACCESS_LEVELS}/rules/${id}`);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  const updateMasterPassword = useMutation<ApiSuccess<unknown>, ApiError, { oldPassword: string; newPassword: string }>({
    mutationKey: ["update-master-password"],
    mutationFn: async (payload) => {
      try {
        const response = await axiosInstance.post<ApiSuccess<unknown>>(`${ADMIN_ACCESS_LEVELS}/master-password`, payload);
        return response.data;
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: invalidate,
  });

  return {
    accessLevels: accessLevelsQuery.data ?? [],
    allUsers: allUsersQuery.data ?? [],
    accessUsers: accessUsersQuery.data ?? [],
    userAccessLevels: userAccessQuery.data ?? [],
    masterPasswordInfo: masterPasswordInfoQuery.data ?? null,
    isLoading:
      accessLevelsQuery.isLoading ||
      allUsersQuery.isLoading ||
      accessUsersQuery.isLoading ||
      userAccessQuery.isLoading,
    assignAccess,
    removeAccess,
    createRule,
    updateRule,
    deleteRule,
    updateMasterPassword,
    refetchAccessLevels: accessLevelsQuery.refetch,
  };
};
