"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useGetAllUsers } from "@/app/admin/users/hooks/users-all";
import {
  useUserSegments,
  useCreateUserSegment,
  useDeleteUserSegment,
} from "@/app/admin/users/hooks/user-segments";
import {
  PERSONA_OPTIONS,
  STATE_OPTIONS,
  GROUP_OPTIONS,
  LOYALTY_OPTIONS,
  UserFilterState,
  EMPTY_FILTERS,
  hasActiveFacetFilters,
  personaForUser,
  stateForUser,
  groupForUser,
  loyaltyForUser,
  matchesFacets,
} from "@/app/admin/users/hooks/user-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidersHorizontal, Bookmark, Lock, Plus, Trash2, Loader2, ChevronDown } from "lucide-react";

interface SavedSegment {
  id: string;
  name: string;
  filters: UserFilterState;
  locked?: boolean;
}

// Two fixed presets, matching the reference design's "LOCKED" segments —
// not user-removable, not stored in the DB. Anything else the user saves
// goes through useCreateUserSegment/useDeleteUserSegment (user_segment_filters
// table), so it's personal to them but persists across devices/browsers.
const LOCKED_SEGMENTS: SavedSegment[] = [
  {
    id: "locked-dormant-clients",
    name: "Dormant clients",
    locked: true,
    filters: { persona: [], state: ["dormant"], group: ["customer"], loyalty: [] },
  },
  {
    id: "locked-new-guests",
    name: "New guests",
    locked: true,
    filters: { persona: ["guest"], state: [], group: [], loyalty: ["newcomer"] },
  },
];

interface UserDataCardsProps {
  filters: UserFilterState;
  setFilters: (filters: UserFilterState) => void;
  scrollTotable: () => void;
}

const UserDataCards = ({ filters, setFilters, scrollTotable }: UserDataCardsProps) => {
  // Shares its React Query cache with UsersDataTable's own useGetAllUsers({
  // active: true }) call — same queryKey, so this is not a second network
  // request when the table is on the "Active Users" tab.
  const allUsers = useGetAllUsers({ enabled: true, active: true });
  const users: any[] = allUsers.users || [];
  const isLoading = allUsers.isLoading;

  const queryClient = useQueryClient();
  const segmentsQuery = useUserSegments();
  const createSegment = useCreateUserSegment();
  const deleteSegment = useDeleteUserSegment();
  const customSegments: SavedSegment[] = segmentsQuery.segments;

  const [isAddingSegment, setIsAddingSegment] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const closeAddForm = () => {
    setIsAddingSegment(false);
    setSegmentName("");
  };

  const saveCurrentAsSegment = async () => {
    const name = segmentName.trim();
    if (!name || createSegment.isPending) return;
    try {
      await createSegment.mutateAsync({ name, filters });
      queryClient.invalidateQueries({ queryKey: ["user-segments"] });
      closeAddForm();
      toast.success(`Segment "${name}" saved`);
    } catch {
      toast.error("Failed to save segment");
    }
  };

  const removeSegment = async (id: string, name: string) => {
    setDeletingId(id);
    try {
      await deleteSegment.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["user-segments"] });
      toast.success(`Segment "${name}" deleted`);
    } catch {
      toast.error("Failed to delete segment");
    } finally {
      setDeletingId(null);
    }
  };

  // A pill's count reflects the OTHER currently-selected facets (standard
  // faceted-search behaviour) — e.g. with State:Active picked, the Persona
  // pills show how many ACTIVE users are in each persona, not the global total.
  const countFor = (key: keyof UserFilterState, matches: (user: any) => boolean): number =>
    users.filter((u) => matchesFacets(u, filters, key) && matches(u)).length;

  const segmentCount = (segFilters: UserFilterState): number =>
    users.filter((u) => matchesFacets(u, segFilters)).length;

  const toggle = (key: keyof UserFilterState, value: string) => {
    const current = filters[key];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setFilters({ ...filters, [key]: next });
    scrollTotable();
  };

  const facetMatcher: Record<keyof UserFilterState, (user: any) => string | null> = {
    persona: personaForUser,
    state: stateForUser,
    group: groupForUser,
    loyalty: loyaltyForUser,
  };

  // <details> gives every section a native, accessible dropdown/disclosure —
  // open by default (unchanged desktop look), but collapsible so a long
  // stack of facets doesn't make the sidebar towering on mobile.
  const renderSection = (
    title: string,
    subtitle: string,
    key: keyof UserFilterState,
    options: { key: string; label: string }[],
  ) => (
    <details className="group" open>
      <summary className="mb-2 flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-[11px] font-normal text-gray-400">{subtitle}</span>
        <ChevronDown
          size={13}
          className="ml-auto shrink-0 text-gray-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const count = isLoading ? 0 : countFor(key, (u) => facetMatcher[key](u) === opt.key);
          const isActive = filters[key].includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(key, opt.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-gray-900 bg-gray-900 text-white"
                  : count === 0
                    ? "border-gray-100 bg-gray-50 text-gray-300"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {opt.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
                  isActive ? "bg-white/20" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );

  return (
    <Card className="rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)] lg:sticky lg:top-4">
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-gray-100 p-4">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
          <SlidersHorizontal size={15} className="text-primary" />
          Filters
        </CardTitle>
        {hasActiveFacetFilters(filters) && (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-4">
        {renderSection("Persona", "who they are", "persona", PERSONA_OPTIONS)}
        {renderSection("State", "recent activity", "state", STATE_OPTIONS)}
        {renderSection("User Group", "side of the house", "group", GROUP_OPTIONS)}
        {renderSection("Loyalty", "first time or back", "loyalty", LOYALTY_OPTIONS)}

        <details className="group border-t border-gray-100 pt-4" open>
          <summary className="mb-2 flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-900">
              <Bookmark size={13} className="text-primary" />
              Saved segments
              <ChevronDown
                size={13}
                className="shrink-0 text-gray-400 transition-transform group-open:rotate-180"
              />
            </p>
            {!isAddingSegment && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsAddingSegment(true);
                }}
                disabled={!hasActiveFacetFilters(filters)}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
              >
                <Plus size={12} /> Save
              </button>
            )}
          </summary>

          {isAddingSegment && (
            <div className="mb-2 rounded-lg border border-gray-900 p-2">
              <input
                autoFocus
                value={segmentName}
                onChange={(e) => setSegmentName(e.target.value)}
                placeholder="Name this segment"
                className="mb-2 w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCurrentAsSegment();
                  if (e.key === "Escape") closeAddForm();
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveCurrentAsSegment}
                  disabled={!segmentName.trim() || createSegment.isPending}
                  className="flex-1 rounded-md bg-gray-900 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {createSegment.isPending ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={closeAddForm}
                  className="flex-1 rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {[...LOCKED_SEGMENTS, ...customSegments].map((seg) => (
              <div
                key={seg.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-1.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    setFilters(seg.filters);
                    scrollTotable();
                  }}
                  className="flex-1 truncate text-left font-medium text-gray-700 hover:text-primary"
                >
                  {seg.name}
                </button>
                <span className="text-[10.5px] text-gray-400">
                  {isLoading ? "…" : segmentCount(seg.filters)}
                </span>
                {seg.locked ? (
                  <span className="flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-gray-400">
                    <Lock size={9} /> Locked
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeSegment(seg.id, seg.name)}
                    disabled={deletingId === seg.id}
                    className="text-gray-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-gray-200"
                  >
                    {deletingId === seg.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

export default UserDataCards;
