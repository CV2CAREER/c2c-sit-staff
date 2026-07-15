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
      queryClient.invalidateQueries({ queryKey: ["admin-documents", userId] });
      queryClient.invalidateQueries({
        queryKey: ["client-support-documents", userId],
      });
    } catch (error: any) {
      // Surface the server's rejection reason (e.g. a CSV that failed
      // validation) instead of a generic message.
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "An error occurred while processing document";
      toast.error(message);
    }
  };

  return { handleSubmit, isUploading };
};
