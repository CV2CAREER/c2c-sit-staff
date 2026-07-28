"use client";

import { useAuth } from "@/hooks/useAuth";

function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export default function SidebarUserMeta() {
  const { user } = useAuth();

  const displayName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "—";

  return (
    <div className="rail-user">
      <div className="rail-avatar">{getInitials(displayName === "—" ? null : displayName)}</div>
      <div className="rail-user-meta">
        <div className="rail-user-name">{displayName}</div>
        <div className="rail-user-role">{user?.role ?? ""}</div>
      </div>
    </div>
  );
}
