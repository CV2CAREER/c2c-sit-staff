"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { VaAllocationItem, VaStats } from "@/hooks/api/admin/types";
import { ListChecks } from "lucide-react";
import { initials, avatarColors } from "./avatar-utils";

type RangeKey = keyof VaStats;

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
  { key: "quarterly", label: "Quarter" },
  { key: "yearly", label: "Year" },
];

const PREVIEW_COUNT = 3;

function clientPreview(clients: string[]): string {
  if (clients.length === 0) {
    return "No clients assigned";
  }
  const shown = clients.slice(0, PREVIEW_COUNT);
  const rest = clients.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
}

// Controller workload — a compact, sortable-by-volume summary of the same
// data VaAllocation shows as per-PC cards, reusing its query so this adds
// no extra fetch.
export default function ControllerWorkload() {
  const [range, setRange] = useState<RangeKey>("monthly");
  const { vaAllocationsDomain } = useAdminQueries({ fetchVaAllocations: true });
  const { data, isLoading } = vaAllocationsDomain;

  const sorted = useMemo(() => {
    const allocations: VaAllocationItem[] = data?.parsedData?.result ?? [];
    return [...allocations].sort((a, b) => (b.stats?.[range] ?? 0) - (a.stats?.[range] ?? 0));
  }, [data, range]);

  const maxValue = Math.max(1, ...sorted.map((pc) => pc.stats?.[range] ?? 0));
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "";

  return (
    <Card className="overflow-hidden rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardHeader className="border-b border-gray-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ListChecks size={18} />
              </span>
              Placement controller workload
            </CardTitle>
            <p className="mt-1 pl-11 text-xs text-gray-500">
              Applications {rangeLabel.toLowerCase()}, and how much of the book each controller carries.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/placement-management/assignments"
              className="whitespace-nowrap text-xs font-medium text-primary hover:underline"
            >
              Manage allocation →
            </Link>
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === r.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No placement controllers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Controller
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Clients
                  </th>
                  <th className="w-[38%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Applications {rangeLabel}
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Per client
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Today
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((pc) => {
                  const [bg, fg] = avatarColors(pc.name);
                  const value = pc.stats?.[range] ?? 0;
                  const clientCount = pc.clients?.length ?? 0;
                  const perClient = clientCount ? Math.round(value / clientCount) : null;
                  const today = pc.stats?.daily ?? 0;
                  const barWidth = Math.max(2, (value / maxValue) * 100);

                  return (
                    <tr key={pc.name} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                            style={{ background: bg, color: fg }}
                          >
                            {initials(pc.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-gray-900">{pc.name}</p>
                            <p className="max-w-[280px] truncate text-[11.5px] text-gray-500">
                              {clientPreview(pc.clients ?? [])}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            clientCount >= 10 ? "bg-[#FFFAF5] text-[#B26A22]" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {clientCount}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="w-12 shrink-0 text-right text-[12.5px] font-semibold text-gray-900">
                            {value.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[12.5px] text-gray-600">
                        {perClient !== null ? perClient.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            today > 0 ? "bg-[#F0FFF1] text-[#1EB62D]" : "bg-[#FDEEEE] text-[#C23434]"
                          }`}
                        >
                          {today}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
