// Partner Dashboard Endpoints
// Partner functionality is handled through the referral endpoints

export const PARTNER_REFERRALS = "/api/v1/referrals";
export const PARTNER_USER_REFERRALS = (userId: string) => `/api/v1/referrals/user/${userId}`;
export const PARTNER_APPROVE_REFERRAL = "/api/v1/referrals/approve";
export const PARTNER_DECLINE_REFERRAL = "/api/v1/referrals/decline";
