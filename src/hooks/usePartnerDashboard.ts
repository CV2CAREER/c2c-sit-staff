import { useMemo } from "react";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

type PartnerReferralUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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
  totalSuccessfulReferrals: number;
};

export function usePartnerDashboard(userId?: string | null) {
  const partnerReferrals = useFetchData<PartnerReferralResponse>({
    method: "GET",
    url: userId ? `${endpoints.ADMIN_REFERRAL}/user/${userId}` : endpoints.ADMIN_REFERRAL,
    queryKey: ["partner-dashboard-referrals", userId],
    enabled: Boolean(userId),
  });

  const stats = useMemo(() => {
    const referrals = partnerReferrals.data?.data?.referrals ?? [];
    const approvedReferrals = referrals.filter((referral) => referral.status === "APPROVED");
    const pendingReferrals = referrals.filter((referral) => referral.status === "PENDING");

    return {
      totalReferrals: partnerReferrals.data?.data?.totalReferrals ?? referrals.length,
      invitedReferrals: pendingReferrals.length,
      registeredReferrals: approvedReferrals.length,
      paidReferrals: approvedReferrals.length,
      // Inference from backend aggregated referral service, which values approved client referrals at 50 each.
      totalReferralEarnings: approvedReferrals.length * 50,
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
