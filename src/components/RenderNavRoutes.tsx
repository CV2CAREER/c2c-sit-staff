"use client";
import React from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/sidebar/SidebarNav";
import { NAV_LINKS_BY_ROLE } from "@/constants/navLinks";
import { useAuth } from "@/hooks/useAuth";
import { useAdminPersonaSwitchStore } from "@/store/switchPersonaStore";

/**
 * @param onClose optional used specifically on the TopBar component.
 * @param collapsed optional — only relevant to the desktop rail, never passed from the mobile drawer.
 * @param onExpandRail optional — lets a special group (e.g. Switch Persona) re-expand a collapsed rail.
 * @returns JSX containing the navigation routes based on the current user role or persona
 */
const RenderNavRoutes = ({
  onClose,
  collapsed,
  onExpandRail,
}: {
  onClose?: () => void;
  collapsed?: boolean;
  onExpandRail?: () => void;
}) => {
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

  return (
    <SidebarNav links={links} collapsed={collapsed} onPress={onClose} onExpandRail={onExpandRail} />
  );
};

export default RenderNavRoutes;
