import React, { useState } from "react";
import Icon from "../../../public/icons";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminPersonaSwitchStore } from "@/store/switchPersonaStore";
import { NavLink } from "@/constants/navLinks";
import { ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface StaffNavRoutesProps {
  links: NavLink[];
  onPress?: () => void;
}

const StaffNavRoutes = ({ links, onPress }: StaffNavRoutesProps) => {
  const currPath = usePathname();
  const [activeGroupId, setActiveGroupId] = useState<number | undefined>();
  const { activeRole, setActiveRole } = useAdminPersonaSwitchStore();
  const router = useRouter();
  const { user } = useAuth();
  const userRole = user?.role;

  return (
    <>
      {links.map((link: NavLink) => {
        // "Switch to Admin" link — only visible for admin users
        if (link.name === "Switch to Admin") {
          if (userRole !== "admin") return null;
          const LIcon = link.icon;
          return (
            <div
              key={link.name}
              onClick={() => {
                setActiveRole("admin");
                if (onPress) onPress();
                router.push("/admin/dashboard");
              }}
              className="flex flex-row gap-4 items-center my-1 rounded-md text-sm p-2 cursor-pointer text-gray-600 hover:bg-lightblue"
            >
              <LIcon />
              <p>{link.name}</p>
            </div>
          );
        }

        if (link.groupId && link.children) {
          const LParentIcon = link.icon;
          const isGroupActive = activeGroupId === link.groupId || 
            link.children.some(child => child.href === currPath);
          
          return (
            <Dropdown key={link.name}>
              <DropdownTrigger className="cursor-pointer">
                <div
                  className={`flex flex-row gap-4 my-1 items-center rounded-md p-2 cursor-pointer text-sm ${isGroupActive ? "text-blue bg-lightblue font-bold" : "text-gray-600"}`}
                >
                  <LParentIcon />
                  <p>{link.name}</p>
                  <Icon name="caretDown" />
                </div>
              </DropdownTrigger>
              <DropdownMenu
                color="primary"
                variant="solid"
                className="bg-lightblue rounded-md shadow-md"
              >
                <>
                  {link.children.map((child, childIdx) => {
                    const isChildActive = child.href === currPath;
                    const LChildIcon = child.icon;
                    return (
                      <DropdownItem
                        onPress={() => {
                          setActiveGroupId(link.groupId);
                          if (onPress) onPress();
                          if (link.name === "Switch Persona" && child.role) {
                            setActiveRole(child.role as any);
                          }
                        }}
                        className={`hover:bg-blue hover:text-white ${isChildActive ? "bg-blue text-white" : "text-gray-600"}`}
                        key={`${child.name}-${childIdx}`}
                      >
                        <Link
                          className="flex gap-3"
                          href={child.href}
                          key={child.name}
                        >
                          <LChildIcon />
                          {child.name}
                        </Link>
                      </DropdownItem>
                    );
                  })}
                </>
              </DropdownMenu>
            </Dropdown>
          );
        } else {
          const LIcon = link.icon;
          const isActive = link.href === currPath || (link.href !== "/" && currPath?.startsWith(link.href!));
          return (
            <Link
              key={link.name}
              href={link.href!}
              onClick={() => {
                setActiveGroupId(undefined);
                if (onPress) onPress();
              }}
              className={`flex flex-row gap-4 items-center my-1 rounded-md text-sm p-2 cursor-pointer ${isActive ? "text-blue font-bold bg-lightblue" : "text-gray-600"}`}
            >
              <LIcon />
              <p>{link.name}</p>
            </Link>
          );
        }
      })}
    </>
  );
};

export default StaffNavRoutes;
