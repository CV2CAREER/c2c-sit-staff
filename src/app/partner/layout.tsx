import { Metadata } from "next";
import React, { Suspense } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import AdminDashboardClientLayout from "../admin/_components/AdminDashboardClientLayout";
import PartnerPersonaGuard from "./_components/PartnerPersonaGuard";

export const metadata: Metadata = {
  title: {
    default: "Partner Dashboard",
    template: "%s | CVtoCAREER Staff",
  },
  description: "Partner dashboard for referrals and earnings overview.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PartnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PartnerPersonaGuard>
      <AdminDashboardClientLayout>
        <main className="relative flex max-w-screen overflow-hidden overflow-x-hidden">
          <Sidebar />
          <section className="w-full min-h-screen overflow-hidden overflow-x-hidden bg-[#f3f3f3] lg:ms-[250px] lg:max-w-[calc(100vw-250px)]">
            <ViewAsUserBanner />
            <div className="p-3 sm:p-6">
              <TopBar title="Partner" />
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </div>
          </section>
        </main>
      </AdminDashboardClientLayout>
    </PartnerPersonaGuard>
  );
}
