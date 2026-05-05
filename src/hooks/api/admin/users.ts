import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

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
    fetchFeatureTitles = false,
    fetchUserPreferencesV2 = false,
    fetchUserPreferencesHistory = false,
    fetchUserReferrals = false,
    fetchUserDocuments = false,
    fetchUserProfileSafe = false,
    fetchUserProgress = false,

    
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
  
  // FIXED: Always fetch fresh data directly from endpoint
  const adminAnalytics = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATS,
    params: {
      from: startDate || undefined,
      to: endDate || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      _timestamp: Date.now()
    },
    queryKey: ["admin-analytics-live", startDate, endDate, Date.now()],
    enabled: fetchUsersPersonaCount,
    forceRefresh: true,
  });

  const usersPersonaCount = adminAnalytics;

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
    url: "/api/v1/user/assistants",
    queryKey: ["admin-pcs"],
    enabled: fetchPCs,
  });

  const pcsMerged = useMemo(() => {
    // Axios wraps response: .data.data is actual API response body
    const apiResponse = pcsAssistant.data?.data;
    const pcUsers = apiResponse?.pcUsers ?? [];

    const formattedPCs = Array.isArray(pcUsers) ? pcUsers.map((pc: any) => ({
      id: pc.id,
      firstName: pc.firstName,
      lastName: pc.lastName,
      middleName: pc.middleName,
      ...pc
    })) : [];

    return {
      data: formattedPCs,
      isLoading: pcsAssistant.isLoading,
      isSuccess: pcsAssistant.isSuccess,
      isError: pcsAssistant.isError,
      error: pcsAssistant.error,
    };
  }, [pcsAssistant]);

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

  // User MAnagement Page - Temidayo
  const featureTitles = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_FEATURE_TITLES,
    queryKey: ["admin-feature-titles"],
    enabled: fetchFeatureTitles,
  });

  const userPreferencesV2 = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_PREFERENCES_V2(userId) : "",
    queryKey: ["admin-user-preferences-v2", userId],
    enabled: fetchUserPreferencesV2 && !!userId,
  });

  const userPreferencesHistory = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_PREFERENCES_HISTORY(userId) : "",
    queryKey: ["admin-user-preferences-history", userId],
    enabled: fetchUserPreferencesHistory && !!userId,
  });

  const userReferrals = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_REFERRALS(userId) : "",
    queryKey: ["admin-user-referrals", userId],
    enabled: fetchUserReferrals && !!userId,
  });

  const userDocuments = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_DOCUMENTS(userId) : "",
    queryKey: ["admin-user-documents", userId],
    enabled: fetchUserDocuments && !!userId,
  });

  const userProfileSafe = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_PROFILE_SAFE(userId) : "",
    queryKey: ["admin-user-profile-safe", userId],
    enabled: fetchUserProfileSafe && !!userId,
  });

  const userProgress = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_USER_PROGRESS(userId) : "",
    queryKey: ["admin-user-progress", userId],
    enabled: fetchUserProgress && !!userId,
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

    const tiers = Array.isArray(analyticsData.subscriptionTiers?.tiers)
      ? analyticsData.subscriptionTiers.tiers
      : [];

    const getTierUsers = (...keys: string[]) => {
      for (const key of keys) {
        const tier = tiers.find((t: any) => t?.key === key);
        if (typeof tier?.users === "number") return tier.users;
      }
      return undefined;
    };

    // Map consolidated analytics payload (breakdown/subscriptionTiers)
    // with fallback to legacy flat fields.
    return {
      adminPersonnaCount:
        analyticsData.adminCount ??
        analyticsData.adminPersonnaCount ??
        analyticsData.breakdown?.users?.successful ??
        0,
      guestPersonnaCount:
        analyticsData.guestCount ??
        analyticsData.guestPersonnaCount ??
        0,
      clientPersonnaCount:
        analyticsData.clientCount ??
        analyticsData.clientPersonnaCount ??
        analyticsData.breakdown?.users?.successful ??
        0,
      coachesPersonnaCount:
        analyticsData.coachCount ??
        analyticsData.coachesPersonnaCount ??
        0,
      partnersPersonnaCount:
        analyticsData.partnerCount ??
        analyticsData.partnersPersonnaCount ??
        0,
      salesPersonnaCount:
        analyticsData.salesCount ??
        analyticsData.salesPersonnaCount ??
        0,
      csePersonnaCount:
        analyticsData.cseCount ??
        analyticsData.csePersonnaCount ??
        0,
      testPersonnaCount:
        analyticsData.testCount ??
        analyticsData.testPersonnaCount ??
        analyticsData.breakdown?.applications?.failed ??
        0,
      loyalistsPersonnaCount:
        analyticsData.loyalistCount ??
        analyticsData.loyalistsPersonnaCount ??
        0,
      totalActiveUsersCount:
        analyticsData.totalUsers ??
        analyticsData.totalActiveUsersCount ??
        analyticsData.subscriptionTiers?.totals?.activeSubscribers ??
        analyticsData.breakdown?.users?.successful ??
        0,
      bronzePlanCount:
        analyticsData.bronzePlanCount ??
        analyticsData.bronzeCount ??
        getTierUsers("bronze") ??
        0,
      emeraldPlanCount:
        analyticsData.emeraldPlanCount ??
        analyticsData.emeraldCount ??
        getTierUsers("emerald", "copper") ??
        0,
      coralPlanCount:
        analyticsData.coralPlanCount ??
        analyticsData.coralCount ??
        getTierUsers("coral") ??
        0,
      silverPlanCount:
        analyticsData.silverPlanCount ??
        analyticsData.silverCount ??
        getTierUsers("silver") ??
        0,
      platinumPlanCount:
        analyticsData.platinumPlanCount ??
        analyticsData.platinumCount ??
        getTierUsers("platinum") ??
        0,
      goldPlanCount:
        analyticsData.goldPlanCount ??
        analyticsData.goldCount ??
        getTierUsers("gold") ??
        0,
      totalPlanCount:
        analyticsData.totalPlanCount ??
        analyticsData.totalPlans ??
        analyticsData.subscriptionTiers?.totals?.activeSubscriptions ??
        0,
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

    // User Management Page
    featureTitlesDomain: {
      data: featureTitles.data?.data,
      isLoading: featureTitles.isLoading,
      isSuccess: featureTitles.isSuccess,
      isError: featureTitles.isError,
      error: featureTitles.error,
    },
    userPreferencesV2Domain: {
      data: userPreferencesV2.data?.data,
      isLoading: userPreferencesV2.isLoading,
      isSuccess: userPreferencesV2.isSuccess,
      isError: userPreferencesV2.isError,
      error: userPreferencesV2.error,
    },
    userPreferencesHistoryDomain: {
      data: userPreferencesHistory.data?.data,
      isLoading: userPreferencesHistory.isLoading,
      isSuccess: userPreferencesHistory.isSuccess,
      isError: userPreferencesHistory.isError,
      error: userPreferencesHistory.error,
    },
    userReferralsDomain: {
      data: userReferrals.data?.data,
      isLoading: userReferrals.isLoading,
      isSuccess: userReferrals.isSuccess,
      isError: userReferrals.isError,
      error: userReferrals.error,
    },
    userDocumentsDomain: {
      data: userDocuments.data?.data,
      isLoading: userDocuments.isLoading,
      isSuccess: userDocuments.isSuccess,
      isError: userDocuments.isError,
      error: userDocuments.error,
    },
    userProfileSafeDomain: {
      data: userProfileSafe.data?.data,
      isLoading: userProfileSafe.isLoading,
      isSuccess: userProfileSafe.isSuccess,
      isError: userProfileSafe.isError,
      error: userProfileSafe.error,
    },
    userProgressDomain: {
      data: userProgress.data?.data,
      isLoading: userProgress.isLoading,
      isSuccess: userProgress.isSuccess,
      isError: userProgress.isError,
      error: userProgress.error,
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
  const queryClient = useQueryClient();

  const invalidateAllUsersQueries = () => {
    // Invalidate ALL user related cache queries after any mutation
    queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-persona-count"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-detail"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-info"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users-full-name"] });
    queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pcs"] });
    queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-preferences"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  return {
    updateUserProgressMutation: useMutateData<any, { progress: string; metadata?: any; uid: string }>({
      method: "PUT",
      url: endpoints.ADMIN_UPDATE_USER_PROGRESS,
      mutationKey: ["admin-update-user-progress"],
      paramKey: "uid",
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("User progress updated successfully");
      },
      onError: () => {
        toast.error("Failed to update user progress");
      },
    }),
    upgradePlanMutation: useMutateData<any, { plan: string; userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_UPGRADE_PLAN,
      mutationKey: ["admin-upgrade-plan"],
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("Plan upgraded successfully");
      },
      onError: () => {
        toast.error("Failed to upgrade plan");
      },
    }),
    accountActionMutation: useMutateData<any, { userId: string; action: string }>({
      method: "POST",
      url: endpoints.ADMIN_ACCOUNT_ACTION,
      mutationKey: ["admin-account-action"],
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("Account action completed successfully");
      },
      onError: () => {
        toast.error("Failed to perform account action");
      },
    }),
    deleteUserMutation: useMutateData<any, { userId: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_DELETE_USER,
      mutationKey: ["admin-delete-user"],
      paramKey: "userId",
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("User deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete user");
      },
    }),
    assignVaMutation: useMutateData<any, { credId: string; vaEmail: string | null; host?: string }>({
      method: "POST",
      url: endpoints.ADMIN_ASSIGN_VA,
      mutationKey: ["admin-assign-va"],
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("VA assigned successfully");
      },
      onError: () => {
        toast.error("Failed to assign VA");
      },
    }),
    reverseUserIdMutation: useMutateData<{ _id: string }, { clientId: string | number }>({
      method: "POST",
      url: endpoints.ADMIN_REVERSE_USER_ID,
      mutationKey: ["admin-reverse-user-id"],
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("User ID reversed successfully");
      },
      onError: () => {
        toast.error("Failed to reverse user ID");
      },
    }),
    applicationEmailMutation: useMutateData<any, { type: string; name: string; email: string }>({
      method: "POST",
      url: endpoints.ADMIN_APPLICATION_EMAILS,
      mutationKey: ["admin-application-email"],
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("Application email sent successfully");
      },
      onError: () => {
        toast.error("Failed to send application email");
      },
    }),
    dispatchSampleMutation: useMutateData<any, { clientId: string }>({
      method: "PATCH",
      url: (params) => endpoints.ADMIN_DISPATCH_SAMPLE(params.clientId),
      mutationKey: ["admin-dispatch-sample"],
      onSuccess: () => {
        invalidateAllUsersQueries();
        toast.success("Sample dispatched successfully");
      },
      onError: () => {
        toast.error("Failed to dispatch sample");
      },
    }),
  };
};
