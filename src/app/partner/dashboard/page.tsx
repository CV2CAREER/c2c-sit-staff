"use client";
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import ReferralLinkClient from "./_components/ReferralLinkClient";
import ClaimReferralDialog from "./_components/ClaimReferralDialog";
import SendReferralDialog from "./_components/SendReferralDialog";
import SendBulkReferralsDialog from "./_components/SendBulkReferralsDialog";
import ReferralTable from "./_components/ReferralTable";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerSummary } from "@/hooks/usePartnerDashboard";

const DashboardPage = () => {
  const { user } = useAuth();
  const userId = user?._id ?? "";
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";

  const { summary, referralLink, referredUsers, isLoading } = usePartnerSummary();

  const statsCards = [
    { title: "Total referral", value: summary.totalReferrals },
    { title: "Invited referral", value: summary.invitedReferrals },
    { title: "Registered referral", value: summary.registeredReferrals },
    { title: "Paid referral", value: summary.paidReferrals },
    { title: "Total Referral earnings", value: `$${summary.totalEarnings}` },
  ];

  const tableRows = referredUsers.map((u) => ({
    _id: u.referralId,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    isUserSubscribed: u.isUserSubscribed,
    status: u.status,
    createdAt: u.createdAt,
  }));

  return (
    <section className="flex flex-col gap-8 mt-8">
      {/* Header Section */}
      <Card className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-black leading-tight">
            Welcome,
            <br />
            {firstName} {lastName}
          </h1>
        </div>
        {referralLink && <ReferralLinkClient referralLink={referralLink} />}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statsCards.map((item, idx) => (
          <Card key={idx} className="text-center">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-3xl sm:text-4xl font-bold text-black">
                {isLoading ? "..." : item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-start">
        <ClaimReferralDialog refUserId={userId} />
        <SendReferralDialog refUserId={userId} referralLink={referralLink} />
        <SendBulkReferralsDialog />
        <button
          className="bg-[#E0E0E0] text-gray-600 px-4 py-2 rounded-md font-medium cursor-not-allowed flex-1 min-w-[150px] max-w-xs text-center"
          disabled
        >
          Request Drawdown
        </button>
      </div>

      {/* Referrals Table */}
      {tableRows.length > 0 ? (
        <ReferralTable referrals={tableRows} />
      ) : (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">No referrals yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Share your referral link to start earning
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default DashboardPage;
