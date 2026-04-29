import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NavRole } from "@/constants/navLinks";

interface AdminPersonaSwitchState {
  activeRole: NavRole;
  previousRole: NavRole | null;
  isTransitioning: boolean;
  lastSwitchTimestamp: number | null;
  setActiveRole: (role: NavRole) => void;
  startTransition: () => void;
  endTransition: () => void;
  resetToOriginalRole: () => void;
}

export const useAdminPersonaSwitchStore = create<AdminPersonaSwitchState>()(
  persist(
    (set, get) => ({
      activeRole: "admin",
      previousRole: null,
      isTransitioning: false,
      lastSwitchTimestamp: null,

      setActiveRole: (activeRole) => {
        const currentRole = get().activeRole;
        set({
          activeRole,
          previousRole: currentRole,
          lastSwitchTimestamp: Date.now(),
        });
      },

      startTransition: () => set({ isTransitioning: true }),

      endTransition: () => set({ isTransitioning: false }),

      resetToOriginalRole: () => {
        const previousRole = get().previousRole;
        if (previousRole) {
          set({
            activeRole: previousRole,
            previousRole: null,
            lastSwitchTimestamp: Date.now(),
          });
        }
      },
    }),
    {
      name: "admin-persona-switch-storage",
      partialize: (state) => ({
        activeRole: state.activeRole,
        previousRole: state.previousRole,
      }),
    }
  )
);
