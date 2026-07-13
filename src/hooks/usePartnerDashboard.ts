import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFetchData } from "@/hooks/useApi";
import axiosInstance from "@/services/api-client";
import * as partnerEndpoints from "@/constants/apiEndpoints/partner.endpoint";
import toast from "react-hot-toast";

type PartnerReferredUser = {
  referralId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  referralStatus: string;
  paymentStatus: string;
  isUserSubscribed: boolean;
  createdAt: string;
};

type PartnerSummaryData = {
  summary: {
    totalReferrals: number;
    invitedReferrals: number;
    registeredReferrals: number;
    paidReferrals: number;
    totalEarnings: number;
  };
  referralLink: string;
  referredUsers: PartnerReferredUser[];
};

const defaultSummary = {
  totalReferrals: 0,
  invitedReferrals: 0,
  registeredReferrals: 0,
  paidReferrals: 0,
  totalEarnings: 0,
};

export function usePartnerSummary() {
  const query = useFetchData<PartnerSummaryData>({
    method: "GET",
    url: partnerEndpoints.PARTNER_SUMMARY,
    queryKey: ["partner-summary"],
    enabled: true,
  });

  const data = query.data?.data;

  return {
    summary: data?.summary ?? defaultSummary,
    referralLink: data?.referralLink ?? "",
    referredUsers: data?.referredUsers ?? [],
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

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

export type ReferralFormData = {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
};

export function useSendReferralEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["partner-send-referral-email"],
    mutationFn: async (data: ReferralFormData) => {
      const response = await axiosInstance.post(partnerEndpoints.PARTNER_SEND_EMAIL, {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || "",
        email: data.email,
        phoneNumber: data.phoneNumber,
      });
      return response.data;
    },
    onMutate: () => {
      return toast.loading("Sending referral invitation...");
    },
    onSuccess: (_data, _variables, toastId) => {
      toast.dismiss(toastId);
      toast.success("Referral invitation sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["partner-summary"] });
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard-referrals"] });
    },
    onError: (error: any, _variables, toastId) => {
      toast.dismiss(toastId);
      const message = error?.response?.data?.message || "Failed to send referral invitation";
      toast.error(message);
    },
  });
}

export function useClaimReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["partner-claim-referral"],
    mutationFn: async (data: ReferralFormData) => {
      const response = await axiosInstance.post(partnerEndpoints.PARTNER_CLAIM, {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || "",
        email: data.email,
        phoneNumber: data.phoneNumber,
      });
      return response.data;
    },
    onMutate: () => {
      return toast.loading("Claiming referral...");
    },
    onSuccess: (_data, _variables, toastId) => {
      toast.dismiss(toastId);
      toast.success("Referral claimed successfully!");
      queryClient.invalidateQueries({ queryKey: ["partner-summary"] });
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard-referrals"] });
    },
    onError: (error: any, _variables, toastId) => {
      toast.dismiss(toastId);
      const message = error?.response?.data?.message || "Failed to claim referral";
      toast.error(message);
    },
  });
}

export function useBulkUploadReferrals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["partner-bulk-upload-referrals"],
    mutationFn: async (referrals: ReferralFormData[]) => {
      const response = await axiosInstance.post(partnerEndpoints.PARTNER_BULK_UPLOAD, {
        referrals: referrals.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          middleName: r.middleName || "",
          email: r.email,
          phoneNumber: r.phoneNumber,
        })),
      });
      return response.data;
    },
    onMutate: () => {
      return toast.loading("Uploading bulk referrals...");
    },
    onSuccess: (_data, _variables, toastId) => {
      toast.dismiss(toastId);
      toast.success("Bulk referrals uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["partner-summary"] });
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard-referrals"] });
    },
    onError: (error: any, _variables, toastId) => {
      toast.dismiss(toastId);
      const message = error?.response?.data?.message || "Failed to upload bulk referrals";
      toast.error(message);
    },
  });
}

export type PartnerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber?: string;
  country?: string;
  role?: string;
  isEmailVerified?: boolean;
};

export type ProfileUpdateData = {
  firstName: string;
  lastName: string;
  middleName?: string;
  phoneNumber: string;
  password?: string;
  country: string;
};

export function useGetPartnerProfile() {
  const query = useFetchData<{ user: PartnerProfile }>({
    method: "GET",
    url: partnerEndpoints.PARTNER_UPDATE_PROFILE,
    queryKey: ["partner-profile"],
    enabled: true,
  });

  return {
    profile: query.data?.data?.user ?? null,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function usePartnerProfileUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["partner-update-profile"],
    mutationFn: async (data: ProfileUpdateData) => {
      const body: Record<string, any> = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName ?? "",
        phoneNumber: data.phoneNumber,
        country: data.country,
      };
      if (data.password) body.password = data.password;

      const response = await axiosInstance.put(
        partnerEndpoints.PARTNER_UPDATE_PROFILE,
        body
      );
      return response.data;
    },
    onMutate: () => toast.loading("Updating profile..."),
    onSuccess: (_data, _variables, toastId) => {
      toast.dismiss(toastId);
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["partner-profile"] });
      queryClient.invalidateQueries({ queryKey: ["staff-user"] });
    },
    onError: (error: any, _variables, toastId) => {
      toast.dismiss(toastId);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    },
  });
}

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
