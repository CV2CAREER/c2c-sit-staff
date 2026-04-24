"use client";

import React, { ReactNode } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./toast.provider";
import QueryProvider from "./query.provider";
import { AuthStoreProvider } from "@/store/user.store";
type Props = {
  children: ReactNode;
};

const AppProvider = ({ children }: Props) => {
  return (
    <QueryProvider>
      <AuthStoreProvider accessToken={null} user={null}>
        <ToastProvider>{children}</ToastProvider>
      </AuthStoreProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryProvider>
  );
};

export default AppProvider;
