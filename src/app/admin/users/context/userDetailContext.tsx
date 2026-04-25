import React, { createContext, useContext, useState, useMemo } from "react";
import { IUserDetail } from "@/types/user.types";

type AdminUserDetailContextType = {
    user: IUserDetail | null
    setUser: React.Dispatch<React.SetStateAction<IUserDetail | null>>
}

const AdminUserDetailContext = createContext<AdminUserDetailContextType | undefined>(undefined)

export const AdminUserDetailProvider = ({
    children
}:{
    children: React.ReactNode
}) => {
    const [user, setUser] = useState<IUserDetail | null>(null)
    const contextValue = React.useMemo(() => ({
        user,
        setUser
    }), [user, setUser]);

    return (
        <AdminUserDetailContext.Provider
            value={contextValue}
        >
            {children}
        </AdminUserDetailContext.Provider>
    )
}

export const useAdminUserDetailContext = () => {
    const context = useContext(AdminUserDetailContext)
    if (!context) {
    throw new Error("useAdminUserDetail hook must be used within a AdminUserDetailProvider");
  }
  return context;
}