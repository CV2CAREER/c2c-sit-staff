"use client";

import { AuthStoreProvider } from "@/store/user.store";
import { Metadata } from "next";
import CECPersonaGuard from "./_components/CECPersonaGuard";
import React, { Suspense } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import FloatingVAChat from "@/components/VaBot/VaBot";

function CECDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CECPersonaGuard>
      <AuthStoreProvider>
        <main className="relative flex max-w-screen overflow-hidden overflow-x-hidden">
          <Sidebar />
          <section className="dashboard-content w-full min-h-screen bg-[#f3f3f3] overflow-hidden overflow-x-hidden">
            <div className="p-3 sm:p-6">
              <TopBar title={"CEC"} />
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </div>
          </section>
          <FloatingVAChat />
        </main>
      </AuthStoreProvider>
    </CECPersonaGuard>
  );
}

export default CECDashboardLayout;
