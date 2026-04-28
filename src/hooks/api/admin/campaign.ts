import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";

export const useCampaignQueries = (options: AdminQueriesOptions) => {
  const {
    fetchCampaignSheet = false,
    fetchCampaignClients = false,
    fetchClientCampaignInsights = false,
    fetchCampaigns = false,
    fetchSheetsTemplates = false,
    fetchSingleClient = false,
    userId = "",
    clientId = "",
    campaignOptions = {},
    campaignActive = "true",
    campaignSearch = "",
  } = options;

  const campaignSheet = useFetchData<any>({
    method: "GET",
    url: `/api/v1/campaigns/sheets/aggregators/${userId}`,
    queryKey: ["admin-campaign-sheet", userId, campaignOptions],
    enabled: fetchCampaignSheet && !!userId,
  });

  const campaignClients = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CAMPAIGN_GET_CLIENTS,
    queryKey: ["admin-fetch-campaign-clients"],
    enabled: fetchCampaignClients,
  });

  const clientCampaignInsights = useFetchData<any>({
    method: "GET",
    url: userId ? endpoints.ADMIN_CAMPAIGN_CLIENT_INSIGHTS(userId) : "",
    queryKey: ["admin-fetch-client-campaign-insights", userId],
    enabled: fetchClientCampaignInsights && !!userId,
  });

  const campaigns = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CAMPAIGN,
    params: { 
      filter: campaignActive,
      q: campaignSearch 
    },
    queryKey: ["admin-campaigns", campaignActive, campaignSearch],
    enabled: fetchCampaigns,
  });

  const sheetsTemplates = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_SHEETS_TEMPLATES,
    queryKey: ["admin-sheets-templates"],
    enabled: fetchSheetsTemplates,
  });

  const singleClient = useFetchData<any>({
    method: "GET",
    url: clientId ? `/api/v1/campaigns/clients/${clientId}` : "",
    queryKey: ["admin-single-campaign-client", clientId],
    enabled: fetchSingleClient && !!clientId,
  });

  return useMemo(() => ({
    campaignSheetDomain: {
      data: campaignSheet.data?.data?.records ?? campaignSheet.data?.data ?? campaignSheet.data,
      totalCount: campaignSheet.data?.data?.totalCount ?? 0,
      isLoading: campaignSheet.isLoading,
      isSuccess: campaignSheet.isSuccess,
      isError: campaignSheet.isError,
      error: campaignSheet.error,
    },
    campaignClientsDomain: {
      data: campaignClients.data?.data?.campaigns ?? campaignClients.data?.data ?? campaignClients.data,
      totalCount: campaignClients.data?.data?.totalCount ?? 0,
      isLoading: campaignClients.isLoading,
      isSuccess: campaignClients.isSuccess,
      isError: campaignClients.isError,
      error: campaignClients.error,
    },
    clientCampaignInsightsDomain: {
      data: clientCampaignInsights.data,
      isLoading: clientCampaignInsights.isLoading,
      isSuccess: clientCampaignInsights.isSuccess,
      isError: clientCampaignInsights.isError,
      error: clientCampaignInsights.error,
    },
    campaignsDomain: {
      data: campaigns.data?.data?.clients ?? campaigns.data?.data ?? campaigns.data,
      isLoading: campaigns.isLoading,
      isSuccess: campaigns.isSuccess,
      isError: campaigns.isError,
      error: campaigns.error,
    },
    sheetsTemplatesDomain: {
      data: sheetsTemplates.data?.data,
      isLoading: sheetsTemplates.isLoading,
      isSuccess: sheetsTemplates.isSuccess,
      isError: sheetsTemplates.isError,
      error: sheetsTemplates.error,
    },
    singleClientDomain: {
      data: singleClient.data?.data,
      isLoading: singleClient.isLoading,
      isSuccess: singleClient.isSuccess,
      isError: singleClient.isError,
      error: singleClient.error,
    },
  }), [
    campaignSheet.data, campaignSheet.isLoading, campaignSheet.isSuccess, campaignSheet.isError, campaignSheet.error,
    campaignClients.data, campaignClients.isLoading, campaignClients.isSuccess, campaignClients.isError, campaignClients.error,
    clientCampaignInsights.data, clientCampaignInsights.isLoading, clientCampaignInsights.isSuccess, clientCampaignInsights.isError, clientCampaignInsights.error,
    campaigns.data, campaigns.isLoading, campaigns.isSuccess, campaigns.isError, campaigns.error,
    sheetsTemplates.data, sheetsTemplates.isLoading, sheetsTemplates.isSuccess, sheetsTemplates.isError, sheetsTemplates.error,
    singleClient.data, singleClient.isLoading, singleClient.isSuccess, singleClient.isError, singleClient.error,
  ]);
};

export const useCampaignMutations = () => {
  return {
    updateCampaignKeywordsMutation: useMutateData<any, { clientId: string; table: string; isSecondary: boolean }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE_KEYWORDS,
      mutationKey: ["admin-update-campaign-keywords"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignSheetMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE,
      mutationKey: ["admin-update-campaign-sheet"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteCampaignSheetMutation: useMutateData<any, { id: string | number; entity: string; table: string; action: "soft-delete" }>({
      method: "PATCH",
      url: endpoints.ADMIN_CAMPAIGN_SHEET,
      mutationKey: ["admin-delete-campaign-sheet"],
      onSuccess: () => {},
      onError: () => {},
    }),
    overrideIncrementInputsMutation: useMutateData<any, { type: string; table: string; clientId: string | number; env: string }>({
      method: "PUT",
      url: endpoints.ADMIN_CAMPAIGN_SHEET,
      mutationKey: ["admin-override-increment-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    campaignApplicationsCountMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_COUNT_APPLICATIONS,
      mutationKey: ["admin-campaign-applications-count"],
      onSuccess: () => {},
      onError: () => {},
    }),
    toggleCampaignAggregatorMutation: useMutateData<any, { clientId: number; jobSite: string }>({
      method: "PUT",
      url: endpoints.ADMIN_CAMPAIGN_COUNT_APPLICATIONS,
      mutationKey: ["admin-toggle-campaign-aggregator"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignSheetBulkMutation: useMutateData<any, { table: string; data: any[] }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE}?table=${params?.table}`,
      mutationKey: ["admin-update-campaign-sheet-bulk"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignSheetSingleMutation: useMutateData<any, { table: string; id: string | number; data: any }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE_SINGLE}?table=${params?.table}&id=${params?.id}`,
      mutationKey: ["admin-update-campaign-sheet-single"],
      onSuccess: () => {},
      onError: () => {},
    }),
    flightCampaignMutation: useMutateData<any, { clientId: string }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_ACCOUNT_ACTION}?action=flight&clientId=${params?.clientId}`,
      mutationKey: ["admin-flight-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignMutation: useMutateData<any, { clientId: string | number; data: any }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.clientId}`,
      mutationKey: ["admin-update-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    getCampaignClientMutation: useMutateData<any, { clientId: string }>({
      method: "GET",
      url: (params) => `/api/v1/campaigns/clients/${params?.clientId}`,
      mutationKey: ["admin-get-campaign-client"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.id}/soft-delete`,
      mutationKey: ["admin-delete-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    restoreCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.id}/restore`,
      mutationKey: ["admin-restore-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    permanentDeleteCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "DELETE",
      url: (params) => `/api/v1/campaigns/clients/${params?.id}/permanent`,
      mutationKey: ["admin-permanent-delete-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    generateKeywordRoleTitlesMutation: useMutateData<any, { id: string; keywords?: boolean; roleTitles?: boolean; increment?: boolean; existing?: any }>({
      method: "POST",
      url: "/api/v1/admin/generateKeywordRoleTitles",
      mutationKey: ["admin-generate-keyword-role-titles"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateKeywordsMutation: useMutateData<any, { clientId: string; approvedJobs: string[]; declined?: boolean }>({
      method: "POST",
      url: (params) => `/api/v1/admin/update-keywords${params?.declined ? "?declined=true" : ""}`,
      mutationKey: ["admin-update-keywords-manual"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateTitlesMutation: useMutateData<any, { clientId: string; approvedJobs: string[]; declined?: boolean }>({
      method: "POST",
      url: (params) => `/api/v1/admin/update-titles${params?.declined ? "?declined=true" : ""}`,
      mutationKey: ["admin-update-titles-manual"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateSheetsMutation: useMutateData<any, { id: string }>({
      method: "PATCH",
      url: endpoints.SHEETS_API,
      mutationKey: ["admin-update-sheets"],
      onSuccess: () => {},
      onError: () => {},
    }),

    // User Campaign Management Endpoint Call by Temidayo
    extractCampaignJobsMutation: useMutateData<any, { clientId: string, joblink: string, pageContent: string }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_JOBS_EXTRACT,
      mutationKey: ["admin-campaign-jobs-extract"],
      onSuccess: () => {},
      onError: () => {},
    }),
    saveCampaignJobsMutation: useMutateData<any, { clientId: string, joblink: string, jobData: any }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_JOBS_SAVE,
      mutationKey: ["admin-campaign-jobs-save"],
      onSuccess: () => {},
      onError: () => {},
    }),
    generateKeywordsFromResumeMutation: useMutateData<any, { id: string, keywords?: boolean, roleTitles?: boolean, increment?: boolean, existing?: any }>({
      method: "POST",
      url: endpoints.ADMIN_UPLOADS_GENERATE_KEYWORDS,
      mutationKey: ["admin-generate-keywords-resume"],
      onSuccess: () => {},
      onError: () => {},
    }),
    addToClientQueueMutation: useMutateData<any, { queue: string; environment: string; aggregator: string; clientId: string; input?: string }>({
      method: "POST",
      url: (params) => `/api/v1/campaigns/queue/${params?.queue}`,
      mutationKey: ["admin-campaign-add-queue"],
      onSuccess: () => {},
      onError: () => {},
    }),
    syncAggregatorsMutation: useMutateData<any, { clientId: string; syncType: "override" | "increment"; fromStage: boolean }>({
      method: "POST",
      url: "/api/v1/campaigns/sheets/aggregators/sync",
      mutationKey: ["admin-campaign-sync-aggregators"],
      onSuccess: () => {},
      onError: () => {},
    }),
  };
};
