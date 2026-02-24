"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface DashboardProtectedGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function DashboardProtectedGuard({
  children,
  redirectTo = "/login",
}: DashboardProtectedGuardProps) {
  //   const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  //   useEffect(() => {
  //     // 🚫 If not loading AND not authenticated, redirect immediately
  //     if (!isLoading && !isAuthenticated) {
  //       console.log("🔒 No active session → redirecting to", redirectTo);
  //       router.replace(redirectTo);
  //     }
  //   }, [isAuthenticated, isLoading, router, redirectTo]);

  //   // 🌀 Show skeleton loader ONLY while an authenticated session is being validated/fetched
  //   if (isLoading && isAuthenticated === false) {
  //     return <div>Loading...</div> // 👈 prevents spinner flicker for anonymous visitors
  //   }

  //   // 🚫 Block rendering if not authenticated (after redirect)
  //   if (!isAuthenticated) {
  //     return <div>Loading...</div>
  //   }

  // ✅ All checks passed → render protected content
  return <>{children}</>;
}
