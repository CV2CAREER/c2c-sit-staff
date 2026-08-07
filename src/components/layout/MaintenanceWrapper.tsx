"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import MaintenanceScreen from "@/components/layout/MaintenanceScreen";

// Helper to set a cookie
const setCookie = (name: string, value: string, days: number = 1) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

// Helper to get a cookie
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

const MaintenanceWrapper = ({ children }: { children: ReactNode }) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [bypassActive, setBypassActive] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    
    // Check if test bypass is enabled via URL param
    const testBypass = searchParams.get("testBypass");
    const bypassToken = process.env.NEXT_PUBLIC_TEST_BYPASS_TOKEN;
    
    // Check if bypass cookie exists
    const bypassCookie = getCookie("maintenance_bypass");
    
    // Check URL param first, then cookie
    let bypassValid = false;
    
    if (testBypass) {
      if (bypassToken && testBypass === bypassToken) {
        bypassValid = true;
        // Set cookie for persistence
        setCookie("maintenance_bypass", testBypass);
      } else if (!bypassToken && testBypass === "true") {
        bypassValid = true;
        setCookie("maintenance_bypass", "true");
      }
    } else if (bypassCookie) {
      // Check if cookie is valid
      if (bypassToken && bypassCookie === bypassToken) {
        bypassValid = true;
      } else if (!bypassToken && bypassCookie === "true") {
        bypassValid = true;
      }
    }
    
    setBypassActive(bypassValid);
    
    // Check environment variable for maintenance mode
    const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
    setIsMaintenanceMode(maintenanceMode);
    
    // Remove bypass parameter from URL after checking
    if (testBypass && bypassValid) {
      const url = new URL(window.location.href);
      url.searchParams.delete("testBypass");
      window.history.replaceState({}, "", url.toString());
    }
    
  }, [searchParams]);

  if (!isClient) {
    return <>{children}</>;
  }

  // If maintenance mode is on but bypass is active, allow access
  if (isMaintenanceMode && !bypassActive) {
    return <MaintenanceScreen />;
  }

  return <>{children}</>;
};

export default MaintenanceWrapper;