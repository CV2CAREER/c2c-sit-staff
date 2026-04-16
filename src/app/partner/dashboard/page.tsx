"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/user.store";
import { usePartnerDashboard } from "@/hooks/usePartnerDashboard";
import ReferralLinkClient from "./_components/ReferralLinkClient";
import ReferralTable from "./_components/ReferralTable";

export default function PartnerDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const userId = user?._id ?? "";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";

  const {
    partnerDashboardDomain: { data: referrals, stats, isLoading },
  } = usePartnerDashboard(userId);

  const statCards = [
    { title: "Total referral", value: stats.totalReferrals },
    { title: "Invited referral", value: stats.invitedReferrals },
    { title: "Registered referral", value: stats.registeredReferrals },
    { title: "Paid referral", value: stats.paidReferrals },
    { title: "Total Referral earnings", value: `$${stats.totalReferralEarnings}` },
  ];

  return (
    <section className="mt-8 flex flex-col gap-8">
      <Card className="flex flex-col items-start justify-between gap-6 p-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-xl font-semibold leading-tight text-black sm:text-2xl">
            Welcome,
            <br />
            {firstName} {lastName}
          </h1>
        </div>
        <ReferralLinkClient />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((item) => (
          <Card key={item.title} className="text-center">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-3xl font-bold text-black sm:text-4xl">
                {isLoading ? "..." : item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {referrals.length > 0 ? (
        <ReferralTable referrals={referrals} />
      ) : (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">No referrals yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Share your referral link to start earning
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
