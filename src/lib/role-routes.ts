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
  assistant: "/assistant/dashboard",
  tpc: "/assistant/dashboard",
  client: "/login",
  guest: "/login",
  test: "/assistant/dashboard",
  pc: "/assistant/dashboard",
  cec: "/cec/dashboard",
};

export function getRoleRoute(role: StaffRole | string): string {
  const normalizedRole = (role || "").toLowerCase();
  return ROLE_ROUTES[normalizedRole] ?? "/login";
}
