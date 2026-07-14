// Partner Dashboard Endpoints
// Partner functionality is handled through the referral endpoints

export const PARTNER_REFERRALS = "/api/v1/referrals";
export const PARTNER_USER_REFERRALS = (userId: string) => `/api/v1/referrals/user/${userId}`;
export const PARTNER_APPROVE_REFERRAL = "/api/v1/referrals/approve";
export const PARTNER_DECLINE_REFERRAL = "/api/v1/referrals/decline";
export const PARTNER_SUMMARY = "/api/v1/referrals/partner/summary";

// Partner Referral Actions
export const PARTNER_SEND_EMAIL = "/api/v1/referrals/send-email";
export const PARTNER_CLAIM = "/api/v1/referrals/claim";
export const PARTNER_BULK_UPLOAD = "/api/v1/referrals/bulk-upload";

// Partner Profile Update
export const PARTNER_UPDATE_PROFILE = "/api/v1/user/profile";