import { Metadata } from "next";
import React, { Suspense } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import AdminDashboardClientLayout from "../admin/_components/AdminDashboardClientLayout";
import AssistantPersonaGuard from "./_components/AssistantPersonaGuard";
import FloatingVAChat from "@/components/VaBot/VaBot";


export const metadata: Metadata = {
  title: {
    default: "Placement Controller Dashboard",
    template: "%s | CVtoCAREER Staff",
  },
  description: "Placement controller dashboard for assigned clients and application tracking.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AssistantDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AssistantPersonaGuard>
      <AdminDashboardClientLayout>
        <main className="relative flex max-w-screen overflow-hidden overflow-x-hidden">
          <Sidebar />
          <section className="w-full min-h-screen overflow-hidden overflow-x-hidden bg-[#f3f3f3] lg:ms-[250px] lg:max-w-[calc(100vw-250px)]">
            <ViewAsUserBanner />
            <div className="p-3 sm:p-6">
              <TopBar title="Placement Controller" />
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </div>
          </section>
          <FloatingVAChat />
        </main>
      </AdminDashboardClientLayout>
    </AssistantPersonaGuard>
  );
}
