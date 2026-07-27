"use client";
import React from "react";
import { usePathname } from "next/navigation";
import StaffNavRoutes from "@/components/layout/nav-routes";
import { NAV_LINKS_BY_ROLE } from "@/constants/navLinks";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPersonaSwitchStore } from "@/store/switchPersonaStore";

/**
 * @param onClose optional used specifically on the TopBar component.
 * @returns JSX containing the navigation routes based on the current user role or persona
 */
const RenderNavRoutes = ({ onClose }: { onClose?: () => void }) => {
  const pathName = usePathname();
  const { user } = useAuth();
  const { activeRole } = useAdminPersonaSwitchStore();

  if (!user) return null;

  // Determine which links to show:
  // 1. If user is admin, they might be switching personas
  // 2. Otherwise use their actual role
  let effectiveRole = user.role as string;
  
  if (user.role === "admin" && pathName?.startsWith("/admin")) {
    effectiveRole = activeRole;
  } else {
    // Determine role from path if not in admin
    const keywords = ["admin", "coach", "assistant", "partner", "cse", "sales"];
    const matchedKeyword = keywords.find((key) => pathName?.includes(key));
    if (matchedKeyword) effectiveRole = matchedKeyword;
  }

  const links = NAV_LINKS_BY_ROLE[effectiveRole] || NAV_LINKS_BY_ROLE[user.role] || [];

  return <StaffNavRoutes links={links} onPress={onClose} />;
};

export default RenderNavRoutes;
