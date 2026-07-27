"use client";
import React from "react";
import Image from "next/image";
import logo from "../../public/svg/h-logo.svg";
import { Search } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  // DrawerFooter,
} from "@heroui/drawer";
import RenderNavRoutes from "./RenderNavRoutes";
import { RxHamburgerMenu } from "react-icons/rx";
import Logout from "./Logout";

const TopBarActions = () => {
  const [open, setOpen] = React.useState(false);
  const handleDrawerOpen = () => setOpen(true);

  return (
    <>
      <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 transition-colors focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-[0_1px_10px_rgba(0,142,211,0.10)] lg:flex">
        <Search size={18} className="text-primary" />
        <input
          className="w-40 bg-transparent text-sm outline-none placeholder:text-gray-400 xl:w-56"
          placeholder="Search"
        />
      </div>
      <RxHamburgerMenu
        onClick={handleDrawerOpen}
        className="lg:hidden cursor-pointer"
        size={25}
        color="#008ED3"
      />

      {/* Drawer */}
      <Drawer className="bg-white" isOpen={open} onOpenChange={setOpen}>
        <DrawerContent className="py-4">
          {(onClose) => (
            <>
              <DrawerHeader>
                <Image
                  src={logo}
                  alt="Logo"
                  width={135}
                  height={35}
                  className="mb-10 ml-7"
                  priority
                />
              </DrawerHeader>
              <DrawerBody>
                <RenderNavRoutes onClose={onClose} />
                <Logout />
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default TopBarActions;
