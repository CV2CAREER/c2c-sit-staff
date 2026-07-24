import { useFetchData, useMutateData } from "../../useApi";
import {
  JOBSITE_CREDENTIALS_BASE,
  JOBSITE_CREDENTIAL_MANUAL,
  JOBSITE_CREDENTIAL_BY_CLIENT,
  JOBSITE_CREDENTIAL_ACCEPT,
  JOBSITE_CREDENTIAL_TEST_EMAIL,
  JOBSITE_CREDENTIAL_APPROVE,
  JOBSITE_CREDENTIAL_UNAPPROVE,
  JOBSITE_CREDENTIAL_REJECT,
  JOBSITE_CREDENTIAL_REVEAL_PASSWORD,
  JOBSITE_CREDENTIAL_EDIT,
  JOBSITE_CREDENTIAL_IMPORT_CSV,
} from "@/constants/apiEndpoints/jobsite-credential.endpoint";
import {
  JobsiteCredential,
  JobsiteCredentialRejectionReason,
  JobsiteCredentialCsvImportResult,
} from "@/types/jobsite-credential.types";
import { AdminQueriesOptions } from "./types";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

const JOBSITE_CREDENTIALS_QUERY_KEY = ["admin-jobsite-credentials"];

// Polled rather than fetch-once — an admin/staff tab has no way to know
// a client (or another staff member, in a different browser/tab) just
// changed a credential's status, since nothing pushes live updates. 10s
// keeps the Management table and client-detail card close to real-time
// without hammering the API; pauses automatically when the tab isn't
// focused (see refetchIntervalInBackground: false in useApi.ts).
const JOBSITE_CREDENTIAL_POLL_INTERVAL_MS = 10_000;

export const useJobsiteCredentialQueries = (options: AdminQueriesOptions) => {
  const { data: jobsiteCredentials, isLoading: isJobsiteCredentialsLoading } =
    useFetchData<JobsiteCredential[]>({
      method: "GET",
      url: JOBSITE_CREDENTIALS_BASE,
      queryKey: JOBSITE_CREDENTIALS_QUERY_KEY,
      enabled: !!options.fetchJobsiteCredentials,
      refetchInterval: options.fetchJobsiteCredentials
        ? JOBSITE_CREDENTIAL_POLL_INTERVAL_MS
        : false,
    });

  const {
    data: clientJobsiteCredential,
    isLoading: isClientJobsiteCredentialLoading,
  } = useFetchData<JobsiteCredential | null>({
    method: "GET",
    url: options.userId ? JOBSITE_CREDENTIAL_BY_CLIENT(options.userId) : "",
    queryKey: ["admin-client-jobsite-credential", options.userId],
    enabled: !!options.fetchClientJobsiteCredential && !!options.userId,
    refetchInterval:
      options.fetchClientJobsiteCredential && options.userId
        ? JOBSITE_CREDENTIAL_POLL_INTERVAL_MS
        : false,
  });

  return {
    jobsiteCredentials: jobsiteCredentials?.data || [],
    isJobsiteCredentialsLoading,
    clientJobsiteCredential: clientJobsiteCredential?.data ?? null,
    isClientJobsiteCredentialLoading,
  };
};

export const useJobsiteCredentialMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: JOBSITE_CREDENTIALS_QUERY_KEY });
    queryClient.invalidateQueries({
      queryKey: ["admin-client-jobsite-credential"],
    });
  };

  const {
    mutate: addJobsiteCredentialManually,
    isPending: isAddingCredential,
  } = useMutateData<JobsiteCredential, { clientId: string; email: string }>({
    method: "POST",
    mutationKey: ["add-jobsite-credential-manually"],
    url: JOBSITE_CREDENTIAL_MANUAL,
    onSuccess: () => {
      toast.success("Credential added — pending forwarding and approval");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add credential");
    },
  });

  const { mutate: acceptJobsiteCredential, isPending: isAccepting } =
    useMutateData<JobsiteCredential, { id: string }>({
      method: "POST",
      mutationKey: ["accept-jobsite-credential"],
      url: (data) => JOBSITE_CREDENTIAL_ACCEPT(data.id),
      onSuccess: () => {
        toast.success("Credential accepted — client can no longer edit this email");
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to accept credential");
      },
    });

  const { mutate: sendTestEmail, isPending: isSendingTestEmail } =
    useMutateData<JobsiteCredential, { id: string }>({
      method: "POST",
      mutationKey: ["send-jobsite-credential-test-email"],
      url: (data) => JOBSITE_CREDENTIAL_TEST_EMAIL(data.id),
      onSuccess: () => {
        toast.success("Test email sent");
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to send test email");
      },
    });

  const { mutate: approveJobsiteCredential, isPending: isApproving } =
    useMutateData<JobsiteCredential, { id: string }>({
      method: "POST",
      mutationKey: ["approve-jobsite-credential"],
      url: (data) => JOBSITE_CREDENTIAL_APPROVE(data.id),
      onSuccess: () => {
        toast.success("Credential approved — now ACTIVE");
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to approve credential");
      },
    });

  const { mutate: unapproveJobsiteCredential, isPending: isUnapproving } =
    useMutateData<JobsiteCredential, { id: string }>({
      method: "POST",
      mutationKey: ["unapprove-jobsite-credential"],
      url: (data) => JOBSITE_CREDENTIAL_UNAPPROVE(data.id),
      onSuccess: () => {
        toast.success("Moved back a stage");
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to unapprove credential");
      },
    });

  const { mutate: rejectJobsiteCredential, isPending: isRejecting } =
    useMutateData<
      JobsiteCredential,
      { id: string; reason: JobsiteCredentialRejectionReason; note?: string }
    >({
      method: "POST",
      mutationKey: ["reject-jobsite-credential"],
      url: (data) => JOBSITE_CREDENTIAL_REJECT(data.id),
      onSuccess: () => {
        toast.success("Credential rejected");
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject credential");
      },
    });

  const {
    mutate: revealJobsiteCredentialPassword,
    isPending: isRevealingPassword,
  } = useMutateData<{ password: string | null }, { id: string }>({
    method: "POST",
    mutationKey: ["reveal-jobsite-credential-password"],
    url: (data) => JOBSITE_CREDENTIAL_REVEAL_PASSWORD(data.id),
    onSuccess: () => {
      // Password itself is read from the mutation result in the caller;
      // this only needs to exist to satisfy the required callback.
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reveal password");
    },
  });

  const { mutate: editJobsiteCredential, isPending: isEditing } =
    useMutateData<
      JobsiteCredential,
      { id: string; email?: string; generatedPassword?: string }
    >({
      method: "POST",
      mutationKey: ["edit-jobsite-credential"],
      url: (data) => JOBSITE_CREDENTIAL_EDIT(data.id),
      onSuccess: () => {
        toast.success("Credential updated");
        invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update credential");
      },
    });

  const {
    mutate: importJobsiteCredentialsCsv,
    isPending: isImportingCsv,
  } = useMutateData<JobsiteCredentialCsvImportResult, FormData>({
    method: "POST",
    mutationKey: ["import-jobsite-credentials-csv"],
    url: JOBSITE_CREDENTIAL_IMPORT_CSV,
    onSuccess: () => {
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import CSV");
    },
  });

  return {
    addJobsiteCredentialManually,
    isAddingCredential,
    editJobsiteCredential,
    isEditing,
    acceptJobsiteCredential,
    isAccepting,
    sendTestEmail,
    isSendingTestEmail,
    approveJobsiteCredential,
    isApproving,
    unapproveJobsiteCredential,
    isUnapproving,
    rejectJobsiteCredential,
    isRejecting,
    revealJobsiteCredentialPassword,
    isRevealingPassword,
    importJobsiteCredentialsCsv,
    isImportingCsv,
  };
};
