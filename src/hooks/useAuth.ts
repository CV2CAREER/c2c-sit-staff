"use client";

import { useAuthStore } from "@/store/user.store";
import { useEffect } from "react";
import { useUserQueries } from "./api/user.api";

/**
 * useAuth — Manages the authentication lifecycle via a single network call.
 *
 * Strategy (backend-constrained):
 * Since there is no dedicated /validate-session endpoint in the staff-backend,
 * we use GET /api/v1/user/profile directly as both a session check and a user fetch.
 *
 * 200 OK  → User is authenticated. Populate Zustand store with user data.
 * 401     → No cookie / expired. isAuthenticated = false. Guard redirects to /login.
 * Loading → isLoading = true. Guard renders a spinner (no white flash).
 */
export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setViewingAsUser = useAuthStore((s) => s.setViewingAsUser);
  const isViewingAsUser = useAuthStore((s) => s.isViewingAsUser);
  const viewedByUserEmail = useAuthStore((s) => s.viewedByUserEmail);
 
   // Single request: fetch user profile (acts as session validation + data hydration)
   const { userData, userLoading, userError, userSuccess } = useUserQueries({
    fetchUserData: true, // Always fetch on mount
  }).userDomain;

  // Sync fetched user into the Zustand global store
  useEffect(() => {
    if (userSuccess && userData?.user) {
      setUser(userData.user);
      setViewingAsUser(
        userData.user.isViewingAsUser ?? false,
        userData.user.viewedByUserEmail ?? null
      );
    }
  }, [userSuccess, userData, setUser, setViewingAsUser]);

  // Clear store if session expired / token rejected
  useEffect(() => {
    if (userError) {
      setUser(null);
    }
  }, [userError, setUser]);

  const isAuthenticated = userSuccess && !!userData?.user;

  return {
    user: userData?.user ?? null,
    isLoading: userLoading,
    isAuthenticated,
    isViewingAsUser: isViewingAsUser || (userData?.user?.isViewingAsUser ?? false),
    viewedByUserEmail: viewedByUserEmail || userData?.user?.viewedByUserEmail || null,
    isError: !!userError,
    error: userError,
  };
}
