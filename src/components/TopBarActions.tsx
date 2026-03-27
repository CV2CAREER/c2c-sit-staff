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
      <div className="hidden lg:flex items-center gap-4 rounded-full bg-gray-100 p-2">
        <Search />
        <input className="bg-transparent outline-none" placeholder="Search" />
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
