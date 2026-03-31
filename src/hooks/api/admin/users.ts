import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";

export const useUsersQueries = (options: AdminQueriesOptions) => {
  const {
    fetchUsersCount = false,
    fetchUsersPersonaCount = false,
    fetchUsersList = false,
    fetchUserDetail = false,
    fetchUsersFullName = false,
    fetchUserInfo = false,
    fetchClients = false,
    fetchPCs = false,
    fetchPlans = false,
    fetchUserPreferences = false,
    startDate = "",
    endDate = "",
    userId = "",
    usersFilter = {},
    usersFullNameSkip = 0,
  } = options;

  const usersCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_USERS}?dataCount=true&startDate=${startDate}&endDate=${endDate}`,
    queryKey: ["admin-users-count", startDate, endDate],
    enabled: fetchUsersCount,
  });
  
  const usersPersonaCount = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { activePersonnaCount: "true", startDate, endDate },
    queryKey: ["admin-users-persona-count", startDate, endDate],
    enabled: fetchUsersPersonaCount,
  });

  const userDetail = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_DETAIL(userId) : "",
    queryKey: ["admin-user-detail", userId],
    enabled: fetchUserDetail && !!userId,
  });

  const usersList = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: (() => {
      const p = new URLSearchParams();
      if (usersFilter.active) p.append("active", "true");
      if (usersFilter.recycle) p.append("recycle", "true");
      if (usersFilter.q) p.append("q", usersFilter.q);
      if (usersFilter.userType) p.append("userType", usersFilter.userType);
      if (usersFilter.plan) p.append("plan", usersFilter.plan);
      if (usersFilter.page) p.append("page", String(usersFilter.page));
      if (usersFilter.limit) p.append("limit", String(usersFilter.limit));
      
      const hasFilter = usersFilter.q || usersFilter.userType || usersFilter.plan;
      if (!hasFilter) p.append("variant", "all");
      
      const qs = p.toString();
      return qs ? `?${qs}` : "";
    })(),
    queryKey: ["admin-users-list", usersFilter],
    enabled: fetchUsersList,
  });

  const userInfo = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_INFO(userId) : "",
    queryKey: ["admin-user-info", userId],
    enabled: fetchUserInfo && !!userId,
  });

  const usersFullName = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS_FULL_NAME,
    params: { skip: usersFullNameSkip },
    queryKey: ["admin-users-full-name", usersFullNameSkip],
    enabled: fetchUsersFullName,
  });

  const clients = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { role: "client", variant: "all" },
    queryKey: ["admin-clients"],
    enabled: fetchClients,
  });

  const pcs = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { role: "assistant,tpc", variant: "all" },
    queryKey: ["admin-pcs"],
    enabled: fetchPCs,
  });

  const plans = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_PLANS,
    queryKey: ["admin-plans"],
    enabled: fetchPlans,
  });

  const userPreferences = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USER_PREFERENCES,
    queryKey: ["admin-user-preferences", userId],
    params: { id: userId },
    enabled: fetchUserPreferences && !!userId,
  });

  return useMemo(() => ({
    usersCountDomain: {
      data: usersCount.data?.data,
      isLoading: usersCount.isLoading,
      isSuccess: usersCount.isSuccess,
      isError: usersCount.isError,
      error: usersCount.error,
    },
    usersPersonaCountDomain: {
      data: usersPersonaCount.data?.data,
      isLoading: usersPersonaCount.isLoading,
      isSuccess: usersPersonaCount.isSuccess,
      isError: usersPersonaCount.isError,
      error: usersPersonaCount.error,
    },
    userDetailDomain: {
      data: userDetail.data?.data,
      isLoading: userDetail.isLoading,
      isSuccess: userDetail.isSuccess,
      isError: userDetail.isError,
      error: userDetail.error,
    },
    usersListDomain: {
      data: usersList.data?.data,
      isLoading: usersList.isLoading,
      isSuccess: usersList.isSuccess,
      isError: usersList.isError,
      error: usersList.error,
    },
    userInfoDomain: {
      data: userInfo.data?.data,
      isLoading: userInfo.isLoading,
      isSuccess: userInfo.isSuccess,
      isError: userInfo.isError,
      error: userInfo.error,
    },
    usersFullNameDomain: {
      data: usersFullName.data?.data,
      isLoading: usersFullName.isLoading,
      isSuccess: usersFullName.isSuccess,
      isError: usersFullName.isError,
      error: usersFullName.error,
    },
    clientsDomain: {
      data: clients.data?.data,
      isLoading: clients.isLoading,
      isSuccess: clients.isSuccess,
      isError: clients.isError,
      error: clients.error,
    },
    pcsDomain: {
      data: pcs.data?.data,
      isLoading: pcs.isLoading,
      isSuccess: pcs.isSuccess,
      isError: pcs.isError,
      error: pcs.error,
    },
    plansDomain: {
      data: plans.data?.data,
      isLoading: plans.isLoading,
      isSuccess: plans.isSuccess,
      isError: plans.isError,
      error: plans.error,
    },
    userPreferencesDomain: {
      data: userPreferences.data?.data,
      isLoading: userPreferences.isLoading,
      isSuccess: userPreferences.isSuccess,
      isError: userPreferences.isError,
      error: userPreferences.error,
    },
  }), [
    usersCount, usersPersonaCount, userDetail, usersList, userInfo, usersFullName,
    clients, pcs, plans, userPreferences
  ]);
};

export const useUsersMutations = () => {
  return {
    updateUserProgressMutation: useMutateData<any, { progress: string; metadata?: any; uid: string }>({
      method: "PUT",
      url: endpoints.ADMIN_UPDATE_USER_PROGRESS,
      mutationKey: ["admin-update-user-progress"],
      paramKey: "uid",
      onSuccess: () => {},
      onError: () => {},
    }),
    upgradePlanMutation: useMutateData<any, { plan: string; userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_UPGRADE_PLAN,
      mutationKey: ["admin-upgrade-plan"],
      onSuccess: () => {},
      onError: () => {},
    }),
    accountActionMutation: useMutateData<any, { userId: string; action: string }>({
      method: "POST",
      url: endpoints.ADMIN_ACCOUNT_ACTION,
      mutationKey: ["admin-account-action"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteUserMutation: useMutateData<any, { userId: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_DELETE_USER,
      mutationKey: ["admin-delete-user"],
      paramKey: "userId",
      onSuccess: () => {},
      onError: () => {},
    }),
    assignVaMutation: useMutateData<any, { credId: string; VaEmail: string | null }>({
      method: "POST",
      url: endpoints.ADMIN_ASSIGN_VA,
      mutationKey: ["admin-assign-va"],
      onSuccess: () => {},
      onError: () => {},
    }),
    reverseUserIdMutation: useMutateData<{ _id: string }, { clientId: string | number }>({
      method: "POST",
      url: endpoints.ADMIN_REVERSE_USER_ID,
      mutationKey: ["admin-reverse-user-id"],
      onSuccess: () => {},
      onError: () => {},
    }),
    applicationEmailMutation: useMutateData<any, { type: string; name: string; email: string }>({
      method: "POST",
      url: endpoints.ADMIN_APPLICATION_EMAILS,
      mutationKey: ["admin-application-email"],
      onSuccess: () => {},
      onError: () => {},
    }),
    dispatchSampleMutation: useMutateData<any, { clientId: string | number }>({
      method: "PATCH",
      url: endpoints.ADMIN_DISPATCH_SAMPLE,
      mutationKey: ["admin-dispatch-sample"],
      paramKey: "clientId",
      onSuccess: () => {},
      onError: () => {},
    }),
  };
};
