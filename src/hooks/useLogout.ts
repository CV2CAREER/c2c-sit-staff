"use client";

import { useState } from "react";
import { useAuthMutations } from "./api/auth.api";

export const useLogout = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { logoutDomain } = useAuthMutations();
  const { logoutUser, logoutUserLoading } = logoutDomain;

  const handleLogout = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e && "preventDefault" in e) {
      e.preventDefault();
    }
    
    // The useAuthMutations logic handles clearing session, 
    // zustand store, and redirecting to /login automatically.
    logoutUser(null);
    
    // Close modal (in case redirection takes a moment)
    setIsModalOpen(false);
  };

  return {
    isModalOpen,
    setIsModalOpen,
    handleLogout,
    isLoading: logoutUserLoading,
  };
};
