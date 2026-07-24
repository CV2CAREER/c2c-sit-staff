"use client";

import type { NavItem } from "./types";
import NavGroup from "./NavGroup";

interface SidebarNavProps {
  links: NavItem[];
  collapsed?: boolean;
  onPress?: () => void;
  onExpandRail?: () => void;
}

export default function SidebarNav({ links, collapsed = false, onPress, onExpandRail }: SidebarNavProps) {
  return (
    <nav className="nav-scroll">
      {links.map((link) => (
        <NavGroup
          key={link.name}
          item={link}
          collapsed={collapsed}
          onNavigate={onPress}
          onExpandRail={onExpandRail}
        />
      ))}
    </nav>
  );
}
