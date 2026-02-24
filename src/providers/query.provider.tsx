"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode, useState } from "react";

interface Props {
  children: ReactNode;
}

export default function QueryProvider({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SilentErrorBoundary>{children}</SilentErrorBoundary>
    </QueryClientProvider>
  );
}

class SilentErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null; // 👈 completely suppress UI + overlay
    }

    return this.props.children;
  }
}
