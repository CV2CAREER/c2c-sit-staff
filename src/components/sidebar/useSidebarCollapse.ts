"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

export const SIDEBAR_NO_FLASH_SCRIPT = `(function(){try{var v=localStorage.getItem('${STORAGE_KEY}');if(v==='1'){document.documentElement.classList.add('rail-collapsed');}}catch(e){}})();`;

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(document.documentElement.classList.contains("rail-collapsed"));
  }, []);

  const applyCollapsedState = (next: boolean) => {
    document.documentElement.classList.toggle("rail-collapsed", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // localStorage unavailable (private mode, etc.) — collapse state just won't persist
    }
  };

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      applyCollapsedState(next);
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    applyCollapsedState(false);
    setCollapsed(false);
  }, []);

  return { collapsed, toggle, expand };
}
