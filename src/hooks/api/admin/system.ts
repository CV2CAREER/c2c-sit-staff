import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import { useMutation} from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { 
  Throttle,
  CreateTablePayload,
  ApiTable,
  BotStatus,
  AnswerModeItem,
} from "@/types/admin.types";

export const useSystemQueries = (options: AdminQueriesOptions) => {
  const {
    fetchAdminStatus = false,
    fetchBotStatus = false,
    botName = "",
    fetchAnswerMode = false,
    fetchTables = false,
    fetchThrottles = false,
    fetchAdminDropdowns = false,
    fetchProfileHistory = false,
    fetchReferralHistory = false,
    fetchRegexQueue = false,
    fetchSystemLogs = false,
    logsPage = 1,
    logsLimit = 100,
    logsSearch = "",
    logsType = "",
    tableName = "",
    userId = "",
    profileHistorySkip = 0,
    referralEmail = "",
    startDate = "",
    endDate = "",
  } = options;

  const adminStatus = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_STATUS,
    queryKey: ["admin-status"],
    enabled: fetchAdminStatus || fetchBotStatus || fetchAnswerMode,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const botStatus = useFetchData<BotStatus>({
    method: "GET",
    url: `${endpoints.ADMIN_BOT_CONTROL}?bot=${botName.toLowerCase()}&action=status`,
    queryKey: ["admin-bot-status", botName],
    enabled: fetchBotStatus && !!botName && false, // Disabled in favor of consolidated status
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const answerMode = useFetchData<AnswerModeItem[]>({
    method: "GET",
    url: endpoints.ADMIN_ANSWER_MODE,
    queryKey: ["admin-answer-mode"],
    enabled: fetchAnswerMode && false, // Disabled in favor of consolidated status
  });

  // Map consolidated status to per-bot format for frontend compatibility
  const mappedBotStatus = adminStatus.data?.data ? {
    status: adminStatus.data.data.botEnabled ? "On" : "Off",
    bot: botName
  } : null;

  const mappedAnswerMode = adminStatus.data?.data ? [
    { botName: "Seek", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "Jora", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "Indeed", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "Adzuna", mode: adminStatus.data.data.questionAnswerMode },
    { botName: "LinkedIn", mode: adminStatus.data.data.questionAnswerMode },
  ] : [];

  const HARDCODED_TABLES = [
    "Users",
    "Partners",
    "Referrers",
    "SalesConsultants",
    "CustomerServices",
    "Locations",
    "AggregatorThrottleConfigs",
    "Plans",
    "Profiles"
  ];

  const tables = useFetchData<any>({
    method: "GET",
    url: tableName ? endpoints.ADMIN_SCHEMA_COLUMNS(tableName.toLowerCase()) : endpoints.ADMIN_TABLE_MANAGER,
    queryKey: ["admin-schema", tableName || "all"],
    enabled: fetchTables && !!tableName,
  });

  const mappedTables: ApiTable[] = useMemo(() => {
    if (tableName && tables.data?.data?.columns) {
      return [{
        _id: tableName,
        name: tableName,
        columns: tables.data.data.columns.map((c: any) => c.name)
      }];
    }
    return HARDCODED_TABLES.map(table => ({
      _id: table,
      name: table,
      columns: []
    }));
  }, [tables.data, tableName]);

  const throttles = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_THROTTLE,
    queryKey: ["admin-throttles"],
    enabled: fetchThrottles,
  });
  
  const mappedThrottles: Throttle[] = useMemo(() => {
    if (!throttles.data?.data?.config) return [];
    const config = throttles.data.data.config;
    const result: Throttle[] = [
      {
        id: 0,
        aggregator: "Global (Max Jobs)",
        value: config.maxConcurrentJobs,
      },
      {
        id: -1,
        aggregator: "Global (Req/Min)",
        value: config.maxRequestsPerMinute,
      }
    ];

    if (config.perAggregator) {
      Object.entries(config.perAggregator).forEach(([agg, settings]: [string, any], idx) => {
        result.push({
          id: idx + 1,
          aggregator: agg,
          value: settings.maxConcurrentJobs ?? config.maxConcurrentJobs,
        });
      });
    }
    return result;
  }, [throttles.data]);

  const adminDropdowns = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_DROPDOWN,
    queryKey: ["admin-dropdowns"],
    enabled: fetchAdminDropdowns,
  });

  const profileHistory = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_PROFILE_HISTORY(userId),
    queryKey: ["admin-profile-history", userId, profileHistorySkip],
    params: { skip: profileHistorySkip },
    enabled: fetchProfileHistory && !!userId,
  });

  const referralHistory = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_REFERRAL_HISTORY,
    queryKey: ["admin-referral-history", referralEmail],
    params: { email: referralEmail },
    enabled: fetchReferralHistory && !!referralEmail,
  });

  const regexQueue = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_REGEX_QUEUE,
    queryKey: ["admin-regex-queue", userId],
    params: { variant: userId || "all" },
    enabled: fetchRegexQueue,
  });

  const systemLogs = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_SYSTEM_LOGS,
    queryKey: ["admin-system-logs", logsPage, logsLimit, logsSearch, logsType, startDate, endDate],
    params: { page: logsPage, limit: logsLimit, search: logsSearch, type: logsType, startDate, endDate },
    enabled: fetchSystemLogs,
  });

  return useMemo(() => ({
    adminStatusDomain: {
      data: adminStatus.data?.data,
      isLoading: adminStatus.isLoading,
      isSuccess: adminStatus.isSuccess,
      isError: adminStatus.isError,
      error: adminStatus.error,
    },
    botStatusDomain: {
      data: mappedBotStatus,
      isLoading: adminStatus.isLoading,
      isSuccess: adminStatus.isSuccess,
      isError: adminStatus.isError,
      error: adminStatus.error,
    },
    answerModeDomain: {
      data: mappedAnswerMode,
      isLoading: adminStatus.isLoading,
      isSuccess: adminStatus.isSuccess,
      isError: adminStatus.isError,
      error: adminStatus.error,
    },
    tablesDomain: {
      data: mappedTables,
      isLoading: tables.isLoading,
      isSuccess: tables.isSuccess,
      isError: tables.isError,
      error: tables.error,
    },
    throttlesDomain: {
      data: mappedThrottles,
      isLoading: throttles.isLoading,
      isSuccess: throttles.isSuccess,
      isError: throttles.isError,
      error: throttles.error,
    },
    adminDropdownsDomain: {
      data: adminDropdowns.data?.data,
      isLoading: adminDropdowns.isLoading,
      isSuccess: adminDropdowns.isSuccess,
      isError: adminDropdowns.isError,
      error: adminDropdowns.error,
    },
    profileHistoryDomain: {
      data: profileHistory.data?.data,
      isLoading: profileHistory.isLoading,
      isSuccess: profileHistory.isSuccess,
      isError: profileHistory.isError,
      error: profileHistory.error,
    },
    referralHistoryDomain: {
      data: referralHistory.data?.data,
      isLoading: referralHistory.isLoading,
      isSuccess: referralHistory.isSuccess,
      isError: referralHistory.isError,
      error: referralHistory.error,
    },
    regexQueueDomain: {
      data: regexQueue.data?.data,
      isLoading: regexQueue.isLoading,
      isSuccess: regexQueue.isSuccess,
      isError: regexQueue.isError,
      error: regexQueue.error,
    },
    systemLogsDomain: {
      data: systemLogs.data?.data,
      isLoading: systemLogs.isLoading,
      isSuccess: systemLogs.isSuccess,
      isError: systemLogs.isError,
      error: systemLogs.error,
    },
  }), [
    adminStatus, mappedBotStatus, mappedAnswerMode, tables, mappedTables, 
    throttles, mappedThrottles, adminDropdowns, profileHistory, 
    referralHistory, regexQueue, systemLogs
  ]);
};

export const useSystemMutations = () => {
  const queryClient = useQueryClient();
  return {
    toggleBotMutation: useMutateData<any, { botEnabled?: boolean; questionAnswerMode?: string }>({
      method: "PATCH",
      url: endpoints.ADMIN_BOT_CONTROL,
      mutationKey: ["admin-bot-toggle"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateAnswerModeMutation: useMutateData<any, { mode: string }>({
      method: "PUT",
      url: endpoints.ADMIN_ANSWER_MODE,
      mutationKey: ["admin-update-answer-mode"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-answer-mode"] });
      },
      onError: () => {},
    }),
    exportSystemLogsMutation: useMutation({
      mutationKey: ["admin-export-system-logs"],
      mutationFn: async (params: { type?: string; search?: string }) => {
        const res = await axiosInstance.get(endpoints.ADMIN_SYSTEM_LOGS_EXPORT, {
          params,
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `system-logs-${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      },
    }),
    createTableMutation: useMutateData<ApiTable, CreateTablePayload>({
      method: "POST",
      url: endpoints.ADMIN_TABLE_MANAGER,
      mutationKey: ["admin-create-table"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateTableMutation: useMutateData<any, any>({
      method: "POST", // v1 uses POST /schema/expand for expandColumn
      url: endpoints.ADMIN_SCHEMA_EXPAND,
      mutationKey: ["admin-update-table"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteTableMutation: useMutateData<any, { table: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_TABLE_MANAGER,
      mutationKey: ["admin-delete-table"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteColumnMutation: useMutation({
      mutationKey: ["admin-delete-column"],
      mutationFn: async ({ tableName, columnName }: { tableName: string; columnName: string }) => {
        const response = await axiosInstance.delete(
          endpoints.ADMIN_SCHEMA_DELETE_COLUMN(tableName.toLowerCase(), columnName)
        );
        return response.data;
      },
    }),
    createThrottleMutation: useMutateData<any, any>({
      method: "PATCH",
      url: endpoints.ADMIN_THROTTLE,
      mutationKey: ["admin-create-throttle"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateThrottleMutation: useMutateData<any, any>({
      method: "PATCH",
      url: endpoints.ADMIN_THROTTLE,
      mutationKey: ["admin-update-throttle"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteThrottleMutation: useMutateData<any, any>({
      method: "PATCH",
      url: endpoints.ADMIN_THROTTLE,
      mutationKey: ["admin-delete-throttle"],
      onSuccess: () => {},
      onError: () => {},
    }),
    createDropdownMutation: useMutateData<any, { title: string; options: string[] }>({
      method: "POST",
      url: endpoints.ADMIN_DROPDOWN,
      mutationKey: ["admin-create-dropdown"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateDropdownMutation: useMutateData<any, { title: string; options: string[]; id: string }>({
      method: "PUT",
      url: endpoints.ADMIN_DROPDOWN,
      mutationKey: ["admin-update-dropdown"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteDropdownMutation: useMutateData<any, { id: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_DROPDOWN,
      mutationKey: ["admin-delete-dropdown"],
      onSuccess: () => {},
      onError: () => {},
    }),
    notifyAdminMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_NOTIFY_ADMIN,
      mutationKey: ["admin-notify-admin"],
      onSuccess: () => {},
      onError: () => {},
    }),
    shortenWordsMutation: useMutateData<any, { words: string[] }>({
      method: "POST",
      url: endpoints.SHORTEN_WORDS,
      mutationKey: ["admin-shorten-words"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateRegexQueueMutation: useMutateData<any, { value: string; variant: string }>({
      method: "POST",
      url: endpoints.ADMIN_REGEX_QUEUE,
      mutationKey: ["admin-update-regex-queue"],
      paramKey: "variant",
      onSuccess: () => {},
      onError: () => {},
    }),
    dispatchCredentialsMutation: useMutateData<any, { clientId: string }>({
      method: "GET",
      url: endpoints.ADMIN_DISPATCH_CREDENTIALS,
      mutationKey: ["admin-dispatch-credentials"],
      paramKey: "clientId",
      onSuccess: () => {},
      onError: () => {},
    }),
    dispatchClientMutation: useMutateData<any, { pcId: string; userIds: string[] }>({
      method: "POST",
      url: endpoints.ADMIN_DISPATCH_CLIENT,
      mutationKey: ["admin-dispatch-client"],
      onSuccess: () => {},
      onError: () => {},
    }),
    generatePasswordMutation: useMutateData<any, { password: string; userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_GENERATE_PASSWORD,
      mutationKey: ["admin-generate-password"],
      onSuccess: () => {},
      onError: () => {},
    }),
    sendPreferenceEmailMutation: useMutateData<any, { email: string; firstname: string }>({
      method: "POST",
      url: endpoints.ADMIN_SEND_PREFERENCE_EMAIL,
      mutationKey: ["admin-send-preference-email"],
      onSuccess: () => {},
      onError: () => {},
    }),
    fetchPreferenceEmailDetailsMutation: useMutateData<{ email: string; firstname: string }, { search: string }>({
      method: "GET",
      url: endpoints.ADMIN_SEND_PREFERENCE_EMAIL_BY_ID,
      mutationKey: ["admin-preference-email-details"],
      onSuccess: () => {},
      onError: () => {},
    }),
    coachingSessionMutation: useMutateData<any, { action: string; email: string; lastName: string; firstName: string }>({
      method: "POST",
      url: endpoints.ADMIN_COACHING_SESSION,
      mutationKey: ["admin-coaching-session"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateUserPreferencesMutation: useMutateData<any, any>({
      method: "PATCH",
      url: endpoints.ADMIN_UPDATE_USER_PREFERENCES,
      mutationKey: ["admin-update-user-preferences"],
      paramKey: "userId" as any,
      onSuccess: () => {},
      onError: () => {},
    }),
  };
};
