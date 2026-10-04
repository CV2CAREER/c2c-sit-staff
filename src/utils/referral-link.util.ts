/**
 * SPR-21-13-008 — one place that builds the customer's personal referral
 * link: the partner's own code when one exists, the email-based fallback
 * otherwise. Shared by referral.service.ts and the journey notify service so
 * the two can't drift apart.
 */
export function buildReferralLink(
  frontendUrl: string,
  email?: string | null,
  partnerCode?: string | null,
): string {
  return partnerCode
    ? `${frontendUrl}/register?ref=${partnerCode}`
    : `${frontendUrl}/register?ref=${email}-partner`;
}
