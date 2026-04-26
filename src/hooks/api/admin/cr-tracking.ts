import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const normalizeCrRow = (row: any) => {
  const primaryId = row?._id || row?.id;
  return {
    ...row,
    _id: primaryId,
    id: row?.changeRequestId || row?.id,
    crStatus: row?.crStatus || row?.status,
    status: row?.status || row?.crStatus,
    owner: typeof row?.owner === "object" ? row?.owner?.name : row?.owner,
    NIL:
      row?.NIL ||
      (typeof row?.nil === "object" ? row?.nil?.name : row?.nil),
    nominatedDeveloper:
      typeof row?.nominatedDeveloper === "object"
        ? row?.nominatedDeveloper?.name
        : row?.nominatedDeveloper,
    ownerEmail:
      row?.ownerEmail ||
      (typeof row?.owner === "object" ? row?.owner?.email : undefined),
    nilEmail:
      row?.nilEmail ||
      (typeof row?.nil === "object" ? row?.nil?.email : undefined),
    nominatedDeveloperEmail:
      row?.nominatedDeveloperEmail ||
      (typeof row?.nominatedDeveloper === "object"
        ? row?.nominatedDeveloper?.email
        : undefined),
    impactedProvider: row?.impactedProvider || row?.impactedProdiver || [],
    impactedProdiver: row?.impactedProdiver || row?.impactedProvider || [],
  };
};

const normalizeEotRow = (row: any) => ({
  ...row,
  _id: row?._id || row?.id,
});

// ────────────────────────────────────────────────────
// Query Keys  (centralised so invalidation is consistent)
// ────────────────────────────────────────────────────
export const CR_QUERY_KEYS = {
  crData: (dataState: string) => ["admin-cr-tracking-data", dataState],
  eotData: (dataState: string) => ["admin-cr-tracking-eot-data", dataState],
  options: ["admin-cr-tracking-options"],
  history: (customId: string, id: string, page: number) => [
    "admin-cr-tracking-history",
    customId,
    id,
    page,
  ],
  eotCRs: ["admin-cr-tracking-eot-crs"],
  eotOwners: ["admin-cr-tracking-eot-owners"],
};

// ────────────────────────────────────────────────────
// Queries
// ────────────────────────────────────────────────────
export const useCRTrackingQueries = (options: AdminQueriesOptions) => {
  const {
    fetchCRTrackingData = false,
    crTrackingDataState = "active",
    fetchEOTData = false,
    fetchCRTrackingOptions = false,
    fetchCRHistory = false,
    crHistoryCustomId = "",
    crHistoryId = "",
    crHistoryPage = 1,
    fetchEOTCRs = false,
    fetchEOTOwners = false,
  } = options;

  const crData = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CR_TRACKING}?${crTrackingDataState === "active" ? "active=true" : "recycle=true"}`,
    queryKey: CR_QUERY_KEYS.crData(crTrackingDataState),
    enabled: fetchCRTrackingData,
  });

  const eotData = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CR_TRACKING_EOT}?${crTrackingDataState === "active" ? "active=true" : "recycle=true"}`,
    queryKey: CR_QUERY_KEYS.eotData(crTrackingDataState),
    enabled: fetchEOTData,
  });

  const crOptions = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=all`,
    queryKey: CR_QUERY_KEYS.options,
    enabled: fetchCRTrackingOptions,
    staleEarly: true,
  });

  const crHistory = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CR_TRACKING_HISTORY}?customId=${crHistoryCustomId}&id=${crHistoryId}&page=${crHistoryPage}`,
    queryKey: CR_QUERY_KEYS.history(
      crHistoryCustomId,
      crHistoryId,
      crHistoryPage
    ),
    enabled: fetchCRHistory && !!crHistoryCustomId && !!crHistoryId,
    forceRefresh: true,
  });

  const eotCRs = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CR_TRACKING_EOT}?variance=CRs`,
    queryKey: CR_QUERY_KEYS.eotCRs,
    enabled: fetchEOTCRs,
    staleEarly: true,
  });

  const eotOwners = useFetchData<any>({
    method: "GET",
    url: `${endpoints.ADMIN_CR_TRACKING_EOT}?variance=owners`,
    queryKey: CR_QUERY_KEYS.eotOwners,
    enabled: fetchEOTOwners,
    staleEarly: true,
  });

  return useMemo(
    () => ({
      crDataDomain: {
        data: (crData.data?.data || []).map(normalizeCrRow),
        isLoading: crData.isLoading,
        isSuccess: crData.isSuccess,
        refetch: crData.refetch,
      },
      eotDataDomain: {
        data: (eotData.data?.data || []).map(normalizeEotRow),
        isLoading: eotData.isLoading,
        isSuccess: eotData.isSuccess,
        refetch: eotData.refetch,
      },
      crOptionsDomain: {
        data: crOptions.data?.data,
        isLoading: crOptions.isLoading,
        isSuccess: crOptions.isSuccess,
      },
      crHistoryDomain: {
        data: crHistory.data?.data,
        isLoading: crHistory.isLoading,
        isSuccess: crHistory.isSuccess,
      },
      eotCRsDomain: {
        data: (eotCRs.data?.data || []).map(normalizeEotRow),
        isLoading: eotCRs.isLoading,
      },
      eotOwnersDomain: {
        data: (eotOwners.data?.data || []).map(normalizeEotRow),
        isLoading: eotOwners.isLoading,
      },
    }),
    [crData, eotData, crOptions, crHistory, eotCRs, eotOwners]
  );
};

// ────────────────────────────────────────────────────
// Mutations
// ────────────────────────────────────────────────────
export const useCRTrackingMutations = () => {
  const queryClient = useQueryClient();

  const invalidateCRData = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-cr-tracking-data"] });
  };

  const invalidateEOTData = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-cr-tracking-eot-data"] });
  };

  const invalidateOptions = () => {
    queryClient.invalidateQueries({ queryKey: CR_QUERY_KEYS.options });
  };

  // ── Create CR ──
  const createMutation = useMutateData<any, any>({
    method: "POST",
    url: endpoints.ADMIN_CR_TRACKING,
    mutationKey: ["admin-create-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR Tracking entry created successfully!");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create CR Tracking entry.");
    },
  });

  // ── Update CR ──
  const updateMutation = useMutateData<any, any>({
    method: "PUT",
    url: (data) => `${endpoints.ADMIN_CR_TRACKING}?id=${data._id}`,
    mutationKey: ["admin-update-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR updated successfully.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update CR.");
    },
  });

  // ── Soft Delete (move to recycle bin) ──
  const softDeleteMutation = useMutateData<any, { id: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_CR_TRACKING}?id=${data.id}`,
    mutationKey: ["admin-soft-delete-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR moved to recycle bin.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete CR.");
    },
  });

  // ── Permanent Delete ──
  const permanentDeleteMutation = useMutateData<any, { id: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_CR_TRACKING_DELETE}?id=${data.id}`,
    mutationKey: ["admin-permanent-delete-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR deleted permanently.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to permanently delete CR.");
    },
  });

  // ── Restore CR ──
  const restoreMutation = useMutateData<any, { id: string }>({
    method: "POST",
    url: (data) => `${endpoints.ADMIN_CR_TRACKING_RESTORE}/?id=${data.id}`,
    mutationKey: ["admin-restore-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR restored successfully.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to restore CR.");
    },
  });

  // ── Upgrade CR ──
  const upgradeMutation = useMutateData<any, { id: string }>({
    method: "PUT",
    url: (data) =>
      `${endpoints.ADMIN_CR_TRACKING_MODIFY}?id=${data.id}&downgradeOrUpgrade=upgrade`,
    mutationKey: ["admin-upgrade-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR upgraded successfully.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to upgrade CR.");
    },
  });

  // ── Downgrade CR ──
  const downgradeMutation = useMutateData<any, { id: string }>({
    method: "PUT",
    url: (data) =>
      `${endpoints.ADMIN_CR_TRACKING_MODIFY}?id=${data.id}&downgradeOrUpgrade=downgrade`,
    mutationKey: ["admin-downgrade-cr-tracking"],
    onSuccess: (res) => {
      toast.success(res.message || "CR downgraded successfully.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to downgrade CR.");
    },
  });

  // ── Notify NIL ──
  const notifyNilMutation = useMutateData<
    any,
    { id: string; slackId: string; name: string; email: string }
  >({
    method: "POST",
    url: endpoints.ADMIN_CR_TRACKING_NOTIFY_NIL,
    mutationKey: ["admin-notify-nil"],
    onSuccess: (res) => {
      toast.success(res.message || "NIL notified successfully.");
      invalidateCRData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to notify NIL.");
    },
  });

  // ── Create EOT Request ──
  const createEOTMutation = useMutateData<any, any>({
    method: "POST",
    url: endpoints.ADMIN_CR_TRACKING_EOT,
    mutationKey: ["admin-create-eot-request"],
    onSuccess: (res) => {
      toast.success(
        res.message || "Extension of time request sent successfully!"
      );
      invalidateEOTData();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create EOT request.");
    },
  });

  // ── Options CRUD ──
  const addOptionMutation = useMutateData<any, { type: string; data: any }>({
    method: "POST",
    url: (params) =>
      `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${params.type}`,
    mutationKey: ["admin-add-cr-option"],
    onSuccess: (res) => {
      toast.success(res.message || "Option added successfully.");
      invalidateOptions();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add option.");
    },
  });

  const updateOptionMutation = useMutateData<
    any,
    { type: string; id: string; data: any }
  >({
    method: "PUT",
    url: (params) =>
      `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${params.type}&id=${params.id}`,
    mutationKey: ["admin-update-cr-option"],
    onSuccess: (res) => {
      toast.success(res.message || "Option updated successfully.");
      invalidateOptions();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update option.");
    },
  });

  const deleteOptionMutation = useMutateData<
    any,
    { type: string; id: string }
  >({
    method: "DELETE",
    url: (params) =>
      `${endpoints.ADMIN_CR_TRACKING_OPTIONS}?type=${params.type}&id=${params.id}`,
    mutationKey: ["admin-delete-cr-option"],
    onSuccess: (res) => {
      toast.success(res.message || "Option deleted successfully.");
      invalidateOptions();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete option.");
    },
  });

  // ── Document Upload ──
  const uploadDocumentMutation = useMutateData<any, FormData>({
    method: "POST",
    url: endpoints.ADMIN_CR_TRACKING_DOCUMENT_UPLOAD,
    mutationKey: ["admin-cr-upload-document"],
    headers: { "Content-Type": "multipart/form-data" },
    onSuccess: () => {},
    onError: (err) => {
      toast.error(err.message || "Failed to upload file.");
    },
  });

  // ── Delete uploaded document ──
  const deleteDocumentMutation = useMutateData<any, { url: string }>({
    method: "DELETE",
    url: endpoints.ADMIN_CR_TRACKING_DOCUMENT_UPLOAD,
    mutationKey: ["admin-cr-delete-document"],
    onSuccess: () => {},
    onError: (err) => {
      toast.error(err.message || "Failed to delete file.");
    },
  });

  // ── Validate & Upload URL ──
  const validateUrlMutation = useMutateData<any, { url: string }>({
    method: "POST",
    url: endpoints.ADMIN_CR_TRACKING_VALIDATE_URL,
    mutationKey: ["admin-cr-validate-url"],
    onSuccess: () => {},
    onError: (err) => {
      toast.error(err.message || "Failed to validate URL.");
    },
  });

  return {
    createMutation,
    updateMutation,
    softDeleteMutation,
    permanentDeleteMutation,
    restoreMutation,
    upgradeMutation,
    downgradeMutation,
    notifyNilMutation,
    createEOTMutation,
    addOptionMutation,
    updateOptionMutation,
    deleteOptionMutation,
    uploadDocumentMutation,
    deleteDocumentMutation,
    validateUrlMutation,
  };
};
