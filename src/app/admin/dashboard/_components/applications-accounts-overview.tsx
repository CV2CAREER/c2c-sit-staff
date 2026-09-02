"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { ClipboardList, Users } from "lucide-react";

const PERIODS = [
  { key: "today" as const, label: "Today" },
  { key: "week" as const, label: "Week" },
  { key: "month" as const, label: "Month" },
  { key: "quarter" as const, label: "Quarter" },
  { key: "year" as const, label: "Year" },
];

type PeriodKey = "all" | (typeof PERIODS)[number]["key"];

export default function ApplicationsAccountsOverview() {
  const {
    totalApplicationsCard,
    successfulApplicationsCard,
    failedApplicationsCard,
    applicationsCountDomain,
    applicationsPeriodBreakdownDomain,
    overallStatsDomain,
    totalUsersCountDomain,
    totalGuestsCountDomain,
    dashboardAggregatorsCountDomain,
  } = useAdminQueries({
    fetchApplicationsCount: true,
    fetchApplicationsPeriodBreakdown: true,
    fetchOverallStats: true,
    fetchTotalUsersCount: true,
    fetchTotalGuestsCount: true,
    fetchAggregatorsCount: true,
  });

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("all");

  const allTimeStat = {
    total: totalApplicationsCard.data ?? 0,
    successful: successfulApplicationsCard.data ?? 0,
    failed: failedApplicationsCard.data ?? 0,
  };
  const periodBreakdown = applicationsPeriodBreakdownDomain.data;
  const isPeriodLoading = applicationsPeriodBreakdownDomain.isLoading;

  const isApplicationsLoading =
    selectedPeriod === "all" ? applicationsCountDomain.isLoading : isPeriodLoading;
  const activeStat = selectedPeriod === "all" ? allTimeStat : periodBreakdown?.[selectedPeriod];
  const totalApplications = activeStat?.total ?? 0;
  const successCount = activeStat?.successful ?? 0;
  const failedCount = activeStat?.failed ?? 0;
  const successRate = totalApplications > 0 ? (successCount / totalApplications) * 100 : 0;
  const periodLabel =
    selectedPeriod === "all" ? "All time" : PERIODS.find((p) => p.key === selectedPeriod)?.label ?? "All time";

  const isAccountsLoading =
    totalUsersCountDomain.isLoading ||
    totalGuestsCountDomain.isLoading ||
    overallStatsDomain.isLoading ||
    dashboardAggregatorsCountDomain.isLoading;

  const totalUsers = totalUsersCountDomain.data ?? 0;
  const guests = totalGuestsCountDomain.data ?? 0;
  const activeSubscriptions = overallStatsDomain.data?.subscriptionTiers?.totals?.activeSubscriptions ?? 0;
  const inactiveSubscriptions = Math.max(totalUsers - activeSubscriptions, 0);
  const aggregators = dashboardAggregatorsCountDomain.data ?? { total: 0, active: 0 };
  const loyalists = overallStatsDomain.data?.loyalists ?? 0;
  const returnees = overallStatsDomain.data?.returnees ?? 0;

  const activeSharePct = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
  const guestSharePct = totalUsers > 0 ? (guests / totalUsers) * 100 : 0;

  const accountRows = [
    { label: "Active subscriptions", value: activeSubscriptions.toLocaleString(), color: "#1EB62D" },
    { label: "Inactive subscriptions", value: inactiveSubscriptions.toLocaleString(), color: "#C7D3DE" },
    { label: "Guests", value: guests.toLocaleString(), color: "#88D0FF" },
    { label: "Aggregators active", value: `${aggregators.active} / ${aggregators.total}`, color: "#008ED3" },
    { label: "Returnees", value: returnees.toLocaleString(), color: "#B26A22" },
    { label: "Loyalists", value: loyalists.toLocaleString(), color: "#7C3AED" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
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
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {periodLabel}
              </p>
              {isApplicationsLoading ? (
                <div className="mt-2 h-9 w-24 animate-pulse rounded bg-gray-200" />
              ) : (
                <div className="mt-2 flex items-baseline gap-3">
                  <h2 className="text-4xl font-semibold text-gray-900">
                    {totalApplications.toLocaleString()}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {totalApplications === 0 ? "no activity yet" : "total applications"}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Success rate
              </p>
              {isApplicationsLoading ? (
                <div className="mt-2 ml-auto h-7 w-16 animate-pulse rounded bg-gray-200" />
              ) : (
                <>
                  <div
                    className="mt-1 text-2xl font-semibold"
                    style={{ color: successRate >= 50 ? "#1EB62D" : "#C23434" }}
                  >
                    {successRate.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {successCount.toLocaleString()} of {totalApplications.toLocaleString()}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-[#1EB62D]" style={{ width: `${successRate}%` }} />
            <div className="h-full flex-1 bg-[#E4A0A0]" />
          </div>
          <div className="mt-2.5 flex gap-5 text-[11.5px] text-gray-600">
            <span className="flex items-center">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#1EB62D]" />
              Successful {successCount.toLocaleString()}
            </span>
            <span className="flex items-center">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#E4A0A0]" />
              Failed {failedCount.toLocaleString()}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 border-t border-gray-100 pt-4">
            {PERIODS.map((period) => {
              const isSelected = selectedPeriod === period.key;
              return (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => setSelectedPeriod(isSelected ? "all" : period.key)}
                  className={`rounded-lg py-1.5 text-center transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-gray-50"
                  }`}
                >
                  <p className={`text-[11px] ${isSelected ? "text-primary" : "text-gray-500"}`}>
                    {period.label}
                  </p>
                  {isPeriodLoading ? (
                    <div className="mx-auto mt-1.5 h-4 w-8 animate-pulse rounded bg-gray-200" />
                  ) : (
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        isSelected ? "text-primary" : "text-gray-900"
                      }`}
                    >
                      {(periodBreakdown?.[period.key]?.total ?? 0).toLocaleString()}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-center text-[10.5px] text-gray-400">
            {selectedPeriod === "all"
              ? "Tap a period to see its success / fail rate"
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
            Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isAccountsLoading ? (
            <div className="h-9 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-semibold text-gray-900">
                {totalUsers.toLocaleString()}
              </h2>
              <span className="text-xs text-gray-500">users</span>
            </div>
          )}

          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-[#1EB62D]" style={{ width: `${activeSharePct}%` }} />
            <div className="h-full bg-[#88D0FF]" style={{ width: `${guestSharePct}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {accountRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2 border-b border-gray-50 pb-1.5 text-[12.5px]"
              >
                <span className="flex items-center text-gray-600">
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-sm"
                    style={{ background: row.color }}
                  />
                  {row.label}
                </span>
                {isAccountsLoading ? (
                  <span className="h-3.5 w-8 animate-pulse rounded bg-gray-200" />
                ) : (
                  <span className="font-semibold text-gray-900">{row.value}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
