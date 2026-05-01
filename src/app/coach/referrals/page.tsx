"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CoachReferralsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin referral management page
    // Coaches should have access to the same referral interface
    router.push("/admin/referral-management");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Referral Management...</p>
      </div>
    </div>
  );
}
