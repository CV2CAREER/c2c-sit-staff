"use client";

import { DashboardDataProvider } from "@/providers/dashboard.provider";
import { ReactNode } from "react";

export default function AdminDashboardClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardDataProvider>{children}</DashboardDataProvider>;
}
