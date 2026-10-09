"use client";

import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { DOCUMENT_CATEGORIES, SelectedFile } from "./DocumentUploadFields";

export type UploadFormValues = Record<string, SelectedFile[]>;

export const INITIAL_UPLOAD_VALUES: UploadFormValues =
  DOCUMENT_CATEGORIES.reduce(
    (values, category) => ({ ...values, [category.name]: [] }),
    {} as UploadFormValues,
  );

export const countSelectedFiles = (values: UploadFormValues): number =>
  DOCUMENT_CATEGORIES.reduce(
    (count, { name }) => count + (values[name]?.length ?? 0),
    0,
  );

function getFriendlyUploadErrorMessage(error: any): string {
  const rawMessage = error?.response?.data?.message || error?.message || "";
  const status = error?.response?.status;

  // Catch database errors, enum errors, SQL errors, or 500 internal server errors
  const isTechnicalError =
    status === 500 ||
    /enum|sequelize|database|syntax error|relation|column|internal server error|invalid input value|foreign key|constraint/i.test(
      rawMessage,
    );

  if (isTechnicalError) {
    return "Unable to upload document(s) due to a server error. Please try again later or contact support.";
  }

  // Network / connection errors
  if (/network error|timeout|econnreset|econnrefused/i.test(rawMessage)) {
    return "Network error. Please check your connection and try again.";
  }

  // User-facing validation messages from backend
  if (rawMessage && typeof rawMessage === "string" && rawMessage.length < 150) {
    return rawMessage;
  }

  return "An error occurred while uploading the document(s). Please try again.";
}

/**
 * Shared submit logic for the client documents upload modal, used by both the
 * admin and assistant screens.
 *
 * Resume and cover letters go to the document review endpoint; the support
 * categories (role titles, images, spreadsheets) go to client-support-documents.
 */
export const useDocumentUploadSubmit = (
  userId: string,
  onUploaded?: () => void,
) => {
  const queryClient = useQueryClient();
  const {
    uploadDocumentsMutation,
    submitDocumentReviewMutation,
    uploadClientSupportDocumentsMutation,
  } = useAdminMutations();

  const isUploading =
    uploadDocumentsMutation.isPending ||
    submitDocumentReviewMutation.isPending ||
    uploadClientSupportDocumentsMutation.isPending;

  const handleSubmit = async (values: UploadFormValues) => {
    const buildFormData = (
      categories: typeof DOCUMENT_CATEGORIES,
      idField: string,
    ) => {
      const formData = new FormData();
      formData.append(idField, userId);
      let count = 0;

      categories.forEach(({ name }) => {
        values[name]?.forEach((selected) => {
          formData.append(name, selected.file);
          count += 1;
        });
      });

      return count > 0 ? formData : null;
    };

    const reviewForm = buildFormData(
      DOCUMENT_CATEGORIES.filter((c) => !c.isSupportDocument),
      "userId",
    );
    const supportForm = buildFormData(
      DOCUMENT_CATEGORIES.filter((c) => c.isSupportDocument),
      "clientId",
    );

    try {
      if (reviewForm) {
        await submitDocumentReviewMutation.mutateAsync(reviewForm);
      }
      if (supportForm) {
        await uploadClientSupportDocumentsMutation.mutateAsync(supportForm);
      }

      toast.success("Document uploaded and reviewed successfully");
      onUploaded?.();
      // "admin-user-documents" is the resume/cover-letter table's actual
      // query key (userDocumentsDomain in useUsersQueries) — not
      // "admin-documents", which nothing in the app renders.
      queryClient.invalidateQueries({
        queryKey: ["admin-user-documents", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["client-support-documents", userId],
      });
    } catch (error: any) {
      toast.error(getFriendlyUploadErrorMessage(error));
    }
  };

  return { handleSubmit, isUploading };
};
