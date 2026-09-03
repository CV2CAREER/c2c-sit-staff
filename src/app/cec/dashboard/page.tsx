"use client";

import React from "react";
import CECKPICard from "@/components/cec/CECKPICard";
import CECTrackerHeader from "@/components/cec/CECTrackerHeader";
import { BookOpen, ClipboardList, Bug, AlertTriangle, DollarSign, Megaphone, Target } from "lucide-react";
import Link from "next/link";

const trackers = [
  { name: "Daily Log", href: "/cec/daily-log", icon: ClipboardList, description: "Track daily client interactions" },
  { name: "Issue Burndown", href: "/cec/issue-burndown", icon: Bug, description: "Monitor and resolve client issues" },
  { name: "Complaints", href: "/cec/complaints", icon: AlertTriangle, description: "Manage client complaints" },
  { name: "Referral Payouts", href: "/cec/referral-payouts", icon: DollarSign, description: "Track referral payments" },
  { name: "Sales Outreach", href: "/cec/sales-outreach", icon: Megaphone, description: "Track prospect outreach" },
  { name: "Ambassador Scouting", href: "/cec/ambassador-scouting", icon: Target, description: "Pipeline for ambassadors" },
];

export default function CECDashboardPage() {
  return (
    <section className="flex flex-col gap-4 mt-4">
      <CECTrackerHeader title="CEC Dashboard" subtitle="Client Engagement Consultant Console" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trackers.map((tracker) => (
          <Link key={tracker.name} href={tracker.href}>
            <div className="bg-white rounded-xl border border-[#E9EEF3] p-5 flex flex-col gap-3 hover:border-[#008ED3] hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#008ED3]/10 flex items-center justify-center group-hover:bg-[#008ED3]/20 transition-colors">
                  <tracker.icon className="w-5 h-5 text-[#008ED3]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1A2332] group-hover:text-[#008ED3] transition-colors">{tracker.name}</h3>
                  <p className="text-xs text-[#9AA5B4]">{tracker.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
