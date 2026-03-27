import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NavRole } from "@/constants/navLinks";

interface AdminPersonaSwitchState {
  activeRole: NavRole;
  setActiveRole: (role: NavRole) => void;
}

export const useAdminPersonaSwitchStore = create<AdminPersonaSwitchState>()(
  persist(
    (set) => ({
      activeRole: "admin",
      setActiveRole: (activeRole) => set({ activeRole }),
    }),
    {
      name: "admin-persona-switch-storage",
    }
  )
);
