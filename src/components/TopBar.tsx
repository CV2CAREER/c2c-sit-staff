"use client";
import React from "react";
import { Bell, LucideVerified } from "lucide-react";
import { IoMdArrowDropdown, IoMdTime } from "react-icons/io";
import { Chip } from "@heroui/chip";
import TopBarActions from "./TopBarActions";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  title: string;
}

const TopBar = ({ title }: TopBarProps) => {
  const { user } = useAuth();
  const userName: string = user ? `${user.firstName} ${user.lastName}` : "";
  const firstLetter = userName.charAt(0);
  const isUserEmailVerified: boolean = user?.isEmailVerified || false;

  return (
    <section className="topbar">
      <div className="flex items-center">
        <div className="w-[35px] h-[35px] bg-gray-300 flex items-center justify-center mr-4 rounded-full">
          <Bell size={15} />
        </div>

        <div className="w-[35px] h-[35px] bg-lightblue text-blue text-[15px] font-bold flex items-center justify-center p-3 rounded-full">
          {firstLetter}
        </div>
        <div className="flex flex-col ml-3">
          <div className="flex items-center gap-4 text-md">
            <h1>{userName}</h1>
            <IoMdArrowDropdown />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Chip size="sm" className="capitalize">
              {title}
            </Chip>
            {isUserEmailVerified === true ? (
              <Chip
                size="sm"
                color="success"
                className="*:flex items-center gap-1 font-semibold capitalize text-white"
              >
                <LucideVerified size={13} />
                <span>Verified</span>
              </Chip>
            ) : (
              <Chip
                size="sm"
                color="warning"
                className="*:flex *:items-center *:gap-1 *:font-semibold *:capitalize *:text-white"
              >
                <IoMdTime />
                <span>Unverified</span>
              </Chip>
            )}
          </div>
        </div>
      </div>
      <TopBarActions />
    </section>
  );
};

export default TopBar;
