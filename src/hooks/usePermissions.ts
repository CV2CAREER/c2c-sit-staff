"use client";

import { useAuthStore } from "@/store/user.store";
import { StaffRole } from "@/types/user.types";

/**
 * usePermissions — Centralized hook for role-based access control.
 * 
 * Provides semantic helpers to check the current staff member's persona
 * and toggle UI elements accordingly.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const role = user?.role;
  const rawPermissions = (user as any)?.permissions;
  const permissionList = Array.isArray(rawPermissions)
    ? rawPermissions
        .map((permission: any) =>
          typeof permission === "string"
            ? permission
            : permission?.action || permission?.key || permission?.name || null
        )
        .filter(Boolean)
    : [];
  const permissionSet = new Set<string>(permissionList);

  const isAdmin = role === "admin";
  const isCoach = role === "coach";
  const isAssistant = role === "assistant";
  
  // High-level "persona" checks
  const isStaff = !!role && ["admin", "coach", "assistant", "partner", "sales", "customer", "tpc"].includes(role);
  
  /**
   * Check if the user has a specific role.
   */
  const hasRole = (targetRole: StaffRole | StaffRole[]) => {
    if (!role) return false;
    if (Array.isArray(targetRole)) {
      return targetRole.includes(role);
    }
    return role === targetRole;
  };

  /**
   * Check if the user has a specific permission.
   */
  const can = (action: string) => {
    if (!role) return false;

    if (
      permissionSet.has("*") ||
      permissionSet.has(action) ||
      permissionSet.has(`${action.split(":")[0]}:*`) ||
      permissionSet.has(`${role}:*`)
    ) {
      return true;
    }

    // Default system permissions by role
    switch (action) {
      case "delete:user":
      case "edit:system_settings":
        return isAdmin;
        
      case "manage:sessions":
        return isAdmin || isCoach;

      case "view:all_users":
        return isAdmin || isAssistant;

      default:
        return false;
    }
  };

  return {
    user,
    role,
    isAdmin,
    isCoach,
    isAssistant,
    isStaff,
    hasRole,
    can,
  };
}
