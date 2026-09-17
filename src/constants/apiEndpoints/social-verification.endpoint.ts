export const SOCIAL_VERIFICATION_QUEUE = "/api/v1/admin/social-verifications";
export const SOCIAL_VERIFICATION_USER = (userId: string) =>
  `/api/v1/admin/social-verifications/user/${userId}`;
export const SOCIAL_VERIFICATION_APPROVE = (id: string) =>
  `/api/v1/admin/social-verifications/${id}/approve`;
export const SOCIAL_VERIFICATION_REJECT = (id: string) =>
  `/api/v1/admin/social-verifications/${id}`;
export const SOCIAL_VERIFICATION_EXEMPT = (userId: string) =>
  `/api/v1/admin/social-verifications/user/${userId}/exempt`;
