"use client";

import React from "react";
import { useAuthStore } from "@/store/user.store";
import { useReferralQueries } from "@/hooks/api/admin/referral";
import { useSupportDesk } from "@/hooks/useSupportDesk";
import StatCard from "@/app/admin/dashboard/_components/stats-card";
import { Users, DollarSign, CheckCircle, Clock, MessageSquare, Headphones } from "lucide-react";
import SalesReferralTable from "@/app/sales/dashboard/_components/SalesReferralTable";
import { format } from "date-fns";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

const CseDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const userEmail = user?.email || "";
  const referralLink = `https://cvtocareer.com/register?ref=${userEmail}-cse`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  // Support Desk Sessions
  const { sessionsDomain } = useSupportDesk();
  const supportSessionsData = sessionsDomain.data || [];
  
  // Referral Stats
  const { userReferralsDomain } = useReferralQueries({
    fetchUserReferrals: !!userEmail,
    email: userEmail,
  });

  const stats = userReferralsDomain.data as any;
  const isLoadingReferrals = userReferralsDomain.isLoading;

  const referralStats = [
    {
      title: "Total Referrals",
      value: stats?.totalReferrals || 0,
      icon: <Users size={20} />,
    },
    {
      title: "Total Earnings",
      value: stats?.totalEarnings || 0,
      icon: <DollarSign size={20} className="text-blue-500" />,
      isCurrency: true,
    },
  ];

  const assignedSessions = supportSessionsData.filter((s: any) => s.assignedStaffId === (user as any)?.id);

  const supportStats = [
    {
      title: "Assigned Sessions",
      value: assignedSessions?.length || 0,
      icon: <Headphones size={20} className="text-purple-500" />,
    },
    {
      title: "Waiting Sessions",
      value: supportSessionsData.filter((s: any) => !s.assignedStaffId).length || 0,
      icon: <MessageSquare size={20} className="text-yellow-500" />,
    },
  ];

  return (
    <section className="flex flex-col gap-8 mt-6">
      {/* Welcome Banner */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 flex justify-between items-center flex-wrap gap-4 w-full text-white p-8 shadow-md rounded-2xl">
        <div>
          <h2 className="text-3xl font-bold">Welcome, {user?.firstName || "CSE"}!</h2>
          <p className="text-purple-50 mt-1 text-lg">Manage your support sessions and track your referral bonuses.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 text-center">
            <span className="block text-xs uppercase font-bold text-purple-200">Current Time</span>
            <span className="text-xl font-mono">{format(new Date(), "HH:mm")}</span>
          </div>
        </div>
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...supportStats, ...referralStats].map((card, idx) => (
          <StatCard
            key={idx}
            title={card.title}
            value={card.value}
            icon={card.icon}
            isLoading={isLoadingReferrals}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Support Sessions */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Headphones size={20} className="text-blue-600" />
            Active Sessions
          </h3>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 min-h-[400px]">
             {assignedSessions?.length > 0 ? (
               <div className="space-y-4">
                 {assignedSessions.map((session: any) => (
                   <div key={session._id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-900 truncate max-w-[150px]">{session.userEmail}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold uppercase">Active</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">Last message: {session.lastMessage?.text || "No messages yet"}</p>
                      <div className="mt-3 flex items-center justify-between">
                         <span className="text-[10px] text-gray-400">{format(new Date(session.updatedAt), "HH:mm")}</span>
                         <button className="text-xs font-bold text-blue-600">Open Chat</button>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                 <MessageSquare size={48} className="opacity-20" />
                 <p className="text-sm">No active sessions</p>
               </div>
             )}
          </div>
        </div>

        {/* Referrals Section */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Your Referrals
          </h3>
          <SalesReferralTable userEmail={userEmail} />
        </div>
      </div>
    </section>
  );
};

export default CseDashboardPage;
