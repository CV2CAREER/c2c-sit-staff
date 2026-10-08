"use client";

import React from "react";
import Link from "next/link";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import axiosInstance from "@/services/api-client";
import { ASSISTANT_CLIENT_ACCESS } from "@/constants/apiEndpoints/admin.endpoint";
import { Button } from "@/components/ui/button";

const NOT_ASSIGNED_FALLBACK =
  "You can't view this client because they aren't assigned to you. If you need access, please ask an admin to assign them to you.";

interface PcClientAccessGuardProps {
  clientId: string;
  /** Where "Back" takes the PC — their own client list. */
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}

/**
 * PC client pages (/pc/users/[id], /pc/campaign-mgt/client/[id]) render only
 * for clients assigned to the signed-in PC. Access is not assignment (C2C-261).
 */
export default function PcClientAccessGuard({
  clientId,
  backHref,
  backLabel,
  children,
}: PcClientAccessGuardProps) {
  const { isLoading, error } = useQuery({
    queryKey: ["pc-client-access", clientId],
    queryFn: async () => {
      await axiosInstance.get(ASSISTANT_CLIENT_ACCESS(clientId));
      return true;
    },
    retry: false,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-500">
        Checking your access to this client…
      </div>
    );
  }

  if (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const notAssigned = status === 403;
    const message = notAssigned
      ? (axios.isAxiosError(error) && (error.response?.data as { message?: string })?.message) ||
        NOT_ASSIGNED_FALLBACK
      : "We couldn't check your access to this client right now. Please refresh the page and try again.";

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white px-8 py-10 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {notAssigned ? "This client isn't assigned to you" : "Something went wrong"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{message}</p>
          <Button asChild className="mt-6">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
