"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { Target } from "lucide-react";

// Coverage = how in-flight clients (capitalized INFLIGHT/FLIGHT) are spread
// across placement controllers, derived straight from the campaign model:
// a client with an AssignedPCName/AssignedPCEmail is allocated, one without
// is unallocated, and grouping the allocated ones by AssignedPCName gives
// each controller's load and the top controller's share of the book.
// Always shows the live, all-time snapshot (not tied to Pipeline's own
// range toggle), since workload coverage is a current-state view.
export default function CoverageOverview() {
  const { pipelineStatsDomain } = useAdminQueries({
    fetchPipelineStats: true,
    pipelineRange: "all",
  });

  const { data, isLoading } = pipelineStatsDomain;
  const coverage = data?.coverage;

  const totalInFlight = coverage?.totalInFlight ?? 0;
  const allocated = coverage?.allocated ?? 0;
  const unallocated = coverage?.unallocated ?? 0;
  const controllerCount = coverage?.controllerCount ?? 0;
  const allocatedPct = totalInFlight > 0 ? (allocated / totalInFlight) * 100 : 0;

  let narrative = "No active campaigns yet.";
  if (totalInFlight > 0 && allocated === 0) {
    narrative = `No controllers assigned yet — all ${totalInFlight.toLocaleString()} in-flight client${totalInFlight === 1 ? "" : "s"} ${totalInFlight === 1 ? "is" : "are"} unallocated.`;
  } else if (allocated > 0 && coverage?.topController) {
    const { name, sharePct } = coverage.topController;
    narrative = `${allocated.toLocaleString()} client${allocated === 1 ? "" : "s"} ${allocated === 1 ? "is" : "are"} assigned across ${controllerCount} controller${controllerCount === 1 ? "" : "s"}. Load runs from ${coverage.minLoad} to ${coverage.maxLoad} clients each — ${name} carries ${sharePct.toFixed(0)}% of the book.`;
  }

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Target size={18} />
            </span>
            Coverage
          </CardTitle>
          {!isLoading && (
            <span className="text-xs text-gray-500">
              {controllerCount} controller{controllerCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
        ) : (
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-3xl font-semibold" style={{ color: unallocated > 0 ? "#C23434" : "#1EB62D" }}>
              {unallocated.toLocaleString()}
            </h2>
            <span className="text-[12.5px] text-gray-600">
              clients unallocated of {totalInFlight.toLocaleString()}
            </span>
          </div>
        )}

        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#FDEEEE]">
          {!isLoading && <div className="h-full bg-[#1EB62D]" style={{ width: `${allocatedPct}%` }} />}
        </div>

        {isLoading ? (
          <div className="mt-3 space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-gray-600">{narrative}</p>
        )}
      </CardContent>
    </Card>
  );
}
