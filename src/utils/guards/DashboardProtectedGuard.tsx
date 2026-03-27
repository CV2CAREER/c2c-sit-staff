"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface DashboardProtectedGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Client-side route guard for all protected dashboard pages.
 *
 * Strategy (mirrors customer-rft DashboardProtectedGuard):
 * 1. useAuth pings the backend to validate the session cookie.
 * 2. While checking → show a loading state (never white-flash).
 * 3. Not authenticated → instant redirect to redirectTo (default: /login).
 * 4. Authenticated → render children.
 */
export function DashboardProtectedGuard({
  children,
  redirectTo = "/login",
}: DashboardProtectedGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once we are done loading and user is NOT authenticated
    if (!isLoading && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // 🌀 Show loading spinner while validating the session
  if (isLoading && isAuthenticated === false) {
    return (
      <div className="w-screen h-screen flex justify-center items-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // 🚫 Block rendering while unauthenticated (after redirect has been triggered)
  if (!isAuthenticated) {
    return (
      <div className="w-screen h-screen flex justify-center items-center">
        <div className="text-sm text-gray-500">Redirecting...</div>
      </div>
    );
  }

  // ✅ Authenticated — render protected content
  return <>{children}</>;
}
