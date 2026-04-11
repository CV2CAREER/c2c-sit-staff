import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";

/**
 * Roles that make up the "PCs" group.
 * The V1 backend only supports single-role filtering, so we fire one
 * request per role and merge client-side.
 * "assistant" is a valid V1 Role; "coach" is the closest V1 equivalent
 * for the old "tpc" concept. Adjust if the backend team adds a "tpc" role.
 */
const PC_ROLES = ["assistant", "coach"] as const;

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
    url: endpoints.ADMIN_USERS,
    params: { dataCount: "true", startDate, endDate },
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
      const p: Record<string, string> = {};
      if (usersFilter.active) p.active = "true";
      if (usersFilter.recycle) p.recycle = "true";
      if (usersFilter.q) p.search = usersFilter.q;
      if (usersFilter.userType) p.userType = usersFilter.userType;
      if (usersFilter.plan) p.plan = usersFilter.plan;
      if (usersFilter.page) p.page = String(usersFilter.page);
      if (usersFilter.limit) p.limit = String(usersFilter.limit);
      
      const hasFilter = usersFilter.q || usersFilter.userType || usersFilter.plan;
      if (!hasFilter) p.variant = "all";
      
      return p;
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

  // --- Parallel single-role requests for PCs ---
  const pcsAssistant = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { role: PC_ROLES[0], variant: "all" },
    queryKey: ["admin-pcs", PC_ROLES[0]],
    enabled: fetchPCs,
  });

  const pcsCoach = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_USERS,
    params: { role: PC_ROLES[1], variant: "all" },
    queryKey: ["admin-pcs", PC_ROLES[1]],
    enabled: fetchPCs,
  });

  // Merge the two PC role results into a single domain
  const pcsMerged = useMemo(() => {
    const assistantItems = pcsAssistant.data?.data?.items ?? pcsAssistant.data?.data ?? [];
    const coachItems = pcsCoach.data?.data?.items ?? pcsCoach.data?.data ?? [];

    const mergedItems = [...(Array.isArray(assistantItems) ? assistantItems : []), ...(Array.isArray(coachItems) ? coachItems : [])];

    // Preserve pagination-style wrapper if the original response uses one
    const mergedData = pcsAssistant.data?.data?.items
      ? { items: mergedItems, pagination: { total: mergedItems.length } }
      : mergedItems;

    return {
      data: mergedData,
      isLoading: pcsAssistant.isLoading || pcsCoach.isLoading,
      isSuccess: pcsAssistant.isSuccess && pcsCoach.isSuccess,
      isError: pcsAssistant.isError || pcsCoach.isError,
      error: pcsAssistant.error || pcsCoach.error,
    };
  }, [pcsAssistant, pcsCoach]);

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
    pcsDomain: pcsMerged,
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
    clients, pcsMerged, plans, userPreferences
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
