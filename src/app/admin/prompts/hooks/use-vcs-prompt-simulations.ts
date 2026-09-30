import { useMemo } from "react";
import { useFetchData, useMutateData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

export type VcsPromptSimulationStatus = "success" | "failed";

export interface VcsPromptSimulationRun {
  id: string;
  vcsId: string;
  versionId: string;
  version: string | null;
  variables: Record<string, string>;
  renderedPrompt: string;
  output: string | null;
  model: string | null;
  status: VcsPromptSimulationStatus;
  errorMessage: string | null;
  durationMs: number;
  triggeredBy: string | null;
  createdAt: string;
}

export interface VcsPromptSimulationRunsData {
  rows: VcsPromptSimulationRun[];
  count: number;
  page: number;
  limit: number;
}

export interface VcsPromptSimulationRunWithKey extends VcsPromptSimulationRun {
  key: string | null;
}

export interface AllVcsPromptSimulationRunsData {
  rows: VcsPromptSimulationRunWithKey[];
  count: number;
  page: number;
  limit: number;
}

// POST /api/v1/admin/prompts/{vcsId}/versions/{versionId}/simulate
export const useRunVcsPromptSimulation = () => {
  return useMutateData<
    VcsPromptSimulationRun,
    { vcsId: string; versionId: string; variables: Record<string, string> }
  >({
    method: "POST",
    url: (data) => endpoints.ADMIN_VCS_PROMPT_SIMULATE(data.vcsId, data.versionId),
    mutationKey: ["run-vcs-prompt-simulation"],
    onSuccess: () => {},
    onError: () => {},
  });
};

// GET /api/v1/admin/prompts/{vcsId}/simulations?status=...&page=...&limit=...
export const useVcsPromptSimulationRuns = (
  vcsId: string,
  options: { status?: VcsPromptSimulationStatus; page?: number; limit?: number; enabled?: boolean } = {},
) => {
  const { status, page = 1, limit = 10, enabled = true } = options;

  const params: Record<string, any> = { page, limit };
  if (status) params.status = status;

  const queryKey = useMemo(
    () => ["vcs-prompts", "simulations", vcsId, status ?? null, page, limit],
    [vcsId, status, page, limit],
  );

  return useFetchData<VcsPromptSimulationRunsData>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPT_SIMULATIONS(vcsId),
    queryKey,
    params,
    enabled: enabled && !!vcsId,
  });
};

// GET /api/v1/admin/prompts/simulations?status=...&page=...&limit=... — every
// simulation run across every prompt key, newest first.
export const useAllVcsPromptSimulationRuns = (
  options: { status?: VcsPromptSimulationStatus; page?: number; limit?: number; enabled?: boolean } = {},
) => {
  const { status, page = 1, limit = 25, enabled = true } = options;

  const params: Record<string, any> = { page, limit };
  if (status) params.status = status;

  const queryKey = useMemo(
    () => ["vcs-prompts", "all-simulations", status ?? null, page, limit],
    [status, page, limit],
  );

  return useFetchData<AllVcsPromptSimulationRunsData>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPT_ALL_SIMULATIONS,
    queryKey,
    params,
    enabled,
  });
};
