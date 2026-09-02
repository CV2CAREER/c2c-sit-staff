"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { PipelineRangeKey } from "@/hooks/api/admin/types";
import { PauseCircle, GraduationCap, UserX, Rocket, CheckCircle2, Waypoints } from "lucide-react";

const RANGE_OPTIONS: { key: PipelineRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "all", label: "All time" },
];

const PIPELINE_CARDS = [
  {
    key: "paidNotInFlight" as const,
    label: "Paid · Not In-Flight",
    sub: "on hold, campaign still active",
    color: "#C23434",
    icon: PauseCircle,
  },
  {
    key: "onboarding" as const,
    label: "Onboarding",
    sub: "no active plan yet",
    color: "#B26A22",
    icon: GraduationCap,
  },
  {
    key: "unallocatedInFlight" as const,
    label: "Unallocated In-Flight",
    sub: "live, no controller assigned",
    color: "#7C3AED",
    icon: UserX,
  },
  {
    key: "inFlight" as const,
    label: "In-Flight",
    sub: "capitalized & active",
    color: "#1EB62D",
    icon: Rocket,
  },
  {
    key: "completed" as const,
    label: "Completed",
    sub: "campaign has ended",
    color: "#008ED3",
    icon: CheckCircle2,
  },
];

// The dashboard's main/lead card — client pipeline funnel by stage.
export default function PipelineOverview() {
  const [range, setRange] = useState<PipelineRangeKey>("all");

  const { pipelineStatsDomain } = useAdminQueries({
    fetchPipelineStats: true,
    pipelineRange: range,
  });

  const { data, isLoading } = pipelineStatsDomain;

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Waypoints size={18} />
            </span>
            Pipeline
          </CardTitle>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === opt.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 p-4">
        {PIPELINE_CARDS.map((card) => {
          const Icon = card.icon;
          const value = data?.[card.key] ?? 0;
          return (
            <div
              key={card.key}
              className="rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  {card.label}
                </p>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${card.color}1A`, color: card.color }}
                >
                  <Icon size={14} />
                </span>
              </div>
              {isLoading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                <h2 className="text-3xl font-semibold" style={{ color: card.color }}>
                  {value.toLocaleString()}
                </h2>
              )}
              <p className="mt-1.5 text-[11.5px] text-gray-500">{card.sub}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
