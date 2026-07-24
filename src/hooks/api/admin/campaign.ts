import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useCampaignQueries = (options: AdminQueriesOptions) => {
  const {
    fetchCampaignSheet = false,
    fetchCampaignClients = false,
    fetchClientCampaignInsights = false,
    fetchCampaigns = false,
    fetchSheetsTemplates = false,
    fetchSingleClient = false,
    fetchUserDocsAndPreferences = false,
    fetchClientApplications = false,
    fetchClientTours = false,
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
    params: { 
      active: campaignActive,
      q: campaignSearch 
    },
    queryKey: ["admin-fetch-campaign-clients", campaignActive, campaignSearch],
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
      active: campaignActive,
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

  const documentReview = useFetchData<any>({
    method: "GET",
    url: userId ? `/api/v1/campaigns/users/${userId}/document-review` : "",
    queryKey: ["admin-document-review", userId],
    enabled: fetchUserDocsAndPreferences && !!userId,
  });

  const clientApplications = useFetchData<any>({
    method: "GET",
    url: clientId ? endpoints.ADMIN_CLIENT_APPLICATIONS(clientId) : "",
    params: { credentialsTourId: campaignOptions.credentialsTourId },
    queryKey: ["admin-client-applications", clientId, campaignOptions.credentialsTourId],
    enabled: fetchClientApplications && !!clientId,
    staleEarly: true,
  });

  const clientTours = useFetchData<any>({
    method: "GET",
    url: clientId ? endpoints.ADMIN_CLIENT_TOURS(clientId) : "",
    queryKey: ["admin-client-tours", clientId],
    enabled: fetchClientTours && !!clientId,
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
    documentReviewDomain: {
      data: documentReview.data?.data,
      isLoading: documentReview.isLoading,
      isSuccess: documentReview.isSuccess,
      isError: documentReview.isError,
      error: documentReview.error,
    },
    clientApplicationsDomain: {
      data: clientApplications.data,
      isLoading: clientApplications.isLoading,
      isSuccess: clientApplications.isSuccess,
      isError: clientApplications.isError,
      error: clientApplications.error,
    },
    clientToursDomain: {
      data: clientTours.data?.data?.data ?? clientTours.data?.data ?? clientTours.data,
      isLoading: clientTours.isLoading,
      isSuccess: clientTours.isSuccess,
      isError: clientTours.isError,
      error: clientTours.error,
    },
  }), [
    campaignSheet.data, campaignSheet.isLoading, campaignSheet.isSuccess, campaignSheet.isError, campaignSheet.error,
    campaignClients.data, campaignClients.isLoading, campaignClients.isSuccess, campaignClients.isError, campaignClients.error,
    clientCampaignInsights.data, clientCampaignInsights.isLoading, clientCampaignInsights.isSuccess, clientCampaignInsights.isError, clientCampaignInsights.error,
    campaigns.data, campaigns.isLoading, campaigns.isSuccess, campaigns.isError, campaigns.error,
    sheetsTemplates.data, sheetsTemplates.isLoading, sheetsTemplates.isSuccess, sheetsTemplates.isError, sheetsTemplates.error,
    singleClient.data, singleClient.isLoading, singleClient.isSuccess, singleClient.isError, singleClient.error,
    documentReview.data, documentReview.isLoading, documentReview.isSuccess, documentReview.isError, documentReview.error,
    clientApplications.data, clientApplications.isLoading, clientApplications.isSuccess, clientApplications.isError, clientApplications.error,
    clientTours.data, clientTours.isLoading, clientTours.isSuccess, clientTours.isError, clientTours.error,
  ]);
};

export const useCampaignMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCampaignQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["admin-fetch-campaign-clients"] });
    queryClient.invalidateQueries({ queryKey: ["admin-campaign-sheet"] });
    queryClient.invalidateQueries({ queryKey: ["admin-single-campaign-client"] });
  };

  return {
    updateCampaignKeywordsMutation: useMutateData<any, { clientId: string; table: string; isSecondary: boolean }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE_KEYWORDS,
      mutationKey: ["admin-update-campaign-keywords"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Keywords updated successfully");
      },
      onError: () => {
        toast.error("Failed to update keywords");
      },
    }),
    updateCampaignSheetMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE,
      mutationKey: ["admin-update-campaign-sheet"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign sheet updated successfully");
      },
      onError: () => {
        toast.error("Failed to update campaign sheet");
      },
    }),
    deleteCampaignSheetMutation: useMutateData<any, { id: string | number; entity: string; table: string; action: "soft-delete" }>({
      method: "PATCH",
      url: endpoints.ADMIN_CAMPAIGN_SHEET,
      mutationKey: ["admin-delete-campaign-sheet"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign sheet deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete campaign sheet");
      },
    }),
    overrideIncrementInputsMutation: useMutateData<any, { type: string; table: string; clientId: string | number; env: string }>({
      method: "PUT",
      url: endpoints.ADMIN_CAMPAIGN_SHEET,
      mutationKey: ["admin-override-increment-campaign"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Stage update completed successfully");
      },
      onError: () => {
        toast.error("Failed to update stage");
      },
    }),
    campaignApplicationsCountMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_COUNT_APPLICATIONS,
      mutationKey: ["admin-campaign-applications-count"],
      onSuccess: () => {
        toast.success("Applications count updated");
      },
      onError: () => {
        toast.error("Failed to count applications");
      },
    }),
    toggleCampaignAggregatorMutation: useMutateData<any, { clientId: string | number; jobSite: string }>({
      method: "PATCH",
      url: endpoints.ADMIN_BOT_CONTROL,
      mutationKey: ["admin-toggle-campaign-aggregator"],
      onSuccess: () => {
        invalidateCampaignQueries();
      },
      onError: () => {
        toast.error("Failed to toggle aggregator");
      },
    }),
    getAggregatorsByUserMutation: useMutateData<any, { userId: string | number }>({
      method: "GET",
      url: (params) => endpoints.ADMIN_CAMPAIGN_AGGREGATORS_LIST(params?.userId),
      mutationKey: ["admin-get-aggregators-by-user"],
      onSuccess: () => {},
      onError: () => {
        toast.error("Failed to fetch aggregators");
      },
    }),
    updateCampaignSheetBulkMutation: useMutateData<any, { table: string; data: any[] }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE}?table=${params?.table}`,
      mutationKey: ["admin-update-campaign-sheet-bulk"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Bulk update completed successfully");
      },
      onError: () => {
        toast.error("Failed to perform bulk update");
      },
    }),
    updateCampaignSheetSingleMutation: useMutateData<any, { table: string; id: string | number; data: any }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_CAMPAIGN_SHEET_UPDATE_SINGLE}?table=${params?.table}&id=${params?.id}`,
      mutationKey: ["admin-update-campaign-sheet-single"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Record updated successfully");
      },
      onError: () => {
        toast.error("Failed to update record");
      },
    }),
    flightCampaignMutation: useMutateData<any, { clientId: string }>({
      method: "POST",
      url: (params) => `${endpoints.ADMIN_ACCOUNT_ACTION}?action=flight&clientId=${params?.clientId}`,
      mutationKey: ["admin-flight-campaign"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign launched successfully");
      },
      onError: () => {
        toast.error("Failed to launch campaign");
      },
    }),
    updateCampaignMutation: useMutateData<any, { clientId: string | number; data: any }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.clientId}`,
      mutationKey: ["admin-update-campaign"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign updated successfully");
      },
      onError: () => {
        toast.error("Failed to update campaign");
      },
    }),
    getCampaignClientMutation: useMutateData<any, { clientId: string }>({
      method: "GET",
      url: (params) => `/api/v1/campaigns/clients/${params?.clientId}`,
      mutationKey: ["admin-get-campaign-client"],
      onSuccess: () => {},
      onError: () => {
        toast.error("Failed to fetch client data");
      },
    }),
    deleteCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.id}/soft-delete`,
      mutationKey: ["admin-delete-campaign"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete campaign");
      },
    }),
    restoreCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.id}/restore`,
      mutationKey: ["admin-restore-campaign"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign restored successfully");
      },
      onError: () => {
        toast.error("Failed to restore campaign");
      },
    }),
    permanentDeleteCampaignMutation: useMutateData<any, { id: string | number }>({
      method: "DELETE",
      url: (params) => `/api/v1/campaigns/clients/${params?.id}/permanent`,
      mutationKey: ["admin-permanent-delete-campaign"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Campaign permanently deleted");
      },
      onError: () => {
        toast.error("Failed to permanently delete campaign");
      },
    }),
    toggleFlightStatusMutation: useMutateData<any, { clientId: string | number }>({
      method: "PATCH",
      url: (params) => `/api/v1/campaigns/clients/${params?.clientId}/toggle-flight`,
      mutationKey: ["admin-toggle-campaign-flight"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Flight status toggled successfully");
      },
      onError: () => {
        toast.error("Failed to toggle flight status");
      },
    }),
    generateKeywordRoleTitlesMutation: useMutateData<any, { id: string; keywords?: boolean; roleTitles?: boolean; increment?: boolean; existing?: any }>({
      method: "POST",
      url: "/api/v1/admin/generateKeywordRoleTitles",
      mutationKey: ["admin-generate-keyword-role-titles"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Keywords and role titles generated successfully");
      },
      onError: () => {
        toast.error("Failed to generate keywords and role titles");
      },
    }),
    updateKeywordsMutation: useMutateData<any, { clientId: string; approvedJobs: string[]; declined?: boolean }>({
      method: "POST",
      url: (params) => `/api/v1/admin/update-keywords${params?.declined ? "?declined=true" : ""}`,
      mutationKey: ["admin-update-keywords-manual"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Keywords updated successfully");
      },
      onError: () => {
        toast.error("Failed to update keywords");
      },
    }),
    updateTitlesMutation: useMutateData<any, { clientId: string; approvedJobs: string[]; declined?: boolean }>({
      method: "POST",
      url: (params) => `/api/v1/admin/update-titles${params?.declined ? "?declined=true" : ""}`,
      mutationKey: ["admin-update-titles-manual"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Titles updated successfully");
      },
      onError: () => {
        toast.error("Failed to update titles");
      },
    }),
    updateSheetsMutation: useMutateData<any, { id: string }>({
      method: "PATCH",
      url: endpoints.SHEETS_API,
      mutationKey: ["admin-update-sheets"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Sheets updated successfully");
      },
      onError: () => {
        toast.error("Failed to update sheets");
      },
    }),

    // User Campaign Management Endpoint Call by Temidayo
    extractCampaignJobsMutation: useMutateData<any, { clientId: string, joblink: string, pageContent: string }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_JOBS_EXTRACT,
      mutationKey: ["admin-campaign-jobs-extract"],
      onSuccess: () => {
      },
      onError: () => {
      },
    }),
    saveCampaignJobsMutation: useMutateData<any, { clientId: string, joblink: string, jobData: any }>({
      method: "POST",
      url: endpoints.ADMIN_CAMPAIGN_JOBS_SAVE,
      mutationKey: ["admin-campaign-jobs-save"],
      onSuccess: () => {
        invalidateCampaignQueries();
      },
      onError: () => {
      },
    }),
    generateKeywordsFromResumeMutation: useMutateData<any, { id: string, keywords?: boolean, roleTitles?: boolean, increment?: boolean, existing?: any }>({
      method: "POST",
      url: endpoints.ADMIN_UPLOADS_GENERATE_KEYWORDS,
      mutationKey: ["admin-generate-keywords-resume"],
      onSuccess: () => {
        toast.success("Keywords generated from resume successfully");
      },
      onError: () => {
        toast.error("Failed to generate keywords from resume");
      },
    }),
    addToClientQueueMutation: useMutateData<any, { queue: string; environment: string; aggregator: string; clientId: string; input?: string }>({
      method: "POST",
      url: (params) => `/api/v1/campaigns/queue/${params?.queue}`,
      mutationKey: ["admin-campaign-add-queue"],
      onSuccess: () => {
        toast.success("Added to queue successfully");
      },
      onError: () => {
        toast.error("Failed to add to queue");
      },
    }),
    syncAggregatorsMutation: useMutateData<any, { clientId: string; syncType: "override" | "increment"; fromStage: boolean }>({
      method: "POST",
      url: "/api/v1/campaigns/sheets/aggregators/sync",
      mutationKey: ["admin-campaign-sync-aggregators"],
      onSuccess: () => {
        invalidateCampaignQueries();
        toast.success("Aggregators synced successfully");
      },
      onError: () => {
        toast.error("Failed to sync aggregators");
      },
    }),
  };
};
