import { StaffRole } from "@/types/user.types";

/**
 * Role-based dashboard routing.
 *
 * Lives outside hooks/api/auth.api.ts so it can be imported from the Edge
 * middleware, which cannot pull in react-query or next/navigation.
 */
export const ROLE_ROUTES: Record<string, string> = {
  admin: "/admin/dashboard",
  sales: "/sales/dashboard",
  coach: "/coach/dashboard",
  customer: "/cse/dashboard",
  assistant: "/pc/dashboard",
  tpc: "/pc/dashboard",
  client: "/login",
  guest: "/login",
  test: "/pc/dashboard",
  pc: "/pc/dashboard",
  cec: "/admin/cec/dashboard",
};

export function getRoleRoute(role: StaffRole | string): string {
  const normalizedRole = (role || "").toLowerCase();
  return ROLE_ROUTES[normalizedRole] ?? "/login";
}
