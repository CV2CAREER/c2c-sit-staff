export const JOBSITE_CREDENTIALS_BASE = "/api/v1/jobsite-credentials";
export const JOBSITE_CREDENTIAL_MANUAL = "/api/v1/jobsite-credentials/manual";
export const JOBSITE_CREDENTIAL_BY_CLIENT = (clientId: string) =>
  `/api/v1/jobsite-credentials/client/${clientId}`;
export const JOBSITE_CREDENTIAL_ACCEPT = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/accept`;
export const JOBSITE_CREDENTIAL_TEST_EMAIL = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/test-email`;
export const JOBSITE_CREDENTIAL_APPROVE = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/approve`;
export const JOBSITE_CREDENTIAL_UNAPPROVE = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/unapprove`;
export const JOBSITE_CREDENTIAL_REJECT = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/reject`;
export const JOBSITE_CREDENTIAL_REVEAL_PASSWORD = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/reveal-password`;
export const JOBSITE_CREDENTIAL_EDIT = (id: string) =>
  `/api/v1/jobsite-credentials/${id}/edit`;
export const JOBSITE_CREDENTIAL_IMPORT_CSV =
  "/api/v1/jobsite-credentials/import-csv";
