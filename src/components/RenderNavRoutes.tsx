"use client";
import React from "react";
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
  const { user } = useAuth();
  const { activeRole } = useAdminPersonaSwitchStore();

  if (!user) return null;

  // Determine which links to show:
  // 1. If user is admin, they might be switching personas — activeRole
  //    follows wherever they navigate, on or off /admin, since that's
  //    the whole point of impersonating another role's view.
  // 2. Otherwise ALWAYS use their real role. Previously this fell back to
  //    guessing a role from a keyword substring match on the URL path,
  //    which meant a genuine non-admin user (e.g. assistant) visiting any
  //    legitimate link that happens to live under /admin/... (like their
  //    own "Missing Information" link, /admin/missing-information)
  //    got the ENTIRE admin sidebar rendered for them — Switch Persona
  //    included. Real role is the only trustworthy source for anyone
  //    who isn't an actual admin.
  let effectiveRole = user.role as string;

  if (user.role === "admin") {
    effectiveRole = activeRole;
  }

  const rawLinks = NAV_LINKS_BY_ROLE[effectiveRole] || NAV_LINKS_BY_ROLE[user.role] || [];

  // "Switch to Admin" (action: "switch-admin") is baked into each non-admin
  // role's static link array so it's available to an admin who is currently
  // viewing-as that role via persona-switch — but the exact same array is
  // used for a genuine user of that role, who should never see it. NavGroup
  // has no concept of real-vs-impersonated role, so the filter has to
  // happen here, against the one trustworthy source: the real user.role.
  const links =
    user.role === "admin" ? rawLinks : rawLinks.filter((link) => link.action !== "switch-admin");

  return (
    <SidebarNav links={links} collapsed={collapsed} onPress={onClose} onExpandRail={onExpandRail} />
  );
};

export default RenderNavRoutes;
