"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "./types";
import type { NavRole } from "@/constants/navLinks";
import { useAdminPersonaSwitchStore } from "@/store/switchPersonaStore";

function isActivePath(pathname: string, href?: string) {
  if (!href || href === "#") return false;
  return pathname === href || pathname.startsWith(href + "/");
}

interface NavGroupProps {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  onExpandRail?: () => void;
}

export default function NavGroup({ item, collapsed, onNavigate, onExpandRail }: NavGroupProps) {
  const pathname = usePathname();
  const setActiveRole = useAdminPersonaSwitchStore((s) => s.setActiveRole);
  const hasChildren = !!item.children?.length;
  const childActive = hasChildren && item.children!.some((c) => isActivePath(pathname, c.href));
  const [open, setOpen] = useState(childActive);

  const Icon = item.icon;

  const handleGroupClick = () => {
    setOpen((prev) => !prev);
  };

  // "Switch Persona" children carry a role, not a page to jump straight to —
  // collapsed click should reveal the submenu instead of guessing a target.
  const isPersonaSwitcher = item.name === "Switch Persona";

  const firstChildHref =
    hasChildren && !isPersonaSwitcher ? item.children!.find((c) => c.href)?.href : undefined;

  const handleCollapsedPersonaClick = () => {
    setOpen(true);
    onExpandRail?.();
  };

  if (!hasChildren) {
    const handleClick = () => {
      if (item.action === "switch-admin") {
        setActiveRole("admin");
      }
      onNavigate?.();
    };

    return (
      <Link
        href={item.href ?? "#"}
        onClick={handleClick}
        className={`nav-item${isActivePath(pathname, item.href) ? " active" : ""}`}
      >
        <span className="nav-rail-thread" />
        <span className="nav-item-icon">
          <Icon size={18} />
        </span>
        <span className="nav-item-label">{item.name}</span>
        {item.badge !== undefined && <span className="nav-badge">{item.badge}</span>}
      </Link>
    );
  }

  const groupHeader = collapsed && firstChildHref ? (
    <Link
      href={firstChildHref}
      onClick={onNavigate}
      className={`nav-item${childActive ? " active" : ""}`}
    >
      <span className="nav-rail-thread" />
      <span className="nav-item-icon">
        <Icon size={18} />
      </span>
      <span className="nav-item-label">{item.name}</span>
      <span className="nav-tip">{item.name}</span>
    </Link>
  ) : (
    <div
      className={`nav-item${childActive ? " active" : ""}`}
      onClick={collapsed && isPersonaSwitcher ? handleCollapsedPersonaClick : handleGroupClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (collapsed && isPersonaSwitcher ? handleCollapsedPersonaClick : handleGroupClick)();
        }
      }}
    >
      <span className="nav-rail-thread" />
      <span className="nav-item-icon">
        <Icon size={18} />
      </span>
      <span className="nav-item-label">{item.name}</span>
      <span className="nav-item-chevron">
        <ChevronRight size={14} />
      </span>
      {collapsed && <span className="nav-tip">{item.name}</span>}
    </div>
  );

  return (
    <div className={`nav-group${open && !collapsed ? " open" : ""}`}>
      {groupHeader}
      <div className="nav-children">
        {item.children!.map((child) => (
          <NavChildLink
            key={child.name}
            item={child}
            onNavigate={onNavigate}
            onPersonaSwitch={setActiveRole}
          />
        ))}
      </div>
    </div>
  );
}

function NavChildLink({
  item,
  onNavigate,
  onPersonaSwitch,
}: {
  item: NavItem;
  onNavigate?: () => void;
  onPersonaSwitch: (role: NavRole) => void;
}) {
  const pathname = usePathname();

  const handleClick = () => {
    if (item.role) {
      onPersonaSwitch(item.role);
    }
    onNavigate?.();
  };

  return (
    <Link
      href={item.href ?? "#"}
      onClick={handleClick}
      className={`nav-child${isActivePath(pathname, item.href) ? " active" : ""}`}
    >
      <span className="child-dot" />
      {item.name}
    </Link>
  );
}
