/* eslint-disable no-console */
import { useQueryClient } from "@tanstack/react-query";
import { useMutateData } from "../useApi";
import { LOGIN, LOGOUT } from "@/constants/apiEndpoints/auth.endpoint";
import { ILoginRequest, ILoginResponse, ILogoutResponse } from "@/types/auth.types";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/user.store";
import { StaffRole } from "@/types/user.types";

// --------------- Role-based dashboard routing (functional parity with staff-v2) ---------------

export const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin/dashboard",
  partner: "/partner/dashboard",
  sales: "/sales/dashboard",
  coach: "/coach/dashboard",
  customer: "/cse/dashboard",
  assistant: "/admin/dashboard", // Shared admin area
  tpc: "/admin/dashboard",       // Shared admin area
  client: "/login",              // Fallback for client (no client dashboard yet)
  guest: "/login",
  test: "/admin/dashboard",
  pc: "/admin/dashboard",        // Map pc to admin area
};

export function getRoleRoute(role: StaffRole | string): string {
  const normalizedRole = (role || "").toLowerCase();
  return ROLE_ROUTES[normalizedRole] ?? "/login";
}

// --------------- Auth Mutations Hook ---------------

export const useAuthMutations = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { setUser, setAccessToken, setUserEmail, userEmail } = useAuthStore(
    (s) => s,
  );

  // ── Login ──────────────────────────────────────────────────────
  const {
    mutate: loginUser,
    isPending: loginUserLoading,
    isSuccess: loginSuccess,
    data: loginData,
  } = useMutateData<ILoginResponse, ILoginRequest>({
    method: "POST",
    mutationKey: ["staff-loginUser"],
    url: LOGIN,
    onSuccess: async (response) => {
      if (!response.success) return;

      const { user, verificationToken, accessToken } = response.data;

      // Store user and token in Zustand
      setUser(user);
      setAccessToken(accessToken);

      if (userEmail) setUserEmail(null);

      // If email not yet verified, redirect to verification
      if (verificationToken) {
        router.push(`/verify?session=${verificationToken}`);
        return;
      }

      // Invalidate any cached user queries so fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ["staff-user"] });

      // Role-based redirect (mirrors staff-v2 behaviour)
      const destination = getRoleRoute(user.role);
      router.push(destination);
    },
    onError: (error) => {
      // Error is surfaced via the hook's isError/error fields.
      // The UI Login.tsx component handles toast display.
      // 403 = valid credentials but role not permitted by backend
      if (error?.statusCode === 403) {
        console.warn("[auth.api] Login blocked — role not permitted by backend:", error.message);
      } else {
        console.error("[auth.api] Login error:", error.message);
      }
    },
  });

  // ── Logout ─────────────────────────────────────────────────────
  //
  // Strategy: The backend /logout endpoint is not yet implemented.
  // We clear state client-side immediately in BOTH onSuccess and onError
  // so logout always works. When the backend adds the endpoint, it will
  // additionally clear the server-side cookie and blacklist the token.
  const clearAuthState = () => {
    setUser(null);
    setAccessToken(null);
    setUserEmail(null);
    queryClient.clear();
    router.push("/login");
  };

  const {
    mutate: logoutUser,
    isSuccess: logoutUserSuccess,
    isPending: logoutUserLoading,
    data: logoutData,
  } = useMutateData<ILogoutResponse, null>({
    method: "POST",
    mutationKey: ["staff-logoutUser"],
    url: LOGOUT,
    onSuccess: async () => {
      // Server-side cookie cleared by backend (once implemented)
      clearAuthState();
    },
    onError: () => {
      // Backend endpoint 404s for now — clear client-side state anyway
      clearAuthState();
    },
  });

  return {
    loginDomain: {
      loginUser,
      loginUserLoading,
      loginSuccess,
      loginData,
    },
    logoutDomain: {
      logoutUser,
      logoutUserSuccess,
      logoutUserLoading,
      logoutData,
    },
    exitViewAsUserDomain: {
      exitViewAsUser: (email: string) =>
        loginUser({
          email,
          password: "NOT_USED_FOR_EXIT_VIEW_AS_USER",
          exitViewAsUser: "true",
        }),
      isPending: loginUserLoading,
      isSuccess: loginSuccess,
    },
  };
};

