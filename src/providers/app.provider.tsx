"use client";

import React, { ReactNode } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastProvider } from "./toast.provider";
import QueryProvider from "./query.provider";
import { AuthStoreProvider } from "@/store/user.store";
type Props = {
  children: ReactNode;
};

const AppProvider = ({ children }: Props) => {
  return (
    <QueryProvider>
      <AuthStoreProvider staffAccessToken={null} user={null}>
        <ToastProvider>{children}</ToastProvider>
      </AuthStoreProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryProvider>
  );
};

export default AppProvider;
