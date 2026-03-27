"use client";

import { useRouter } from "next/navigation";
import { useEffect, ComponentType, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StaffRole } from "@/types/user.types";

/**
 * withPersonaGuard — HOC to protect pages based on staff roles.
 * 
 * @param Component The page component to wrap.
 * @param allowedRoles A single role or array of roles allowed to access the page.
 */
const BYPASS_AUTH = true; // TOGGLE THIS TO DISABLE/ENABLE SECURITY IN DEVELOPMENT

export function withPersonaGuard<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: StaffRole | StaffRole[]
) {
  return function GuardedComponent(props: P) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    const roles = useMemo(() => 
      Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    , [allowedRoles]);

    useEffect(() => {
      // 🛡️ Skip redirection if bypass is active in development
      if (BYPASS_AUTH && process.env.NODE_ENV === "development") return;

      // 1. Unauthenticated -> Redirect to login
      if (!isLoading && !isAuthenticated) {
        router.replace("/login");
        return;
      }

      // 2. Authenticated but unauthorized role -> Redirect to unauthorized or dashboard
      if (!isLoading && isAuthenticated && user && !roles.includes(user.role)) {
        // Redirect to a specific dashboard based on their actual role if they tried to cross-access
        router.replace("/admin/dashboard"); // Default fallback or a specific 403 page
      }
    }, [isAuthenticated, isLoading, user, router, roles]);

    // 🛡️ Bypassing render block for development/debugging purposes
    if (BYPASS_AUTH && process.env.NODE_ENV === "development") {
      return <Component {...props} />;
    }

    // 🌀 Show loading spinner while validating the session or checking role
    if (isLoading) {
      return (
        <div className="w-screen h-screen flex justify-center items-center">
          <div className="text-sm text-gray-500 font-medium animate-pulse">
            Verifying permissions...
          </div>
        </div>
      );
    }

    // 🚫 Block rendering while unauthenticated or unauthorized
    if (!isAuthenticated || (user && !roles.includes(user.role))) {
      return null; // The useEffect handles the redirect
    }

    // ✅ Authorized — render the wrapped component
    return <Component {...props} />;
  };
}
