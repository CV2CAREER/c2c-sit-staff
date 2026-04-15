"use client";

import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import { useAuthStore } from "@/store/user.store";

export default function DashboardHeader() {
  const user = useAuthStore((state) => state.user);

  return (
    <section className="flex w-full flex-wrap items-center justify-between gap-3 rounded-sm bg-gradient-to-r from-[#0066B2] from-[-11.61%] to-[#00BFF2] to-[103.59%] p-3 shadow-md sm:p-5">
      <div className="text-sm font-bold text-white md:text-xl">
        <h2 className="mb-3">
          Welcome back, {user?.firstName} {user?.lastName}
        </h2>
      </div>
      <TimeRangeSelector styles="bg-white" />
    </section>
  );
}
