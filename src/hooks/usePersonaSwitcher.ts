"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useAdminPersonaSwitchStore } from "@/store/switchPersonaStore";
import { NavRole } from "@/constants/navLinks";
import { useAuthStore } from "@/store/user.store";

/**
 * usePersonaSwitcher - Hook for switching personas with real-time permission refresh.
 *
 * Handles:
 * - Persona switching with transition state
 * - Real-time permission refresh after switch
 * - Navigation filter updates without page reload
 * - Cache invalidation for permission-related queries
 */
export function usePersonaSwitcher() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const {
    activeRole,
    previousRole,
    isTransitioning,
    setActiveRole,
    startTransition,
    endTransition,
    resetToOriginalRole,
  } = useAdminPersonaSwitchStore();

  /**
   * Switch to a new persona with permission refresh
   */
  const switchPersona = useCallback(
    async (targetRole: NavRole) => {
      if (targetRole === activeRole) {
        toast("Already viewing as this role", { icon: "ℹ️" });
        return;
      }

      startTransition();

      try {
        // Update the active role
        setActiveRole(targetRole);

        // Invalidate permission-related queries to force refresh
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["persona-rules"] }),
          queryClient.invalidateQueries({ queryKey: ["admin-access-levels"] }),
          queryClient.invalidateQueries({ queryKey: ["staff-user"] }),
        ]);

        toast.success(`Now viewing as ${targetRole}`, { duration: 2000 });
      } catch (error) {
        console.error("Failed to switch persona:", error);
        toast.error("Failed to switch persona");
        // Revert on error
        resetToOriginalRole();
      } finally {
        endTransition();
      }
    },
    [activeRole, setActiveRole, startTransition, endTransition, resetToOriginalRole, queryClient]
  );

  /**
   * Reset back to the user's original role
   */
  const exitViewAs = useCallback(() => {
    if (!previousRole) {
      toast("No previous role to return to", { icon: "ℹ️" });
      return;
    }

    startTransition();

    try {
      resetToOriginalRole();

      // Invalidate queries to refresh with original permissions
      queryClient.invalidateQueries({ queryKey: ["persona-rules"] });
      queryClient.invalidateQueries({ queryKey: ["admin-access-levels"] });

      toast.success(`Returned to ${previousRole} view`, { duration: 2000 });
    } catch (error) {
      console.error("Failed to exit view-as mode:", error);
      toast.error("Failed to exit view-as mode");
    } finally {
      endTransition();
    }
  }, [previousRole, resetToOriginalRole, startTransition, endTransition, queryClient]);

  /**
   * Check if user can switch to a specific role
   */
  const canSwitchTo = useCallback(
    (targetRole: NavRole): boolean => {
      // Admin can switch to any role
      if (user?.role === "admin") return true;

      // Other roles need specific permissions (implement based on your rules)
      // This is a simplified check - expand based on your ViewAsRules
      return false;
    },
    [user?.role]
  );

  /**
   * Get the effective role for permission checks
   * Returns the active (switched) role, not the user's actual role
   */
  const getEffectiveRole = useCallback((): NavRole => {
    return activeRole;
  }, [activeRole]);

  /**
   * Check if currently viewing as a different role
   */
  const isViewingAsOther = previousRole !== null && activeRole !== user?.role;

  return {
    // State
    activeRole,
    previousRole,
    isTransitioning,
    isViewingAsOther,
    originalRole: user?.role as NavRole | undefined,

    // Actions
    switchPersona,
    exitViewAs,
    canSwitchTo,
    getEffectiveRole,
  };
}
