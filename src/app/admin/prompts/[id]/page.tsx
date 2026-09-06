"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DeletePromptDialog from "../_components/DeletePromptDialog";
import PromptEditView from "../_components/PromptEditView";
import PromptVersionsView from "../_components/PromptVersionsView";
import AllSimulationsSection from "../_components/AllSimulationsSection";
import PageHint from "../_components/PageHint";
import {
  useVcsPrompts,
  useDeletedVcsPrompts,
  useVcsPromptVersions,
  VcsPrompt,
  VcsPromptVersion,
} from "../hooks/use-vcs-prompts";

const PROMPT_DETAIL_HINTS = [
  {
    label: "Edit / Versions toggle",
    description: "Switch between editing the current draft and browsing every past version of this key.",
  },
  {
    label: "DRAFT / LIVE badge",
    description: "DRAFT means there are unsaved changes; LIVE means this is what production is currently reading.",
  },
  {
    label: "Save draft / Push to Live",
    description:
      "Edits are saved as a draft first and don't affect production. Push to Live promotes that draft to be the active version.",
  },
  {
    label: "Edit / Simulate / History tabs",
    description:
      "Edit the raw prompt text, Simulate tests it against sample input without touching production, and History reviews past AI calls made with this prompt.",
  },
  {
    label: "Metadata panel",
    description: "Category, AI model, temperature, and max token settings for this key.",
  },
  {
    label: "Delete",
    description: "Soft-deletes this key, moving it to the Recycle Bin on the main Prompts page (recoverable).",
  },
];

type Mode = "edit" | "versions";

type PromptPageParams = Promise<{ id: string }>;

const PromptDetailContent = ({ id }: { id: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("edit");
  const [deleteTarget, setDeleteTarget] = useState<VcsPrompt | null>(null);

  const { data: vcsData, isLoading } = useVcsPrompts();
  const { data: deletedData, isLoading: isDeletedLoading } = useDeletedVcsPrompts(true);

  const prompt = useMemo(() => {
    const all = [...(vcsData?.data || []), ...(deletedData?.data || [])];
    return all.find((p) => p.id === id) || null;
  }, [vcsData, deletedData, id]);

  const { data: versionsData } = useVcsPromptVersions(id, !!prompt);
  const versions = useMemo(() => versionsData?.data || [], [versionsData]);

  // Pre-migration keys may not have any linked version rows yet (their live
  // prompt predates the vcsId column) — fall back to the VCS row's own
  // prompt/version fields so the Edit screen still has something to diff
  // against and draft from.
  const liveVersion: VcsPromptVersion | null = useMemo(() => {
    const linked = versions.find((v) => v.status === "live");
    if (linked) return linked;
    if (!prompt) return null;
    return {
      id: prompt.activePromptId,
      vcsId: prompt.id,
      prompt: prompt.prompt,
      version: prompt.version || "1",
      status: "live",
      createdBy: null,
      deployedBy: null,
      deployedAt: prompt.updatedAt,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  }, [versions, prompt]);

  const draftVersion = versions.find((v) => v.status === "draft") || null;

  const patchVersions = (updater: (list: VcsPromptVersion[]) => VcsPromptVersion[]) => {
    queryClient.setQueryData<{ data: VcsPromptVersion[] } | undefined>(
      ["vcs-prompts", "versions", id],
      (old) => (old ? { ...old, data: updater(old.data || []) } : old),
    );
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vcs-prompts"] });

  const handleChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["vcs-prompts", "versions", id] });
    invalidate();
  };

  const loading = isLoading || isDeletedLoading;

  if (loading) {
    return (
      <section className="flex flex-col gap-3 mt-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </section>
    );
  }

  if (!prompt) {
    return (
      <section className="flex flex-col gap-3 mt-4">
        <PageHeader
          title="Prompt not found"
          description="This prompt may have been deleted."
          className="rounded-xl border border-primary/15 p-3 sm:p-3 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
        />
        <Button variant="outline" className="w-fit" onClick={() => router.push("/admin/prompts")}>
          Back to Prompts
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 mt-4">
      <PageHeader
        title={prompt.key}
        description="Manage this prompt's draft, live, and retired versions."
        renderJSX={
          <div className="flex items-center gap-3">
            <PageHint title="What's on this page" items={PROMPT_DETAIL_HINTS} />
            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
              {(["edit", "versions"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  title={
                    m === "edit"
                      ? "Edit this key's prompt text and metadata"
                      : "Browse and compare every past version of this key"
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    mode === m ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteTarget(prompt)}
              title="Soft-delete this key — it moves to the Recycle Bin and can be restored later"
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        }
        className="rounded-xl border border-primary/15 p-3 sm:p-3 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
      />

      {mode === "edit" ? (
        <PromptEditView
          vcs={prompt}
          draftVersion={draftVersion}
          liveVersion={liveVersion}
          patchVersions={patchVersions}
          onChanged={handleChanged}
          onRequestDelete={() => setDeleteTarget(prompt)}
        />
      ) : (
        <PromptVersionsView
          vcsId={prompt.id}
          promptKey={prompt.key}
          versions={versions}
          patchVersions={patchVersions}
          onChanged={handleChanged}
        />
      )}

      <AllSimulationsSection />

      {deleteTarget && (
        <DeletePromptDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          id={deleteTarget.id}
          promptKey={deleteTarget.key}
          onDeleted={() => {
            setDeleteTarget(null);
            invalidate();
            router.push("/admin/prompts");
          }}
        />
      )}
    </section>
  );
};

export default function Page(props: { params: PromptPageParams }) {
  const params = React.use(props.params);
  return <PromptDetailContent id={params.id} />;
}
