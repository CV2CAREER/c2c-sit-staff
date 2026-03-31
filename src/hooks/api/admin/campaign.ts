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
    userId = "",
    campaignOptions = {},
    campaignActive = "true",
    campaignSearch = "",
  } = options;

  const campaignSheet = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CAMPAIGN_SHEET,
    params: { userId, ...campaignOptions },
    queryKey: ["admin-campaign-sheet", userId, campaignOptions],
    enabled: fetchCampaignSheet && !!userId,
  });

  const campaignClients = useFetchData<any[]>({
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
    params: { active: campaignActive, q: campaignSearch },
    queryKey: ["admin-campaigns", campaignActive, campaignSearch],
    enabled: fetchCampaigns,
  });

  const sheetsTemplates = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_SHEETS_TEMPLATES,
    queryKey: ["admin-sheets-templates"],
    enabled: fetchSheetsTemplates,
  });

  return useMemo(() => ({
    campaignSheetDomain: {
      data: campaignSheet.data?.data,
      isLoading: campaignSheet.isLoading,
      isSuccess: campaignSheet.isSuccess,
      isError: campaignSheet.isError,
      error: campaignSheet.error,
    },
    campaignClientsDomain: {
      data: campaignClients.data,
      isLoading: campaignClients.isLoading,
      isSuccess: campaignClients.isSuccess,
      isError: campaignClients.isError,
      error: campaignClients.error,
    },
    clientCampaignInsightsDomain: {
      data: clientCampaignInsights.data?.data,
      isLoading: clientCampaignInsights.isLoading,
      isSuccess: clientCampaignInsights.isSuccess,
      isError: clientCampaignInsights.isError,
      error: clientCampaignInsights.error,
    },
    campaignsDomain: {
      data: campaigns.data?.data,
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
  }), [
    campaignSheet, campaignClients, clientCampaignInsights, campaigns, sheetsTemplates
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
    deleteCampaignSheetMutation: useMutateData<any, { table: string; clientId: string | number }>({
      method: "GET", // Note: legacy used GET for delete?
      url: endpoints.ADMIN_CAMPAIGN_SHEET_DELETE,
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
    toggleCampaignAggregatorMutation: useMutateData<any, { MySQLClientId: number; jobSite: string }>({
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
    flightCampaignMutation: useMutateData<any, { clientId: string | number }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_ACCOUNT_ACTION}?action=flight&clientId=${params?.clientId}`,
      mutationKey: ["admin-flight-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateCampaignMutation: useMutateData<any, { id: string | number; updateBy?: string; updatedByFName?: string; data: any }>({
      method: "PATCH",
      url: (params) => {
        let url = `${endpoints.ADMIN_CAMPAIGN}?id=${params?.id}`;
        if (params?.updateBy) url += `&updateBy=${params.updateBy}`;
        if (params?.updatedByFName) url += `&updatedByFName=${params.updatedByFName}`;
        return url;
      },
      mutationKey: ["admin-update-campaign"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "DELETE",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN}?id=${params?.id}`,
      mutationKey: ["admin-delete-campaign"],
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
  };
};
