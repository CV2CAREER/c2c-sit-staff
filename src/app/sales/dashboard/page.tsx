"use client";

import React, { useMemo } from "react";
import { useAuthStore } from "@/store/user.store";
import { useReferralQueries } from "@/hooks/api/admin/referral";
import StatCard from "@/app/admin/dashboard/_components/stats-card";
import SalesReferralTable from "./_components/SalesReferralTable";
import { Copy, Users, DollarSign, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import ClaimReferralDialog from "./_components/ClaimReferralDialog";
import SendReferralDialog from "./_components/SendReferralDialog";

const SalesDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const userEmail = user?.email || "";

  const { userReferralsDomain } = useReferralQueries({
    fetchUserReferrals: !!userEmail,
    email: userEmail,
  });

  const stats = userReferralsDomain.data as any;
  const isLoading = userReferralsDomain.isLoading;

  const referralLink = `https://cvtocareer.com/register?ref=${userEmail}-sales`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const DASHBOARD_CARDS_DATA = [
    {
      title: "Total Referrals",
      value: stats?.totalReferrals || 0,
      icon: <Users size={20} />,
    },
    {
      title: "Paid Referrals",
      value: stats?.totalPaidReferrals || 0,
      icon: <CheckCircle size={20} className="text-green-500" />,
    },
    {
      title: "Unpaid Referrals",
      value: stats?.totalUnpaidReferrals || 0,
      icon: <Clock size={20} className="text-yellow-500" />,
    },
    {
      title: "Total Earnings",
      value: stats?.totalEarnings || 0,
      icon: <DollarSign size={20} className="text-blue-500" />,
      isCurrency: true,
    },
  ];

  return (
    <section className="flex flex-col gap-8 mt-6">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-[#0066B2] to-[#00BFF2] flex justify-between items-center flex-wrap gap-4 w-full text-white p-6 shadow-md rounded-xl">
        <div className="flex-1 min-w-[300px]">
          <h2 className="text-2xl font-bold">Welcome, {user?.firstName || "Sales Professional"}!</h2>
          <p className="text-blue-50 mt-1">Track your personal referrals and growth performance.</p>
          
          <div className="flex gap-3 mt-6">
            <ClaimReferralDialog refUserId={userEmail} onSuccess={() => userReferralsDomain.refetch()} />
            <SendReferralDialog onSuccess={() => userReferralsDomain.refetch()} />
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex flex-col gap-2 min-w-[320px]">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Your Referral Link</span>
          <div className="flex items-center gap-2 bg-white/20 p-2 rounded border border-white/10">
            <span className="text-sm truncate flex-1">{referralLink}</span>
            <button onClick={copyReferralLink} className="p-1.5 hover:bg-white/20 rounded transition-colors" title="Copy Link">
              <Copy size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
        {DASHBOARD_CARDS_DATA.map((card, idx) => (
          <StatCard
            key={idx}
            title={card.title}
            value={card.isCurrency ? card.value : card.value}
            icon={card.icon}
            isLoading={isLoading}
          />
        ))}
      </section>

      {/* Referrals Table */}
      <SalesReferralTable userEmail={userEmail} />
    </section>
  );
};

export default SalesDashboardPage;
