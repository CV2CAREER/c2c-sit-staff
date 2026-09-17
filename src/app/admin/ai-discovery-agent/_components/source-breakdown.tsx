"use client";

import React from "react";
import type { DiscoverySourceBreakdown } from "@/types/discovery-agent.types";

interface Props {
  breakdown: DiscoverySourceBreakdown[];
}

export default function SourceBreakdown({ breakdown }: Props) {
  if (!breakdown || breakdown.length === 0) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-[13px] font-bold">Source Breakdown — Last 24 Hours</span>
        </div>
        <div className="p-8 text-center text-sm text-gray-400">No data yet</div>
      </div>
    );
  }

  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <div className="bg-white border border-[var(--border)] rounded-[var(--radius-lg)] shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="text-[13px] font-bold">Source Breakdown — Last 24 Hours</span>
      </div>
      <div className="p-4">
        {breakdown.map((item) => (
          <div key={item.name} className="flex items-center gap-2.5 py-1.5 border-b border-gray-100 last:border-b-0">
            <span className="text-[11.5px] font-medium min-w-[90px]">{item.name}</span>
            <div className="flex-1 h-[5px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-[11.5px] font-bold min-w-[30px] text-right">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
