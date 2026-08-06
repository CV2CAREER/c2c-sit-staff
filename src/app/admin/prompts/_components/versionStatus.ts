import { VcsPromptVersionStatus } from "../hooks/use-vcs-prompts";

export const VERSION_STATUS_LABEL: Record<VcsPromptVersionStatus, string> = {
  draft: "Draft",
  live: "Live",
  retired: "Retired",
};

export const VERSION_STATUS_BADGE_CLASS: Record<VcsPromptVersionStatus, string> = {
  draft: "bg-amber-50 text-amber-600",
  live: "bg-emerald-50 text-emerald-600",
  retired: "bg-gray-100 text-gray-500",
};
