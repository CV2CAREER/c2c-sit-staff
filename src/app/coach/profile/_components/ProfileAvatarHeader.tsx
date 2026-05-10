"use client";

import React from "react";
import { IoMdTime } from "react-icons/io";
import addPhotoIcon from "@/assets/svg/add-photo-icon.svg";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";


const ProfileAvatarHeader: React.FC = async () => {
  const { user } = useAuth();
  const userName: string = user ? `${user.firstName} ${user.lastName}` : "";
  const firstLetter = userName.charAt(0);
  const role = user?.role || "Coach";
  const isUserEmailVerified: boolean = user?.isEmailVerified || false;

    
  return (
    <section className="flex justify-between items-center bg-white rounded-md p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="relative w-[70px] h-[70px] flex items-center justify-center bg-lightblue rounded-full">
          <div className="w-full h-full flex items-center justify-center bg-lightblue text-blue text-xl font-bold p-3 rounded-full">
            {firstLetter}
          </div>
          <div className="absolute h-full w-full flex items-center justify-center bg-gray-900 bg-opacity-20 rounded-full">
            <Image
              src={addPhotoIcon}
              alt="add Photo Icon"
              height={45}
              width={45}
            />
          </div>
        </div>

        <div className="flex flex-col ml-3">
          <h1 className="text-2xl font-bold mb-3">{userName}</h1>
          <div className="flex items-center gap-3">
            <p className="bg-gray-100 text-gray-500 text-[11px] font-semibold capitalize px-2 py-[1px] rounded-md">
              {role}
            </p>
            {isUserEmailVerified ? (
                <p className="text-green-500 text-[11px] font-semibold">Verified</p>
              ) : (
              <div className="flex items-center gap-1 text-[#FFA500] text-[11px] font-semibold">
                <IoMdTime />
                <p>Unverified</p>
              </div>
              )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileAvatarHeader;
