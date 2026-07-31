import { useMemo } from "react";
import { AdminQueriesOptions } from "./admin/types";
import { useDashboardQueries } from "./admin/dashboard";
import { useUsersQueries, useUsersMutations } from "./admin/users";
import { useCampaignQueries, useCampaignMutations } from "./admin/campaign";
import { useJobsiteQueries, useJobsiteMutations } from "./admin/jobsite";
import { usePricingQueries, usePricingMutations } from "./admin/pricing";
import { useClientSampleQueries, useClientSampleMutations } from "./admin/client-sample";
import { useDocumentsQueries, useDocumentsMutations } from "./admin/documents";
import { useSystemQueries, useSystemMutations } from "./admin/system";
import { useUnsubscribedUsersQueries, useUnsubscribedUsersMutations } from "./admin/unsubscribed-users";
import { useChatbotQueries, useChatbotMutations } from "./admin/chatbot";
import { useJobsiteCredentialQueries, useJobsiteCredentialMutations } from "./admin/jobsite-credential";

export * from "./admin/types";

export const useAdminQueries = (options: AdminQueriesOptions) => {
  const dashboard = useDashboardQueries(options);
  const users = useUsersQueries(options);
  const campaign = useCampaignQueries(options);
  const jobsite = useJobsiteQueries(options);
  const pricing = usePricingQueries(options);
  const clientSample = useClientSampleQueries(options);
  const documents = useDocumentsQueries(options);
  const system = useSystemQueries(options);
  const unsubscribedUsers = useUnsubscribedUsersQueries(options);
  const chatbot = useChatbotQueries(options);
  const jobsiteCredential = useJobsiteCredentialQueries(options);

  return useMemo(() => ({
    ...dashboard,
    ...users,
    ...campaign,
    ...jobsite,
    ...pricing,
    ...clientSample,
    ...documents,
    ...system,
    ...chatbot,
    ...unsubscribedUsers,
    ...jobsiteCredential,
  }), [dashboard, users, campaign, jobsite, pricing, clientSample, documents, system, chatbot, unsubscribedUsers, jobsiteCredential]);
};

export const useAdminMutations = () => {
  const users = useUsersMutations();
  const campaign = useCampaignMutations();
  const jobsite = useJobsiteMutations();
  const pricing = usePricingMutations();
  const clientSample = useClientSampleMutations();
  const documents = useDocumentsMutations();
  const system = useSystemMutations();
  const chatbot = useChatbotMutations();

  return {
    ...users,
    ...campaign,
    ...jobsite,
    ...pricing,
    ...clientSample,
    ...documents,
    ...system,
    ...useUnsubscribedUsersMutations(),
    ...chatbot,
    ...useJobsiteCredentialMutations(),
  };
};
