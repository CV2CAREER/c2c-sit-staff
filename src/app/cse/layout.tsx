"use client";

import { DashboardDataProvider } from "@/providers/dashboard.provider";
import React, { Suspense } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import { withPersonaGuard } from "@/utils/guards/withPersonaGuard";

function CseLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDataProvider>
      <main className="relative flex max-w-screen overflow-hidden overflow-x-hidden">
        <Sidebar />
        <section className="dashboard-content w-full min-h-screen bg-[#f3f3f3] overflow-hidden overflow-x-hidden">
          <ViewAsUserBanner />
          <div className="p-3 sm:p-6">
            <TopBar title={"Customer Service"} />
            <Suspense fallback={<div>Loading CSE Portal...</div>}>
              {children}
            </Suspense>
          </div>
        </section>
      </main>
    </DashboardDataProvider>
  );
}

export default withPersonaGuard(CseLayout, ["customer", "admin"]);
