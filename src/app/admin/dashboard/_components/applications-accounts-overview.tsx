"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminQueries } from "@/hooks/api/admin.api";
import {
  ClipboardList,
  Users,
  ShieldUser,
  ShieldCheck,
  GraduationCap,
  User,
  Handshake,
  BadgePercent,
  Cog,
  Award,
  type LucideIcon,
} from "lucide-react";

const PERIODS = [
  { key: "today" as const, label: "Today" },
  { key: "week" as const, label: "Week" },
  { key: "month" as const, label: "Month" },
  { key: "quarter" as const, label: "Quarter" },
  { key: "year" as const, label: "Year" },
];

type PeriodKey = "all" | (typeof PERIODS)[number]["key"];

// Role counts come from the same admin-analytics payload as the rest of this
// card (`userRoleCounts`, keyed by the backend Role enum plus the
// isAmbassador-derived "ambassador" bucket) — no separate fetch needed.
const ROLE_ROWS: { key: string; label: string; color: string; icon: LucideIcon }[] = [
  { key: "client", label: "Clients", color: "#1EB62D", icon: Users },
  { key: "assistant", label: "PC", color: "#008ED3", icon: ShieldUser },
  { key: "admin", label: "Admins", color: "#7C3AED", icon: ShieldCheck },
  { key: "coach", label: "Coaches", color: "#B26A22", icon: GraduationCap },
  { key: "guest", label: "Guests", color: "#0EA5E9", icon: User },
  { key: "partner", label: "Partners", color: "#EC4899", icon: Handshake },
  { key: "sales", label: "Sales", color: "#F59E0B", icon: BadgePercent },
  { key: "cse", label: "CSE", color: "#10B981", icon: Cog },
  { key: "ambassador", label: "Ambassadors", color: "#C23434", icon: Award },
];

export default function ApplicationsAccountsOverview() {
  const {
    totalApplicationsCard,
    applicationsCountDomain,
    applicationsPeriodBreakdownDomain,
    overallStatsDomain,
  } = useAdminQueries({
    fetchApplicationsCount: true,
    fetchApplicationsPeriodBreakdown: true,
    fetchOverallStats: true,
  });

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("all");

  const allTimeStat = { total: totalApplicationsCard.data ?? 0 };
  const periodBreakdown = applicationsPeriodBreakdownDomain.data;
  const isPeriodLoading = applicationsPeriodBreakdownDomain.isLoading;

  const isApplicationsLoading =
    selectedPeriod === "all" ? applicationsCountDomain.isLoading : isPeriodLoading;
  const activeStat = selectedPeriod === "all" ? allTimeStat : periodBreakdown?.[selectedPeriod];
  const totalApplications = activeStat?.total ?? 0;
  const periodLabel =
    selectedPeriod === "all" ? "All time" : PERIODS.find((p) => p.key === selectedPeriod)?.label ?? "All time";

  const isAccountsLoading = overallStatsDomain.isLoading;

  const roleCounts: Record<string, number> = overallStatsDomain.data?.userRoleCounts ?? {};
  // Ambassador is a flag on top of another role (e.g. a client can also be an
  // ambassador), so it's excluded from the total to avoid double-counting.
  const totalUsers = ROLE_ROWS.filter((r) => r.key !== "ambassador").reduce(
    (sum, r) => sum + (roleCounts[r.key] ?? 0),
    0,
  );

  const accountRows = ROLE_ROWS.map((r) => ({
    label: r.label,
    value: (roleCounts[r.key] ?? 0).toLocaleString(),
    color: r.color,
    icon: r.icon,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
      {/* Applications */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList size={18} />
            </span>
            Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">
              {periodLabel}
            </p>
            {isApplicationsLoading ? (
              <div className="mt-2 h-9 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <div className="mt-1 flex items-baseline gap-3">
                <h2 className="text-4xl font-semibold text-gray-900">
                  {totalApplications.toLocaleString()}
                </h2>
                <span className="text-xs text-gray-500">
                  {totalApplications === 0 ? "no activity yet" : "total applications"}
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {PERIODS.map((period) => {
              const isSelected = selectedPeriod === period.key;
              return (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => setSelectedPeriod(isSelected ? "all" : period.key)}
                  className={`rounded-lg border py-2 text-center transition-colors ${
                    isSelected
                      ? "border-primary bg-primary shadow-sm"
                      : "border-gray-100 bg-gray-50/60 hover:border-primary/30 hover:bg-white"
                  }`}
                >
                  <p className={`text-[11px] ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                    {period.label}
                  </p>
                  {isPeriodLoading ? (
                    <div
                      className={`mx-auto mt-1.5 h-4 w-8 animate-pulse rounded ${
                        isSelected ? "bg-white/30" : "bg-gray-200"
                      }`}
                    />
                  ) : (
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        isSelected ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {(periodBreakdown?.[period.key]?.total ?? 0).toLocaleString()}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-center text-[10.5px] text-gray-400">
            {selectedPeriod === "all"
              ? "Tap a period to see it as the headline total"
              : "Tap again to return to all time"}
          </p>
        </CardContent>
      </Card>

      {/* Accounts */}
      <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        <CardHeader className="border-b border-gray-100 p-4">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users size={18} />
            </span>
            Users
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3">
          <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">
              Total
            </p>
            {isAccountsLoading ? (
              <div className="mt-2 h-9 w-24 animate-pulse rounded bg-gray-200" />
            ) : (
              <div className="mt-1 flex items-baseline gap-3">
                <h2 className="text-4xl font-semibold text-gray-900">
                  {totalUsers.toLocaleString()}
                </h2>
                <span className="text-xs text-gray-500"></span>
              </div>
            )}

            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/70">
              {ROLE_ROWS.filter((r) => r.key !== "ambassador").map((r) => {
                const count = roleCounts[r.key] ?? 0;
                const sharePct = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
                return (
                  <div
                    key={r.key}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${sharePct}%`, background: r.color }}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {accountRows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${row.color}1A`, color: row.color }}
                  >
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] text-gray-500">{row.label}</p>
                    {isAccountsLoading ? (
                      <div className="mt-0.5 h-3.5 w-6 animate-pulse rounded bg-gray-200" />
                    ) : (
                      <p className="text-sm font-semibold leading-tight text-gray-900">
                        {row.value}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
