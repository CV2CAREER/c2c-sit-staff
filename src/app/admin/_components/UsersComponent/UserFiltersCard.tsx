"use client";
import React, { useState } from "react";
import { SlidersHorizontal, Info, RotateCcw } from "lucide-react";
import {
  PERSONA_OPTIONS,
  STATE_OPTIONS,
  GROUP_OPTIONS,
  LOYALTY_OPTIONS,
  UserFilterState,
  DEFAULT_FILTERS,
  personaForUser,
  stateForUser,
  groupForUser,
  loyaltyForUser,
  matchesFacets,
} from "@/app/admin/users/hooks/user-filters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UserFiltersCardProps {
  filters: UserFilterState;
  setFilters: (filters: UserFilterState) => void;
  users: any[];
  isLoading?: boolean;
  isError?: boolean;
}

export const UserFiltersCard: React.FC<UserFiltersCardProps> = ({
  filters,
  setFilters,
  users = [],
  isLoading = false,
  isError = false,
}) => {
  const [isHowCapturedOpen, setIsHowCapturedOpen] = useState(false);

  // Active filter groups count: Persona, State, Group, Loyalty
  const activeCount = [
    filters.persona?.length > 0,
    filters.state?.length > 0,
    filters.group?.length > 0,
    filters.loyalty?.length > 0,
  ].filter(Boolean).length;

  const countsAvailable = !isError && !isLoading;

  // Single-select toggle: clicking a chip makes it the only active chip in its group
  // Clicking an already-active chip deselects it
  const handleChipClick = (key: keyof UserFilterState, value: string) => {
    const current = filters[key] || [];
    const isSelected = current.includes(value);
    const next = isSelected ? [] : [value];
    setFilters({ ...filters, [key]: next });
  };

  const handleClearAll = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Compute faceted count for each chip
  const getCount = (
    key: keyof UserFilterState,
    matches: (user: any) => boolean,
  ): string => {
    if (!countsAvailable) return "-";
    const count = users.filter(
      (u) => matchesFacets(u, filters, key) && matches(u),
    ).length;
    return count.toLocaleString();
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Filter Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-gray-800">
            <SlidersHorizontal className="h-4 w-4 text-[#008ED3]" />
            <span className="text-sm font-bold tracking-tight">Filters</span>
          </div>

          {/* Active groups count chip */}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              countsAvailable
                ? "bg-sky-50 text-[#008ED3] border border-sky-200"
                : "bg-gray-100 text-gray-500 border border-gray-200"
            }`}
          >
            {countsAvailable ? `${activeCount} active` : "Counts unavailable"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* How each filter is captured */}
          <button
            type="button"
            onClick={() => setIsHowCapturedOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-[#008ED3] hover:text-[#008ED3] hover:bg-sky-50/50"
          >
            <Info className="h-3.5 w-3.5" />
            <span>How each filter is captured</span>
          </button>

          {/* Clear all */}
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
          >
            <RotateCcw className="h-3 w-3 text-gray-400" />
            <span>Clear all</span>
          </button>
        </div>
      </div>

      {/* Filter Rows Container */}
      <div className="mt-3 flex flex-col gap-3">
        {/* Row 1: Persona alone with 7 chips */}
        <div className="flex flex-col rounded-lg border border-gray-200 sm:flex-row sm:items-stretch overflow-hidden">
          {/* Label strip */}
          <div className="flex shrink-0 items-center justify-start bg-gray-50 px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-200 sm:w-28">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              PERSONA
            </span>
          </div>

          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white flex-1">
            {PERSONA_OPTIONS.map((opt) => {
              const active = filters.persona?.includes(opt.key);
              const countDisplay = getCount(
                "persona",
                (u) => personaForUser(u) === opt.key,
              );
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleChipClick("persona", opt.key)}
                  className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "border-[#008ED3] bg-[#008ED3] text-white shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#008ED3] hover:text-[#008ED3]"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`ml-1.5 font-bold ${
                      active ? "text-white/80" : "opacity-70 text-gray-600"
                    }`}
                  >
                    {countDisplay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: State, User Group, Loyalty side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* State */}
          <div className="flex flex-col rounded-lg border border-gray-200 sm:flex-row sm:items-stretch overflow-hidden">
            <div className="flex shrink-0 items-center justify-start bg-gray-50 px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-200 sm:w-24">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                STATE
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white flex-1">
              {STATE_OPTIONS.map((opt) => {
                const active = filters.state?.includes(opt.key);
                const countDisplay = getCount(
                  "state",
                  (u) => stateForUser(u) === opt.key,
                );
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleChipClick("state", opt.key)}
                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "border-[#008ED3] bg-[#008ED3] text-white shadow-xs"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#008ED3] hover:text-[#008ED3]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`ml-1.5 font-bold ${
                        active ? "text-white/80" : "opacity-70 text-gray-600"
                      }`}
                    >
                      {countDisplay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Group */}
          <div className="flex flex-col rounded-lg border border-gray-200 sm:flex-row sm:items-stretch overflow-hidden">
            <div className="flex shrink-0 items-center justify-start bg-gray-50 px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-200 sm:w-28">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                USER GROUP
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white flex-1">
              {GROUP_OPTIONS.map((opt) => {
                const active = filters.group?.includes(opt.key);
                const countDisplay = getCount(
                  "group",
                  (u) => groupForUser(u) === opt.key,
                );
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleChipClick("group", opt.key)}
                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "border-[#008ED3] bg-[#008ED3] text-white shadow-xs"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#008ED3] hover:text-[#008ED3]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`ml-1.5 font-bold ${
                        active ? "text-white/80" : "opacity-70 text-gray-600"
                      }`}
                    >
                      {countDisplay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loyalty */}
          <div className="flex flex-col rounded-lg border border-gray-200 sm:flex-row sm:items-stretch overflow-hidden">
            <div className="flex shrink-0 items-center justify-start bg-gray-50 px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-200 sm:w-24">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                LOYALTY
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white flex-1">
              {LOYALTY_OPTIONS.map((opt) => {
                const active = filters.loyalty?.includes(opt.key);
                const countDisplay = getCount(
                  "loyalty",
                  (u) => loyaltyForUser(u) === opt.key,
                );
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleChipClick("loyalty", opt.key)}
                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "border-[#008ED3] bg-[#008ED3] text-white shadow-xs"
                        : "border-gray-200 bg-white text-gray-700 hover:border-[#008ED3] hover:text-[#008ED3]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`ml-1.5 font-bold ${
                        active ? "text-white/80" : "opacity-70 text-gray-600"
                      }`}
                    >
                      {countDisplay}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* How each filter is captured Dialog */}
      <Dialog open={isHowCapturedOpen} onOpenChange={setIsHowCapturedOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">
              How Each Filter Is Captured
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Explanation of how user categories and metrics are derived
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3 text-xs text-gray-700">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <h5 className="font-bold text-gray-900">Persona</h5>
              <p className="mt-1 leading-relaxed text-gray-600">
                Derived from the account role (Client, Guest, Placement Control,
                Admin, Coach, Channel Partner, or Ambassador). Ambassador flag
                takes precedence if set.
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <h5 className="font-bold text-gray-900">State</h5>
              <p className="mt-1 leading-relaxed text-gray-600">
                <strong>Active</strong> represents accounts with active status.{" "}
                <strong>Dormant</strong> indicates inactive or soft-deleted accounts.
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <h5 className="font-bold text-gray-900">User Group</h5>
              <p className="mt-1 leading-relaxed text-gray-600">
                <strong>Customer</strong> includes Clients, Guests, Channel Partners,
                and Ambassadors. <strong>Staff</strong> includes Admins, Placement
                Control, and Coaches.
              </p>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
              <h5 className="font-bold text-gray-900">Loyalty</h5>
              <p className="mt-1 leading-relaxed text-gray-600">
                <strong>Newcomer</strong> accounts are on their initial tour/cycle
                (tour count ≤ 1). <strong>Returnee</strong> accounts have renewed or
                completed more than one tour.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserFiltersCard;
