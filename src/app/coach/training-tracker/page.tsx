"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CoachTrainingTrackerPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin training tracker page
    // Coaches should have access to the same training tracker interface
    router.push("/admin/training-tracker");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Training Tracker...</p>
      </div>
    </div>
  );
}
