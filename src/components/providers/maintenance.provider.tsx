import React, { createContext, useContext, ReactNode } from "react";

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined);

/**
 * This provider checks for maintenance mode by reading an environment variable
 * or can be toggled dynamically for testing purposes.
 * 
 * To enable maintenance mode, set the environment variable:
 * NEXT_PUBLIC_MAINTENANCE_MODE=true
 */
export const MaintenanceProvider = ({ children }: { children: ReactNode }) => {
  // Check environment variable - this is evaluated on the client
  const isMaintenanceMode =
    typeof window !== "undefined" &&
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenanceMode = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error("useMaintenanceMode must be used within MaintenanceProvider");
  }
  return context;
};