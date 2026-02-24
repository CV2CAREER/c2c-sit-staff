import { useAuthStore } from "@/store/user.store";
import { createContext, useContext, ReactNode } from "react";

interface DashboardDataContextType {}

const DashboardDataContext = createContext<
  DashboardDataContextType | undefined
>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const stateUser = useAuthStore((s) => s.user);

  return (
    <DashboardDataContext.Provider value={{}}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error(
      "useDashboardData must be used within DashboardDataProvider",
    );
  }
  return context;
}
