import { AuthStoreProvider } from "@/store/user.store";
import { Metadata } from "next";
import AdminDashboardClientLayout from "./_components/AdminDashboardClientLayout";
import React, { Suspense } from "react";
import Sidebar from "@/components/SideBar";
import TopBar from "@/components/TopBar";
import ViewAsUserBanner from "@/components/ViewAsUserBanner";

export const metadata: Metadata = {
  // ... (metadata remains unchanged)
  title: {
    default: "Admin Dashboard",
    template: "%s | CVtoCAREER Admin",
  },
  description:
    "CVtoCAREER admin dashboard for managing users, roles, content, and platform operations.",
  keywords:
    "CVtoCAREER admin, admin dashboard, platform management, user management, internal tools",
  robots: {
    index: false,
    follow: false,
  },
  authors: [{ name: "CVtoCAREER" }],
  creator: "CVtoCAREER",
  metadataBase: new URL("https://admin.cvtocareer.com"),
  openGraph: {
    type: "website",
    siteName: "CVtoCAREER Admin",
    title: "CVtoCAREER Admin Dashboard",
    description:
      "Internal administration panel for managing CVtoCAREER users, content, and system settings.",
    url: "https://admin.cvtocareer.com",
    images: [
      {
        url: "/images/h-logo.svg",
        width: 1200,
        height: 630,
        alt: "CVtoCAREER Admin Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CVtoCAREER Admin Dashboard",
    description:
      "Internal administration panel for CVtoCAREER platform management.",
    images: ["/images/h-logo.svg"],
  },
};

import AdminPersonaGuard from "./_components/AdminPersonaGuard";
import FloatingVAChat from "@/components/VaBot/VaBot";

function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminPersonaGuard>
      <AdminDashboardClientLayout>
        <main className="relative flex max-w-screen overflow-hidden overflow-x-hidden">
          <Sidebar />
          <section className="dashboard-content w-full min-h-screen bg-[#f3f3f3] overflow-hidden overflow-x-hidden">
            <ViewAsUserBanner />
            <div className="p-3 sm:p-6">
              <TopBar title={"Admin"} />
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </div>
          </section>
          <FloatingVAChat />
        </main>
      </AdminDashboardClientLayout>
    </AdminPersonaGuard>
  );
}

export default AdminDashboardLayout;
