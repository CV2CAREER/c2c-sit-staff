"use client";

import { ChevronLeft } from "lucide-react";

interface CollapseToggleProps {
  onClick: () => void;
  collapsed: boolean;
}

export default function CollapseToggle({ onClick, collapsed }: CollapseToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rail-collapse-btn"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
    >
      <ChevronLeft size={16} />
    </button>
  );
}
