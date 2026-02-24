"use client";

import { IUser } from "@/types/user.types";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { createContext, useContext, ReactNode } from "react";

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  setUser: (user: IUser | null) => void;
  setAccessToken: (token: string | null) => void;
}

// Factory: create a fresh store (vanilla zustand)
export const createAuthStore = (init?: Partial<AuthState>) =>
  createStore<AuthState>((set) => ({
    user: init?.user ?? null,
    accessToken: init?.accessToken ?? null,
    setUser: (user) => set({ user }),
    setAccessToken: (accessToken) => set({ accessToken }),
  }));

// React context wrapper for the store
const AuthStoreContext = createContext<ReturnType<
  typeof createAuthStore
> | null>(null);

export function AuthStoreProvider({
  children,
  user,
  accessToken,
}: {
  children: ReactNode;
  user: IUser | null;
  accessToken: string | null;
}) {
  const store = createAuthStore({ user, accessToken }); // initialize synchronously

  return (
    <AuthStoreContext.Provider value={store}>
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
