"use client";

import { useState } from "react";
import {
  useMissingInfoTemplates,
  useRequestStats,
} from "@/hooks/api/missing-info-template.api";
import TemplatesClient from "../../missing-info-templates/_components/TemplatesClient";
import MissingInfoRequestsPageClient from "../../missing-info-requests/_components/MissingInfoRequestsPageClient";

type Screen = "templates" | "requests";

const SCREEN_TABS: { key: Screen; label: string }[] = [
  { key: "templates", label: "Templates" },
  { key: "requests", label: "Outstanding Requests" },
];

export default function MissingInformationClient() {
  const [screen, setScreen] = useState<Screen>("templates");
  const [staffQueueFocus, setStaffQueueFocus] = useState(0);

  // After a Housekeeping task is raised, jump to Outstanding Requests -> Staff.
  const showStaffQueue = () => {
    setScreen("requests");
    setStaffQueueFocus((n) => n + 1);
  };

  const { templatesDomain } = useMissingInfoTemplates();
  const { stats } = useRequestStats();

  const counts: Record<Screen, number> = {
    templates: templatesDomain.data.length,
    requests: stats.total,
  };

  return (
    <div className="bg-[#F3F4F6] flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white px-7 py-4 border-b border-[#E5E9EF]">
        <div className="flex items-center gap-3">
          <a
            href="/admin/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E9EF] transition-colors text-[#10365A]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </a>
          <h1 className="text-[20px] font-bold text-[#10365A] m-0">
            Missing Information
          </h1>
        </div>
      </div>

      {/* Screen tabs */}
      <div className="flex items-center gap-6 bg-white px-7 py-3.5 border-b border-[#E5E9EF]">
        {SCREEN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setScreen(tab.key)}
            className={`text-[13px] font-semibold pb-1 transition-colors ${
              screen === tab.key
                ? "text-[#0B96D6] border-b-2 border-[#0B96D6]"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
          >
            {tab.label}{" "}
            <span
              className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-full ${
                screen === tab.key
                  ? "bg-[#0B96D6] text-white"
                  : "bg-[#EAF4FE] text-[#0B96D6]"
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/*
        Both panels stay mounted; the inactive one is hidden with CSS.
        Switching tabs therefore never unmounts either side, so in-progress
        work and view settings on both tabs survive the switch (51-001 DoD 4).
      */}
      <div className={screen === "templates" ? "block" : "hidden"}>
        <TemplatesClient onTaskRaised={showStaffQueue} />
      </div>
      <div className={screen === "requests" ? "block" : "hidden"}>
        <MissingInfoRequestsPageClient
          onSwitchScreen={setScreen}
          staffQueueFocus={staffQueueFocus}
        />
      </div>
    </div>
  );
}
