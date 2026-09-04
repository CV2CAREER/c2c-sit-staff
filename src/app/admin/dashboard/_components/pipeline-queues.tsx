"use client";
import { useAdminQueries } from "@/hooks/api/admin.api";
import { DashboardListItem } from "@/hooks/api/admin/types";
import { initials, avatarColors } from "./avatar-utils";
import { CLIENT_JOURNEY_STEPS } from "@/constants/clientJourneySteps";

const STEP_LABEL_BY_KEY = new Map(CLIENT_JOURNEY_STEPS.map((step) => [step.stepKey, step.label]));

function journeyLabel(item: DashboardListItem): string {
  if (!item.journeyStepKey) {
    return "Journey complete";
  }
  return STEP_LABEL_BY_KEY.get(item.journeyStepKey) ?? item.journeyStepKey;
}

interface QueueConfig {
  key: keyof PipelineListsSubset;
  title: string;
  subtitle: (count: number) => string;
  headerGradient: string;
  titleColor: string;
  emptyText: string;
  dayColor: (days: number) => string;
}

type PipelineListsSubset = {
  paidNotInFlight: DashboardListItem[];
  onboarding: DashboardListItem[];
  unallocatedQueue: DashboardListItem[];
};

const QUEUES: QueueConfig[] = [
  {
    key: "paidNotInFlight",
    title: "Paid · not in-flight",
    subtitle: (n) => `${n} client${n === 1 ? "" : "s"} on Phase 1-4, on hold 14+ days.`,
    headerGradient: "linear-gradient(90deg,#FDEEEE,#fff)",
    titleColor: "#C23434",
    emptyText: "No clients stuck on hold right now.",
    dayColor: (days) => (days >= 14 ? "#C23434" : "#B26A22"),
  },
  {
    key: "onboarding",
    title: "Onboarding",
    subtitle: (n) => `${n} client${n === 1 ? "" : "s"} on Phase 1-4, on hold under 14 days.`,
    headerGradient: "linear-gradient(90deg,#FFFAF5,#fff)",
    titleColor: "#B26A22",
    emptyText: "No one currently onboarding.",
    dayColor: (days) => (days >= 7 ? "#B26A22" : "#55697D"),
  },
  {
    key: "unallocatedQueue",
    title: "Unallocated queue",
    subtitle: (n) => `${n} in-flight client${n === 1 ? "" : "s"} with no controller assigned.`,
    headerGradient: "none",
    titleColor: "#12202D",
    emptyText: "Every in-flight client has a controller.",
    dayColor: (days) => (days >= 7 ? "#C23434" : "#B26A22"),
  },
];

// Bottom 3-column: Paid · not-in-flight, Onboarding, Unallocated queue —
// each scrollable with a capped height. The line under each client's name
// is their real client-journey-step stage (client_journey_steps), not a
// canned note or the deprecated users.progress field.
export default function PipelineQueues() {
  const { pipelineListsDomain } = useAdminQueries({ fetchPipelineLists: true });
  const { data, isLoading, isError } = pipelineListsDomain;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {QUEUES.map((queue) => {
        const items = data?.[queue.key] ?? [];

        return (
          <div
            key={queue.key}
            className="overflow-hidden rounded-xl border border-primary/15 bg-white shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
          >
            <div className="p-4" style={{ background: queue.headerGradient }}>
              <p className="text-[13.5px] font-semibold" style={{ color: queue.titleColor }}>
                {queue.title}
              </p>
              <p className="mt-0.5 text-[11.5px] text-gray-600">
                {isLoading ? "Loading…" : isError ? "Failed to load" : queue.subtitle(items.length)}
              </p>
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-9 animate-pulse rounded bg-gray-100" />
                  ))}
                </div>
              ) : isError ? (
                <p className="p-4 text-xs text-[#C23434]">
                  Couldn&apos;t load this list — try refreshing the page.
                </p>
              ) : items.length === 0 ? (
                <p className="p-4 text-xs italic text-gray-500">{queue.emptyText}</p>
              ) : (
                items.map((item) => {
                  const [bg, fg] = avatarColors(item.name);
                  return (
                    <div
                      key={item.id || item.name}
                      className="flex items-center justify-between gap-2.5 border-b border-gray-50 px-4 py-2.5 last:border-0"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                          style={{ background: bg, color: fg }}
                        >
                          {initials(item.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-gray-900">{item.name}</p>
                          <p className="truncate text-[11px] text-gray-500">{journeyLabel(item)}</p>
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-[11.5px] font-semibold"
                        style={{ color: queue.dayColor(item.daysAgo) }}
                      >
                        {item.daysAgo}d
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
