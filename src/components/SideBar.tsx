"use client";
import Image from "next/image";
import React from "react";
import logo from "../../public/svg/h-logo.svg";
import RenderNavRoutes from "./RenderNavRoutes";
import Logout from "./Logout";

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div>
        <Image
          src={logo}
          alt="Logo"
          width={135}
          height={35}
          className="mb-10"
          priority
        />
      </div>
      <RenderNavRoutes />
      <Logout />
    </aside>
  );
};

export default Sidebar;
