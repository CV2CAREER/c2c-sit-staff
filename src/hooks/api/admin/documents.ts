import { useMemo } from "react";
import { useFetchData, useMutateData } from "../../useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { AdminQueriesOptions } from "./types";

export const useDocumentsQueries = (options: AdminQueriesOptions) => {
  const {
    fetchDocuments = false,
    fetchCvRevamp = false,
    fetchUserDocsAndPreferences = false,
    fetchClientSupportDocuments = false,
    userId = "",
    docId = "",
  } = options;

  const documents = useFetchData<any>({
    method: "GET",
    url: userId ? `${endpoints.ADMIN_DOCUMENTS}/user/${userId}` : `${endpoints.ADMIN_DOCUMENTS}/all`,
    queryKey: ["admin-documents", userId],
    params: { id: userId, fields: "all" },
    enabled: fetchDocuments && !!userId,
  });

  const cvRevamp = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_CV_REVAMP,
    params: { docId, userId },
    queryKey: ["admin-cv-revamp", docId, userId],
    enabled: fetchCvRevamp && (!!docId || !!userId),
  });

  const userDocsAndPreferences = useFetchData<any>({
    method: "GET",
    url: endpoints.ADMIN_DOCUMENT_REVIEW,
    params: { uid: userId },
    queryKey: ["admin-user-docs-and-preferences", userId],
    enabled: fetchUserDocsAndPreferences && !!userId,
  });

  // Role title CSVs, support images and support spreadsheets.
  const clientSupportDocuments = useFetchData<any>({
    method: "GET",
    url: userId
      ? endpoints.ADMIN_CLIENT_SUPPORT_DOCUMENTS_BY_CLIENT(userId)
      : "",
    queryKey: ["client-support-documents", userId],
    enabled: fetchClientSupportDocuments && !!userId,
  });

  return useMemo(() => ({
    clientSupportDocumentsDomain: {
      data: clientSupportDocuments.data?.data,
      isLoading: clientSupportDocuments.isLoading,
      isSuccess: clientSupportDocuments.isSuccess,
      isError: clientSupportDocuments.isError,
      error: clientSupportDocuments.error,
    },
    documentsDomain: {
      data: documents.data?.data,
      isLoading: documents.isLoading,
      isSuccess: documents.isSuccess,
      isError: documents.isError,
      error: documents.error,
    },
    cvRevampDomain: {
      data: cvRevamp.data?.data,
      isLoading: cvRevamp.isLoading,
      isSuccess: cvRevamp.isSuccess,
      isError: cvRevamp.isError,
      error: cvRevamp.error,
    },
    userDocsAndPreferencesDomain: {
      data: userDocsAndPreferences.data?.data,
      isLoading: userDocsAndPreferences.isLoading,
      isSuccess: userDocsAndPreferences.isSuccess,
      isError: userDocsAndPreferences.isError,
      error: userDocsAndPreferences.error,
    },
  }), [
    documents, cvRevamp, userDocsAndPreferences, clientSupportDocuments
  ]);
};

export const useDocumentsMutations = () => {
  return {
    uploadDocumentsMutation: useMutateData<any, FormData>({
      method: "POST",
      url: endpoints.ADMIN_UPLOAD_DOCUMENTS,
      mutationKey: ["admin-upload-documents"],
      onSuccess: () => {},
      onError: () => {},
    }),
    submitDocumentReviewMutation: useMutateData<any, FormData>({
      method: "POST",
      url: endpoints.ADMIN_DOCUMENT_REVIEW,
      mutationKey: ["admin-submit-document-review"],
      onSuccess: () => {},
      onError: () => {},
    }),
    uploadClientSupportDocumentsMutation: useMutateData<any, FormData>({
      method: "POST",
      url: endpoints.ADMIN_CLIENT_SUPPORT_DOCUMENTS,
      mutationKey: ["admin-upload-client-support-documents"],
      onSuccess: () => {},
      onError: () => {},
    }),
    reviewDocumentMutation: useMutateData<any, { ids: string[]; status: string }>({
      method: "PUT",
      url: endpoints.ADMIN_DOCUMENT_REVIEW,
      mutationKey: ["admin-review-document"],
      onSuccess: () => {},
      onError: () => {},
    }),
    getSignedUrlMutation: useMutateData<{ url: string }, { filePath: string }>({
      method: "GET",
      url: endpoints.ADMIN_DOCUMENTS_GET_SIGNED_URL,
      mutationKey: ["admin-get-signed-url"],
      paramKey: "filePath",
      onSuccess: () => {},
      onError: () => {},
    }),
    extractCvMutation: useMutateData<any, { userId: string }>({
      method: "POST",
      url: endpoints.ADMIN_USER_EXTRACT_CV,
      mutationKey: ["admin-extract-cv"],
      onSuccess: () => {},
      onError: () => {},
    }),
    extractCVDataPointsMutation: useMutateData<any, { id: string; cvType?: string }>({
      method: "POST",
      url: endpoints.ADMIN_EXTRACT_CV_DATA_POINTS,
      mutationKey: ["admin-extract-cv-data-points"],
      onSuccess: () => {},
      onError: () => {},
    }),
    cvRevampMutation: useMutateData<any, { cvId: string; create?: boolean; action?: string; docId?: string }>({
      method: "PATCH",
      url: endpoints.ADMIN_CV_REVAMP,
      mutationKey: ["admin-cv-revamp-action"],
      onSuccess: () => {},
      onError: () => {},
    }),
    fileUploadMutation: useMutateData<any, FormData>({
      method: "POST",
      url: "/api/v1/fileupload",
      mutationKey: ["admin-file-upload"],
      onSuccess: () => {},
      onError: () => {},
    }),
    reviewDocumentPostMutation: useMutateData<any, { files: any; uid: string }>({
      method: "POST",
      url: endpoints.ADMIN_DOCUMENT_REVIEW,
      mutationKey: ["admin-review-document-post"],
      paramKey: "uid",
      onSuccess: () => {},
      onError: () => {},
    }),
    adminUpdateClientDocumentsMutation: useMutateData<any, { id: string; body: any }>({
      method: "PUT",
      url: (params) => `${endpoints.ADMIN_DOCUMENT_REVIEW}?did=${params?.id}`,
      mutationKey: ["admin-update-client-documents"],
      onSuccess: () => {},
      onError: () => {},
    }),
    bulkDeleteUploadsMutation: useMutateData<
      { deletedCount: number; failedCount: number; failures: { id: string; reason: string }[] },
      { ids: string[] }
    >({
      method: "DELETE",
      url: endpoints.ADMIN_UPLOADS_BULK_DELETE,
      mutationKey: ["admin-bulk-delete-uploads"],
      onSuccess: () => {},
      onError: () => {},
    }),
    bulkDeleteClientSupportDocumentsMutation: useMutateData<
      { deletedCount: number; failedCount: number; failures: { id: string; reason: string }[] },
      { ids: string[] }
    >({
      method: "DELETE",
      url: endpoints.ADMIN_CLIENT_SUPPORT_DOCUMENTS_BULK_DELETE,
      mutationKey: ["admin-bulk-delete-client-support-documents"],
      onSuccess: () => {},
      onError: () => {},
    }),
  };
};
