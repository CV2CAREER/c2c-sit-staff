import { useMemo } from "react";
import { useFetchData } from "../../useApi";
import { useMutation } from "@tanstack/react-query";
import axiosInstance from "@/services/api-client";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";
import { IReferralSummary, IReferredUser } from "@/types/referral.types";

interface ReferralQueriesOptions {
  fetchReferrals?: boolean;
  fetchUserReferrals?: boolean;
  fetchReferredUsersDetails?: boolean;
  variance?: string;
  archived?: boolean;
  page?: number;
  pageSize?: number;
  email?: string;
  referrerId?: string;
}

export const useReferralQueries = (options: ReferralQueriesOptions) => {
  const {
    fetchReferrals = false,
    fetchUserReferrals = false,
    fetchReferredUsersDetails = false,
    variance = "all",
    archived = false,
    page = 1,
    pageSize = 15,
    email = "",
    referrerId = "",
  } = options;

  const referralsList = useFetchData<IReferralSummary>({
    method: "GET",
    url: endpoints.ADMIN_REFERRAL,
    params: { variance, archived, page, pageSize },
    queryKey: ["admin-referrals", variance, archived, page, pageSize],
    enabled: fetchReferrals,
  });

  const userReferrals = useFetchData<IReferralSummary>({
    method: "GET",
    url: endpoints.ADMIN_REFERRAL,
    params: { email },
    queryKey: ["admin-user-referrals", email],
    enabled: fetchUserReferrals && !!email,
  });

  const referredUsersDetails = useFetchData<{ status: string; data: IReferredUser[] }>({
    method: "GET",
    url: endpoints.ADMIN_REFERRAL,
    params: { variance: "referred-users", referrerId },
    queryKey: ["admin-referred-users-details", referrerId],
    enabled: fetchReferredUsersDetails && !!referrerId,
  });

  return useMemo(() => ({
    referralsListDomain: {
      data: referralsList.data?.data,
      isLoading: referralsList.isLoading,
      isSuccess: referralsList.isSuccess,
      isError: referralsList.isError,
      isFetching: referralsList.isFetching,
      error: referralsList.error,
      refetch: referralsList.refetch,
    },
    userReferralsDomain: {
      data: userReferrals.data?.data,
      isLoading: userReferrals.isLoading,
      isSuccess: userReferrals.isSuccess,
      isError: userReferrals.isError,
      isFetching: userReferrals.isFetching,
      error: userReferrals.error,
      refetch: userReferrals.refetch,
    },
    referredUsersDetailsDomain: {
      data: referredUsersDetails.data?.data,
      isLoading: referredUsersDetails.isLoading,
      isSuccess: referredUsersDetails.isSuccess,
      isError: referredUsersDetails.isError,
      isFetching: referredUsersDetails.isFetching,
      error: referredUsersDetails.error,
      refetch: referredUsersDetails.refetch,
    },
  }), [referralsList, userReferrals, referredUsersDetails]);
};

export const useReferralMutations = () => {
  const updateReferralStatus = useMutation({
    mutationKey: ["admin-update-referral-status"],
    mutationFn: async (payload: { id: string; variance?: string; status?: string; referrerEmail?: string }) => {
      const response = await axiosInstance.put(`${endpoints.ADMIN_REFERRAL}?referralID=${payload.id}&variance=${payload.variance || ''}`, {
        status: payload.status,
        referrerEmail: payload.referrerEmail,
      });
      return response.data;
    },
  });

  const updatePaymentStatus = useMutation({
    mutationKey: ["admin-update-payment-status"],
    mutationFn: async (payload: { id: string; paymentStatus: string }) => {
      const response = await axiosInstance.put(`${endpoints.ADMIN_REFERRAL}?id=${payload.id}&action=UPDATE_PAYMENT_STATUS`, {
        paymentStatus: payload.paymentStatus,
      });
      return response.data;
    },
  });

  const approveClaim = useMutation({
    mutationKey: ["admin-approve-claim"],
    mutationFn: async (id: string) => {
      const response = await axiosInstance.put(`${endpoints.ADMIN_REFERRAL}?id=${id}&action=APPROVE_CLAIM`);
      return response.data;
    },
  });

  const declineClaim = useMutation({
    mutationKey: ["admin-decline-claim"],
    mutationFn: async (payload: { id: string; reason: string }) => {
      const response = await axiosInstance.put(`${endpoints.ADMIN_REFERRAL}?id=${payload.id}&action=DECLINE_CLAIM`, {
        reason: payload.reason,
      });
      return response.data;
    },
  });

  const deleteReferral = useMutation({
    mutationKey: ["admin-delete-referral"],
    mutationFn: async (payload: { id: string; variance: string }) => {
      const response = await axiosInstance.delete(`${endpoints.ADMIN_REFERRAL}?id=${payload.id}&variance=${payload.variance}`);
      return response.data;
    },
  });

  const hardDeleteReferral = useMutation({
    mutationKey: ["admin-hard-delete-referral"],
    mutationFn: async (payload: { id: string; variance: string }) => {
      const response = await axiosInstance.delete(`${endpoints.ADMIN_REFERRAL}?id=${payload.id}&hard=true&variance=${payload.variance}`);
      return response.data;
    },
  });

  const restoreReferral = useMutation({
    mutationKey: ["admin-restore-referral"],
    mutationFn: async (payload: { id: string; variance: string }) => {
      const response = await axiosInstance.delete(`${endpoints.ADMIN_REFERRAL}?id=${payload.id}&undo=true&variance=${payload.variance}`);
      return response.data;
    },
  });

  return {
    updateReferralStatus,
    updatePaymentStatus,
    approveClaim,
    declineClaim,
    deleteReferral,
    hardDeleteReferral,
    restoreReferral,
  };
};
