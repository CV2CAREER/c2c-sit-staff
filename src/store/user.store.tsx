"use client";

import { IUser } from "@/types/user.types";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { createContext, useContext, ReactNode, useRef } from "react";
import { persist } from "zustand/middleware";

interface AuthState {
  user: IUser | null;
  userEmail: string | null;
  staffAccessToken: string | null;
  isViewingAsUser: boolean;
  viewedByUserEmail: string | null;
  setUser: (user: IUser | null) => void;
  setUserEmail: (userEmail: string | null) => void;
  setAccessToken: (token: string | null) => void;
  setViewingAsUser: (isViewing: boolean, email: string | null) => void;
}

// Factory: create a fresh store (vanilla zustand) with persistence
export const createAuthStore = (init?: Partial<AuthState>) =>
  createStore<AuthState>()(
    persist(
      (set) => ({
        user: init?.user ?? null,
        userEmail: init?.userEmail ?? null,
        staffAccessToken: init?.staffAccessToken ?? null,
        isViewingAsUser: init?.isViewingAsUser ?? false,
        viewedByUserEmail: init?.viewedByUserEmail ?? null,
        setUser: (user) => set({ user }),
        setUserEmail: (userEmail) => set({ userEmail }),
        setAccessToken: (staffAccessToken) => set({ staffAccessToken }),
        setViewingAsUser: (isViewingAsUser, viewedByUserEmail) =>
          set({ isViewingAsUser, viewedByUserEmail }),
      }),
      {
        name: "c2c-staff-auth-storage", // localStorage key
      },
    ),
  );

// React context wrapper for the store
const AuthStoreContext = createContext<ReturnType<
  typeof createAuthStore
> | null>(null);

export function AuthStoreProvider({
  children,
  user,
  staffAccessToken,
}: {
  children: ReactNode;
  user?: IUser | null;
  staffAccessToken?: string | null;
}) {
  const storeRef = useRef<ReturnType<typeof createAuthStore>>();

  if (!storeRef.current) {
    storeRef.current = createAuthStore({ user, staffAccessToken });
  }

  return (
    <AuthStoreContext.Provider value={storeRef.current}>
      {children}
    </AuthStoreContext.Provider>
  );
}

// Hook to consume store in components
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext);
  if (!store) {
    throw new Error("useAuthStore must be used within AuthStoreProvider");
  }

  return useStore(store, selector);
}

