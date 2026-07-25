"use client";

import Image from "next/image";
import logo from "../../../public/svg/h-logo.svg";
import logoIcon from "../../../public/svg/logo-icon.svg";
import { LogOut } from "lucide-react";
import { useSidebarCollapse } from "./useSidebarCollapse";
import CollapseToggle from "./CollapseToggle";
// import SidebarUserMeta from "./SidebarUserMeta";
import SidebarNav from "./SidebarNav";
import RenderNavRoutes from "../RenderNavRoutes";
import { useLogout } from "@/hooks/useLogout";
import CustomUserLogoutModal from "../modals/LogoutModal";

export default function Sidebar() {
  const { collapsed, toggle, expand } = useSidebarCollapse();
  const { isModalOpen, setIsModalOpen, handleLogout, isLoading } = useLogout();

  return (
    <aside className={`rail${collapsed ? " collapsed" : ""}`}>
      <div className="rail-head">
        <div className="rail-logo">
          {collapsed ? (
            <Image src={logoIcon} alt="CVtoCAREER" height={36} width={41} priority />
          ) : (
            <Image src={logo} alt="CVtoCAREER" height={30} width={139} priority />
          )}
        </div>
        <CollapseToggle collapsed={collapsed} onClick={toggle} />
      </div>

      {/* <SidebarUserMeta /> */}

      <RenderNavRoutes collapsed={collapsed} onExpandRail={expand} />

      <div className="rail-foot">
        <div className="rail-foot-item" onClick={() => setIsModalOpen(true)}>
          <span className="nav-item-icon">
            <LogOut size={18} />
          </span>
          <span>Log Out</span>
          {collapsed && <span className="nav-tip">Log Out</span>}
        </div>
      </div>

      <CustomUserLogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen((prev) => !prev)}
        onConfirm={handleLogout}
        isLoading={isLoading}
      />
    </aside>
  );
}
