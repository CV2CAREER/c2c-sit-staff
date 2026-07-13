"use client";

import { useRouter } from "next/navigation";
import { useEffect, ComponentType, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StaffRole } from "@/types/user.types";
import { getRoleRoute } from "@/hooks/api/auth.api";
import { clearSessionHint } from "@/lib/auth-session";

/**
 * withPersonaGuard — HOC to protect pages based on staff roles.
 * 
 * @param Component The page component to wrap.
 * @param allowedRoles A single role or array of roles allowed to access the page.
 */


export function withPersonaGuard<P extends object>(
  Component: ComponentType<P>,
  allowedRoles: StaffRole | StaffRole[]
) {
  return function GuardedComponent(props: P) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user, isAuthenticated, isLoading, isError, error } = useAuth();
    const router = useRouter();

    const roles = useMemo(() => 
      Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    , [allowedRoles]);

    const lowerCaseUserRole = useMemo(() => (user?.role || "").toLowerCase(), [user?.role]);
    const isAuthorized = useMemo(() => 
      roles.some(role => role.toLowerCase() === lowerCaseUserRole)
    , [roles, lowerCaseUserRole]);

    useEffect(() => {
      // 1. Unauthenticated -> Redirect to login
      if (!isLoading && !isAuthenticated) {
        // The backend rejected the session, so drop the middleware's session
        // hint — otherwise it would bounce us straight back off /login.
        clearSessionHint();
        router.replace("/login");
        return;
      }

      // 2. Authenticated but unauthorized role -> Redirect to specific dashboard based on actual role
      if (!isLoading && isAuthenticated && user && !isAuthorized) {
        const correctRoute = getRoleRoute(user.role);
        if (window.location.pathname !== correctRoute) {
          router.replace(correctRoute);
        } else {
          // Their own role route is guarded against them. Sending them to
          // /login with the hint intact would loop through the middleware.
          clearSessionHint();
          router.replace("/login");
        }
      }
    }, [isAuthenticated, isLoading, user, router, isAuthorized]);



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
    if (!isAuthenticated || (user && !isAuthorized)) {
      return (
        <div className="w-screen h-screen flex justify-center items-center">
          <div className="text-sm text-gray-500 font-medium animate-pulse">
            Redirecting to secure area...
          </div>
        </div>
      );
    }

    // ✅ Authorized — render the wrapped component
    return <Component {...props} />;
  };
}
