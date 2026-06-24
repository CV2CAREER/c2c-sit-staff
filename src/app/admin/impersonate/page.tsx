"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function ImpersonatePage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const login = async () => {
      try {
        const token = params.get("token");

        if (!token) {
          toast.error("Invalid impersonation link");
          router.replace("/login");
          return;
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/view-as-user-login?token=${encodeURIComponent(
            token,
          )}`,
        );

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Login failed");
        }

        localStorage.setItem("accessToken", result.accessToken);

        localStorage.setItem("isImpersonating", "true");

        localStorage.setItem("readOnly", "true");

        localStorage.setItem("impersonatedUser", JSON.stringify(result.user));

        toast.success(`Viewing as ${result.user.email}`);

        router.replace("/dashboard");
      } catch (error: any) {
        toast.error(error.message || "Failed to impersonate user");

        router.replace("/login");
      }
    };

    login();
  }, [params, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Signing in...</p>
    </div>
  );
}
