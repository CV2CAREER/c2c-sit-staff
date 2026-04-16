import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";

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
  
  // FIXED: Use ADMIN_STATS endpoint for analytics/persona counts
  const usersPersonaCount = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    params: { startDate, endDate },
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

  const pcsMerged = useMemo(() => {
    const assistantItems = pcsAssistant.data?.data?.items ?? pcsAssistant.data?.data ?? [];
    const coachItems = pcsCoach.data?.data?.items ?? pcsCoach.data?.data ?? [];

    const mergedItems = [...(Array.isArray(assistantItems) ? assistantItems : []), ...(Array.isArray(coachItems) ? coachItems : [])];

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

  // Transform the analytics data into the expected persona count format
  const transformedPersonaData = useMemo(() => {
    const analyticsData = usersPersonaCount.data?.data;
    
    if (!analyticsData) {
      return {
        adminPersonnaCount: 0,
        guestPersonnaCount: 0,
        clientPersonnaCount: 0,
        coachesPersonnaCount: 0,
        partnersPersonnaCount: 0,
        salesPersonnaCount: 0,
        csePersonnaCount: 0,
        testPersonnaCount: 0,
        loyalistsPersonnaCount: 0,
        totalActiveUsersCount: 0,
        bronzePlanCount: 0,
        emeraldPlanCount: 0,
        coralPlanCount: 0,
        silverPlanCount: 0,
        platinumPlanCount: 0,
        goldPlanCount: 0,
        totalPlanCount: 0,
      };
    }

    // Map the analytics response to the expected format
    // Adjust these mappings based on your actual API response structure
    return {
      adminPersonnaCount: analyticsData.adminCount || analyticsData.adminPersonnaCount || 0,
      guestPersonnaCount: analyticsData.guestCount || analyticsData.guestPersonnaCount || 0,
      clientPersonnaCount: analyticsData.clientCount || analyticsData.clientPersonnaCount || 0,
      coachesPersonnaCount: analyticsData.coachCount || analyticsData.coachesPersonnaCount || 0,
      partnersPersonnaCount: analyticsData.partnerCount || analyticsData.partnersPersonnaCount || 0,
      salesPersonnaCount: analyticsData.salesCount || analyticsData.salesPersonnaCount || 0,
      csePersonnaCount: analyticsData.cseCount || analyticsData.csePersonnaCount || 0,
      testPersonnaCount: analyticsData.testCount || analyticsData.testPersonnaCount || 0,
      loyalistsPersonnaCount: analyticsData.loyalistCount || analyticsData.loyalistsPersonnaCount || 0,
      totalActiveUsersCount: analyticsData.totalUsers || analyticsData.totalActiveUsersCount || 0,
      bronzePlanCount: analyticsData.bronzePlanCount || analyticsData.bronzeCount || 0,
      emeraldPlanCount: analyticsData.emeraldPlanCount || analyticsData.emeraldCount || 0,
      coralPlanCount: analyticsData.coralPlanCount || analyticsData.coralCount || 0,
      silverPlanCount: analyticsData.silverPlanCount || analyticsData.silverCount || 0,
      platinumPlanCount: analyticsData.platinumPlanCount || analyticsData.platinumCount || 0,
      goldPlanCount: analyticsData.goldPlanCount || analyticsData.goldCount || 0,
      totalPlanCount: analyticsData.totalPlanCount || analyticsData.totalPlans || 0,
    };
  }, [usersPersonaCount.data]);

  return useMemo(() => ({
    usersCountDomain: {
      data: usersCount.data?.data,
      isLoading: usersCount.isLoading,
      isSuccess: usersCount.isSuccess,
      isError: usersCount.isError,
      error: usersCount.error,
    },
    usersPersonaCountDomain: {
      data: transformedPersonaData,
      isLoading: usersPersonaCount.isLoading,
      isSuccess: usersPersonaCount.isSuccess,
      isError: usersPersonaCount.isError,
      error: usersPersonaCount.error,
      refetch: usersPersonaCount.refetch,
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
    usersCount.data, usersCount.isLoading, usersCount.isSuccess, usersCount.isError, usersCount.error,
    transformedPersonaData, usersPersonaCount.isLoading, usersPersonaCount.isSuccess, usersPersonaCount.isError, usersPersonaCount.error, usersPersonaCount.refetch,
    userDetail.data, userDetail.isLoading, userDetail.isSuccess, userDetail.isError, userDetail.error,
    usersList.data, usersList.isLoading, usersList.isSuccess, usersList.isError, usersList.error,
    userInfo.data, userInfo.isLoading, userInfo.isSuccess, userInfo.isError, userInfo.error,
    usersFullName.data, usersFullName.isLoading, usersFullName.isSuccess, usersFullName.isError, usersFullName.error,
    clients.data, clients.isLoading, clients.isSuccess, clients.isError, clients.error,
    pcsMerged,
    plans.data, plans.isLoading, plans.isSuccess, plans.isError, plans.error,
    userPreferences.data, userPreferences.isLoading, userPreferences.isSuccess, userPreferences.isError, userPreferences.error,
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
