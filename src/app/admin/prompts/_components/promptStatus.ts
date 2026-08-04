import { VcsPrompt } from "../hooks/use-vcs-prompts";

// This tracks whether a KEY is enabled for production lookups at all
// (VCS.active) or archived (soft-deleted) — a different concept from a
// version's draft/live/retired lifecycle, see versionStatus.ts.
export type EnabledStatus = "enabled" | "disabled" | "archived";

export const getEnabledStatus = (
  prompt: Pick<VcsPrompt, "active" | "deletedAt">,
): EnabledStatus => {
  if (prompt.deletedAt) return "archived";
  return prompt.active ? "enabled" : "disabled";
};

export const ENABLED_STATUS_LABEL: Record<EnabledStatus, string> = {
  enabled: "Enabled",
  disabled: "Disabled",
  archived: "Archived",
};

export const ENABLED_STATUS_BADGE_CLASS: Record<EnabledStatus, string> = {
  enabled: "bg-emerald-50 text-emerald-600",
  disabled: "bg-amber-50 text-amber-600",
  archived: "bg-gray-100 text-gray-500",
};
