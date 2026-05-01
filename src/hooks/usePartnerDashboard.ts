import { useMemo } from "react";
import { useFetchData } from "@/hooks/useApi";
import * as partnerEndpoints from "@/constants/apiEndpoints/partner.endpoint";

type PartnerReferralUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  paymentStatus?: string;
  isUserSubscribed?: boolean;
};

type PartnerReferralRecord = {
  id: string;
  referrer: string;
  userId?: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  createdAt?: string;
  user?: PartnerReferralUser;
};

type PartnerReferralResponse = {
  referrals: PartnerReferralRecord[];
  totalReferrals: number;
  totalPaidReferrals: number;
  totalUnpaidReferrals: number;
  totalEarnings: number;
};

export function usePartnerDashboard(userId?: string | null) {
  const partnerReferrals = useFetchData<PartnerReferralResponse>({
    method: "GET",
    url: userId ? partnerEndpoints.PARTNER_USER_REFERRALS(userId) : partnerEndpoints.PARTNER_REFERRALS,
    queryKey: ["partner-dashboard-referrals", userId],
    enabled: Boolean(userId),
  });

  const stats = useMemo(() => {
    const response = partnerReferrals.data?.data;
    const referrals = response?.referrals ?? [];
    const approvedReferrals = referrals.filter((referral) => referral.status === "APPROVED");
    const pendingReferrals = referrals.filter((referral) => referral.status === "PENDING");

    return {
      totalReferrals: response?.totalReferrals ?? referrals.length,
      invitedReferrals: response?.totalUnpaidReferrals ?? pendingReferrals.length,
      registeredReferrals: approvedReferrals.length,
      paidReferrals: response?.totalPaidReferrals ?? approvedReferrals.length,
      // Use backend-calculated earnings, or compute locally as fallback ($50 per approved referral)
      totalReferralEarnings: response?.totalEarnings ?? (approvedReferrals.length * 50),
    };
  }, [partnerReferrals.data]);

  return {
    partnerDashboardDomain: {
      data: partnerReferrals.data?.data?.referrals ?? [],
      stats,
      isLoading: partnerReferrals.isLoading,
      isSuccess: partnerReferrals.isSuccess,
      isError: partnerReferrals.isError,
      error: partnerReferrals.error,
      refetch: partnerReferrals.refetch,
    },
  };
}
