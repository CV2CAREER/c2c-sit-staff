import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { SlackQueueResponse, ResourceMode, UpdateResourcePayload } from "@/types/admin.types";

export const useJobsiteQueries = (options: AdminQueriesOptions) => {
  const {
    fetchAggregators = false,
    fetchAggregatorsCount = false,
    fetchJobPreferences = false,
    fetchSlackQueue = false,
    fetchResources = false,
    fetchCountryInfo = false,
    fetchAggregatorLocations = false,
    fetchClientJobsite = false,
    aggregatorName = "",
    countryName = "",
    countryType = "region",
    slackQueue = "",
    resourceType = "",
    userId = "",
    startDate = "",
    endDate = "",
  } = options;

  const aggregators = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_JOBSITES,
    queryKey: ["admin-aggregators-list"],
    enabled: fetchAggregators,
  });

  const aggregatorsCount = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_AGGREGATORS}?count=true&startDate=${startDate}&endDate=${endDate}`,
    queryKey: ["admin-aggregators-count", startDate, endDate],
    enabled: fetchAggregatorsCount,
  });

  const jobPreferencesOptions = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_JOB_PREFERENCES,
    queryKey: ["admin-job-preferences"],
    params: { categories: ["Advertisers", "Classification", "Job Type", "Working Rights"] },
    enabled: fetchJobPreferences,
  });

  const slackQueueResult = useFetchData<SlackQueueResponse>({
    method: "GET",
    url: endpoints.ADMIN_SLACK_QUEUE,
    params: { queue: slackQueue },
    queryKey: ["admin-slack-queue", slackQueue],
    enabled: fetchSlackQueue && !!slackQueue,
  });

  const resourcesResult = useFetchData<ResourceMode>({
    method: "GET",
    url: endpoints.ADMIN_RESOURCES,
    params: { type: resourceType },
    queryKey: ["admin-resources", resourceType],
    enabled: fetchResources && !!resourceType,
  });

  const countryInfoData = useFetchData<any>({
    method: "GET",
    url: endpoints.COUNTRY_INFO,
    params: { country: countryName, type: countryType },
    queryKey: ["admin-country-info", countryName, countryType],
    enabled: fetchCountryInfo && !!countryName,
  });

  const aggregatorLocationsData = useFetchData<any>({
    method: "GET",
    url: endpoints.AGGREGATOR_LOCATIONS,
    params: { agg: aggregatorName },
    queryKey: ["admin-aggregator-locations", aggregatorName],
    enabled: fetchAggregatorLocations && !!aggregatorName,
  });

  const clientJobsite = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CLIENT_JOBSITE,
    queryKey: ["admin-client-jobsite", userId],
    params: { action: "retrieve", userId },
    enabled: fetchClientJobsite && !!userId,
  });

  return useMemo(() => ({
    aggregatorsDomain: {
      data: aggregators.data?.data,
      isLoading: aggregators.isLoading,
      isSuccess: aggregators.isSuccess,
      isError: aggregators.isError,
      error: aggregators.error,
    },
    aggregatorsCountDomain: {
      data: aggregatorsCount.data?.data,
      isLoading: aggregatorsCount.isLoading,
      isSuccess: aggregatorsCount.isSuccess,
      isError: aggregatorsCount.isError,
      error: aggregatorsCount.error,
    },
    jobPreferencesOptionsDomain: {
      data: jobPreferencesOptions.data?.data,
      isLoading: jobPreferencesOptions.isLoading,
      isSuccess: jobPreferencesOptions.isSuccess,
      isError: jobPreferencesOptions.isError,
      error: jobPreferencesOptions.error,
    },
    slackQueueDomain: {
      data: slackQueueResult.data?.data,
      isLoading: slackQueueResult.isLoading,
      isSuccess: slackQueueResult.isSuccess,
      isError: slackQueueResult.isError,
      error: slackQueueResult.error,
    },
    resourcesDomain: {
      data: resourcesResult.data?.data,
      isLoading: resourcesResult.isLoading,
      isSuccess: resourcesResult.isSuccess,
      isError: resourcesResult.isError,
      error: resourcesResult.error,
    },
    countryInfoDomain: {
      data: countryInfoData.data?.data,
      isLoading: countryInfoData.isLoading,
      isSuccess: countryInfoData.isSuccess,
      isError: countryInfoData.isError,
      error: countryInfoData.error,
    },
    aggregatorLocationsDomain: {
      data: aggregatorLocationsData.data?.data,
      isLoading: aggregatorLocationsData.isLoading,
      isSuccess: aggregatorLocationsData.isSuccess,
      isError: aggregatorLocationsData.isError,
      error: aggregatorLocationsData.error,
    },
    clientJobsiteDomain: {
      data: clientJobsite.data?.data,
      isLoading: clientJobsite.isLoading,
      isSuccess: clientJobsite.isSuccess,
      isError: clientJobsite.isError,
      error: clientJobsite.error,
    },
  }), [
    aggregators, aggregatorsCount, jobPreferencesOptions,
    slackQueueResult, resourcesResult, countryInfoData,
    aggregatorLocationsData, clientJobsite
  ]);
};

export const useJobsiteMutations = () => {
  const queryClient = useQueryClient();

  return {
    createAggregatorMutation: useMutateData<any, any>({
      method: "POST",
      url: endpoints.ADMIN_JOBSITES,
      mutationKey: ["admin-create-aggregator"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-aggregators-list"] });
      },
      onError: () => {},
    }),
    toggleAggregatorMutation: useMutateData<any, { aid: string; body: { isEnabled: boolean } }>({
      method: "PUT",
      url: (params) => `${endpoints.ADMIN_JOBSITES}?aid=${params?.aid}`,
      mutationKey: ["admin-toggle-aggregator"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-aggregators-list"] });
      },
      onError: () => {},
    }),
    slackQueueMutation: useMutation({
      mutationKey: ["admin-slack-queue-action"],
      mutationFn: async ({ action, email, queue }: { action: "POST" | "DELETE"; email: string; queue: string }) => {
        const url = endpoints.ADMIN_SLACK_QUEUE;
        if (action === "POST") {
          const res = await axiosInstance.post(url, { email, queue });
          return res.data;
        } else {
          const res = await axiosInstance.delete(url, { data: { email, queue } });
          return res.data;
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-slack-queue"] });
      },
    }),
    updateResourceMutation: useMutateData<any, UpdateResourcePayload>({
      method: "PUT",
      url: endpoints.ADMIN_RESOURCES,
      mutationKey: ["admin-update-resource"],
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-resources"] });
      },
      onError: () => {},
    }),
    generateJobsiteRowsMutation: useMutateData<any, { userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-generate-jobsite-rows"],
      onSuccess: () => {},
      onError: () => {},
    }),
    triggerJobsiteMutation: useMutateData<any, { aggId: string; userId: string }>({
      method: "GET",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-trigger-jobsite"],
      onSuccess: () => {},
      onError: () => {},
    }),
    deleteJobsiteMutation: useMutateData<any, { aggId: string; userId: string }>({
      method: "DELETE",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-delete-jobsite"],
      onSuccess: () => {},
      onError: () => {},
    }),
    updateJobsiteMutation: useMutateData<any, any>({
      method: "PUT",
      url: endpoints.ADMIN_CLIENT_JOBSITE,
      mutationKey: ["admin-update-jobsite"],
      onSuccess: () => {},
      onError: () => {},
    }),
  };
};
