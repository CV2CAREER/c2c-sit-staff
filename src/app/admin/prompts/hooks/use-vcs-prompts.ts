import { useFetchData, useMutateData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

export interface VcsPrompt {
  id: string;
  key: string;
  active: boolean;
  activePromptId: string;
  prompt: string;
  aiPromptSection: string;
  version: string | null;
  category: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  deletedAt: string | null;
  deletedBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VcsPromptVersionStatus = "draft" | "live" | "retired";

export interface VcsPromptVersion {
  id: string;
  vcsId: string | null;
  prompt: string;
  aiPromptSection: string;
  version: string;
  status: VcsPromptVersionStatus;
  createdBy: string | null;
  deployedBy: string | null;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VcsPromptsResponse {
  success: boolean;
  message: string;
  data: VcsPrompt[];
  statusCode: number;
}

// GET /api/v1/admin/prompts — every non-deleted prompt key in the VCS store
export const useVcsPrompts = () => {
  return useFetchData<VcsPrompt[]>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPTS,
    queryKey: ["vcs-prompts"],
    enabled: true,
  });
};

// GET /api/v1/admin/prompts?status=deleted — the recycle bin
export const useDeletedVcsPrompts = (enabled = true) => {
  return useFetchData<VcsPrompt[]>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPTS_DELETED,
    queryKey: ["vcs-prompts", "deleted"],
    enabled,
  });
};

export interface CreateVcsPromptInput {
  key: string;
  prompt: string;
  active?: boolean;
  model?: string;
}

// POST /api/v1/admin/prompts
export const useCreateVcsPrompt = () => {
  return useMutateData<VcsPrompt, CreateVcsPromptInput>({
    method: "POST",
    url: endpoints.ADMIN_VCS_PROMPTS,
    mutationKey: ["create-vcs-prompt"],
    onSuccess: () => {},
    onError: () => {},
  });
};

export interface UpdateVcsPromptInput {
  id: string;
  key?: string;
  active?: boolean;
  category?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// PUT /api/v1/admin/prompts/{id} — metadata only (key/category/model/temp/
// maxTokens/active). Prompt *text* changes go through useSaveVcsPromptDraft
// + usePushVcsPromptVersionLive instead.
export const useUpdateVcsPrompt = () => {
  return useMutateData<VcsPrompt, UpdateVcsPromptInput>({
    method: "PUT",
    url: endpoints.ADMIN_VCS_PROMPTS,
    mutationKey: ["update-vcs-prompt"],
    paramKey: "id",
    onSuccess: () => {},
    onError: () => {},
  });
};

// GET /api/v1/admin/prompts/{vcsId}/versions
export const useVcsPromptVersions = (vcsId: string, enabled = true) => {
  return useFetchData<VcsPromptVersion[]>({
    method: "GET",
    url: endpoints.ADMIN_VCS_PROMPT_VERSIONS(vcsId),
    queryKey: ["vcs-prompts", "versions", vcsId],
    enabled: enabled && !!vcsId,
  });
};

// POST /api/v1/admin/prompts/{vcsId}/draft
export const useSaveVcsPromptDraft = () => {
  return useMutateData<VcsPromptVersion, { vcsId: string; prompt: string; aiPromptSection?: string }>({
    method: "POST",
    url: (data) => endpoints.ADMIN_VCS_PROMPT_DRAFT(data.vcsId),
    mutationKey: ["save-vcs-prompt-draft"],
    onSuccess: () => {},
    onError: () => {},
  });
};

// POST /api/v1/admin/prompts/{vcsId}/versions/{versionId}/push
export const usePushVcsPromptVersionLive = () => {
  return useMutateData<VcsPrompt, { vcsId: string; versionId: string }>({
    method: "POST",
    url: (data) => endpoints.ADMIN_VCS_PROMPT_PUSH_LIVE(data.vcsId, data.versionId),
    mutationKey: ["push-vcs-prompt-version-live"],
    onSuccess: () => {},
    onError: () => {},
  });
};

// POST /api/v1/admin/prompts/{vcsId}/versions/{versionId}/restore
export const useRestoreVcsPromptVersion = () => {
  return useMutateData<VcsPrompt, { vcsId: string; versionId: string }>({
    method: "POST",
    url: (data) => endpoints.ADMIN_VCS_PROMPT_RESTORE_VERSION(data.vcsId, data.versionId),
    mutationKey: ["restore-vcs-prompt-version"],
    onSuccess: () => {},
    onError: () => {},
  });
};

// POST /api/v1/admin/prompts/{vcsId}/rollback
export const useRollbackVcsPromptVersion = () => {
  return useMutateData<VcsPrompt, { vcsId: string }>({
    method: "POST",
    url: (data) => endpoints.ADMIN_VCS_PROMPT_ROLLBACK(data.vcsId),
    mutationKey: ["rollback-vcs-prompt-version"],
    onSuccess: () => {},
    onError: () => {},
  });
};

// DELETE /api/v1/admin/prompts/{id} — soft delete (moves to recycle bin)
export const useDeleteVcsPrompt = () => {
  return useMutateData<VcsPrompt, { id: string }>({
    method: "DELETE",
    url: endpoints.ADMIN_VCS_PROMPTS,
    mutationKey: ["delete-vcs-prompt"],
    paramKey: "id",
    onSuccess: () => {},
    onError: () => {},
  });
};

// POST /api/v1/admin/prompts/{id}/restore
export const useRestoreVcsPrompt = () => {
  return useMutateData<VcsPrompt, { id: string }>({
    method: "POST",
    url: (data) => `${endpoints.ADMIN_VCS_PROMPT_RESTORE}/${data.id}/restore`,
    mutationKey: ["restore-vcs-prompt"],
    onSuccess: () => {},
    onError: () => {},
  });
};

// DELETE /api/v1/admin/prompts/{id}/permanent — permanent, unrecoverable delete
export const usePermanentlyDeleteVcsPrompt = () => {
  return useMutateData<{}, { id: string }>({
    method: "DELETE",
    url: (data) => `${endpoints.ADMIN_VCS_PROMPT_PERMANENT}/${data.id}/permanent`,
    mutationKey: ["permanently-delete-vcs-prompt"],
    onSuccess: () => {},
    onError: () => {},
  });
};
