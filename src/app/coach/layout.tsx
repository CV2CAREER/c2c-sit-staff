"use client";

import { DashboardDataProvider } from "@/providers/dashboard.provider";
import React, { Suspense } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";
import { withPersonaGuard } from "@/utils/guards/withPersonaGuard";

function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardDataProvider>
      <main className="relative flex max-w-screen overflow-hidden overflow-x-hidden">
        <Sidebar />
        <section className="w-full lg:max-w-[calc(100vw-250px)] min-h-screen lg:ms-[250px] bg-[#f3f3f3] overflow-hidden overflow-x-hidden">
          <ViewAsUserBanner />
          <div className="p-3 sm:p-6">
            <TopBar title={"Coach"} />
            <Suspense fallback={<div>Loading Coach Portal...</div>}>
              {children}
            </Suspense>
          </div>
        </section>
      </main>
    </DashboardDataProvider>
  );
}

export default withPersonaGuard(CoachLayout, ["coach", "admin"]);
