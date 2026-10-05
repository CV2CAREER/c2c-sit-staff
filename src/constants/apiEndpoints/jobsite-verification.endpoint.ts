export const JOBSITE_VERIFICATION_QUEUE = "/api/v1/admin/jobsite-verifications";
export const JOBSITE_VERIFICATION_CLIENT = (clientId: string) =>
  `/api/v1/admin/jobsite-verifications/client/${clientId}`;
export const JOBSITE_VERIFICATION_VERIFY = (id: string) =>
  `/api/v1/admin/jobsite-verifications/${id}/verify`;
export const JOBSITE_VERIFICATION_REJECT = (id: string) =>
  `/api/v1/admin/jobsite-verifications/${id}/reject`;
export const JOBSITE_VERIFICATION_EXEMPT = "/api/v1/admin/jobsite-verifications/exempt";
export const JOBSITE_VERIFICATION_UNEXEMPT = "/api/v1/admin/jobsite-verifications/unexempt";
export const JOBSITE_VERIFICATION_REJECT_REASONS =
  "/api/v1/admin/jobsite-verifications/reject-reasons";
export const JOBSITE_VERIFICATION_CONFIGS =
  "/api/v1/admin/jobsite-verifications/configs";
export const JOBSITE_VERIFICATION_CONFIG_TOGGLE =
  "/api/v1/admin/jobsite-verifications/configs/toggle-required";
export const JOBSITE_VERIFICATION_CONFIG_VIDEO_GUIDE =
  "/api/v1/admin/jobsite-verifications/configs/video-guide";
export const JOBSITE_VERIFICATION_CONFIG_ADD =
  "/api/v1/admin/jobsite-verifications/configs/add";
