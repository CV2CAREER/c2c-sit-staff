"use client";
import { LogOut } from "lucide-react";
import CustomUserLogoutModal from "./modals/LogoutModal";
import { useLogout } from "@/hooks/useLogout";

export default function Logout() {

  const { isModalOpen, setIsModalOpen, handleLogout, isLoading } = useLogout();

  return (
    <div
      onClick={() => setIsModalOpen(true)}
      className="flex flex-row gap-4 items-center text-gray-600 p-2 rounded-md hover:bg-lightblue cursor-pointer mt-auto"
    >
      <LogOut />
      <p>Logout</p>
      <CustomUserLogoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(prev => (!prev))}
        onConfirm={handleLogout}
        isLoading={isLoading}
      />
    </div>
  );
}
