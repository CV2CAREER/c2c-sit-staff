"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, RotateCcw, UploadCloud, Trash2, FlaskConical, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PromptMetadataPanel from "./PromptMetadataPanel";
import SimulateTab from "./SimulateTab";
import RunHistoryTab from "./RunHistoryTab";
import {
  useSaveVcsPromptDraft,
  usePushVcsPromptVersionLive,
  useUpdateVcsPrompt,
  VcsPrompt,
  VcsPromptVersion,
} from "../hooks/use-vcs-prompts";
import { useVcsPromptSimulationRuns } from "../hooks/use-vcs-prompt-simulations";

// Prompt keys whose required JSON schema/rules are locked in backend code
// (see cv-variant-required-prompt.ts) rather than the owner-editable
// VCSPrompt row — the prompt's non-technical owner only ever sees and edits
// the free-form AI Prompt box below, with nothing technical to break.
const LOCKED_SCHEMA_PROMPT_KEYS = new Set(["cv_variant_generation_prompt"]);

const formatRelative = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

interface PromptEditViewProps {
  vcs: VcsPrompt;
  draftVersion: VcsPromptVersion | null;
  liveVersion: VcsPromptVersion | null;
  patchVersions: (updater: (list: VcsPromptVersion[]) => VcsPromptVersion[]) => void;
  onChanged: () => void;
  onRequestDelete: () => void;
}

const PromptEditView = ({
  vcs,
  draftVersion,
  liveVersion,
  patchVersions,
  onChanged,
  onRequestDelete,
}: PromptEditViewProps) => {
  const { mutateAsync: saveDraft, isPending: isSavingDraft } = useSaveVcsPromptDraft();
  const { mutateAsync: pushLive, isPending: isPushing } = usePushVcsPromptVersionLive();
  const { mutateAsync: updateMetadata, isPending: isSavingMetadata } = useUpdateVcsPrompt();

  const baselinePrompt = draftVersion?.prompt ?? liveVersion?.prompt ?? vcs.prompt;
  const baselineAiPromptSection =
    draftVersion?.aiPromptSection ?? liveVersion?.aiPromptSection ?? vcs.aiPromptSection ?? "";

  const [promptText, setPromptText] = useState(baselinePrompt);
  const [aiPromptSection, setAiPromptSection] = useState(baselineAiPromptSection);
  const [category, setCategory] = useState(vcs.category ?? "");
  const [model, setModel] = useState(vcs.model ?? "");

  useEffect(() => {
    setPromptText(baselinePrompt);
    setAiPromptSection(baselineAiPromptSection);
    setCategory(vcs.category ?? "");
    setModel(vcs.model ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vcs.id]);

  const isDirty =
    promptText !== baselinePrompt ||
    aiPromptSection !== baselineAiPromptSection ||
    category !== (vcs.category ?? "") ||
    model !== (vcs.model ?? "") ||
    temperature !== (vcs.temperature !== null && vcs.temperature !== undefined ? String(vcs.temperature) : "") ||
    maxTokens !== (vcs.maxTokens !== null && vcs.maxTokens !== undefined ? String(vcs.maxTokens) : "");

  const isSaving = isSavingDraft || isSavingMetadata;

  const handleDiscard = () => {
    setPromptText(baselinePrompt);
    setAiPromptSection(baselineAiPromptSection);
    setCategory(vcs.category ?? "");
    setModel(vcs.model ?? "");
  };

  const handleSaveDraft = async () => {
    try {
      if (promptText !== baselinePrompt || aiPromptSection !== baselineAiPromptSection) {
        const result = await saveDraft({ vcsId: vcs.id, prompt: promptText, aiPromptSection });
        const savedDraft = result.data;
        // Patch the cache directly with the fresh draft row instead of
        // waiting on the background refetch below — otherwise "Push to
        // Live" stays disabled (still sees no/stale draft) until that
        // round-trip resolves.
        patchVersions((list) => [savedDraft, ...list.filter((v) => v.id !== savedDraft.id)]);
        // The backend trims prompt/aiPromptSection before storing them —
        // sync local state to what was actually saved, not what was typed,
        // otherwise any trailing whitespace leaves isDirty permanently true
        // (baseline reflects the trimmed value, local state doesn't) and
        // Push to Live stays disabled until a page reload.
        setPromptText(savedDraft.prompt);
        setAiPromptSection(savedDraft.aiPromptSection ?? "");
      }

      const metadataPatch: { category?: string; model?: string } = {};
      if (category !== (vcs.category ?? "")) metadataPatch.category = category;
      if (model !== (vcs.model ?? "")) metadataPatch.model = model;
      if (Object.keys(metadataPatch).length > 0) {
        await updateMetadata({ id: vcs.id, ...metadataPatch });
      }

      toast.success(`"${vcs.key}" draft saved.`);
      onChanged();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save draft.");
    }
  };

  const handlePushToLive = async () => {
    if (!draftVersion) return;
    try {
      await pushLive({ vcsId: vcs.id, versionId: draftVersion.id });
      patchVersions((list) =>
        list.map((v) => {
          if (v.id === draftVersion.id) return { ...v, status: "live" };
          if (v.status === "live") return { ...v, status: "retired" };
          return v;
        }),
      );
      toast.success(`"${vcs.key}" pushed to live.`);
      onChanged();
    } catch (error: any) {
      toast.error(error?.message || "Failed to push to live.");
    }
  };

  const status = draftVersion ? "draft" : "live";
  const statusLabel = status === "draft" ? "DRAFT" : "LIVE";
  const statusClass =
    status === "draft" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600";

  const byline = draftVersion
    ? `Last saved ${formatRelative(draftVersion.updatedAt)} by ${draftVersion.createdBy || "System"}`
    : liveVersion?.deployedAt
      ? `Deployed ${formatRelative(liveVersion.deployedAt)} by ${liveVersion.deployedBy || "System"}`
      : "No deploy history yet.";

  const canPushToLive = !!draftVersion && !isDirty;

  const simulateVersion = draftVersion || liveVersion;
  const simulateVersionLabel = draftVersion
    ? `v${draftVersion.version} (draft)`
    : liveVersion
      ? `v${liveVersion.version} (live)`
      : "—";
  const promptIsDirty = promptText !== baselinePrompt;

  const { data: runsCountData } = useVcsPromptSimulationRuns(vcs.id, { limit: 1 });
  const runsCount = runsCountData?.data?.count ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-4 sm:flex-row">
      <PromptMetadataPanel
        name={vcs.key}
        promptText={promptText}
        category={category}
        model={model}
        onCategoryChange={setCategory}
        onModelChange={setModel}
      />

      <Card className="flex-1 rounded-xl border-primary/15 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusClass}`}
              title={
                status === "draft"
                  ? "This key has an unsaved/unpushed draft"
                  : "This is the version production is currently reading"
              }
            >
              {statusLabel}
            </span>
            <span className="text-xs text-gray-500">{byline}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
              title="Revert the prompt text and metadata below back to the last saved version"
            >
              <RotateCcw size={14} />
              Discard changes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveDraft}
              disabled={!isDirty || isSaving}
              title="Save these changes as a draft — production keeps using the live version until you push"
            >
              <Save size={14} />
              {isSavingDraft || isSavingMetadata ? "Saving..." : "Save draft"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handlePushToLive}
              disabled={!canPushToLive || isPushing}
              title={
                !draftVersion
                  ? "Save a draft before pushing to live"
                  : isDirty
                    ? "Save your changes first"
                    : "Promote this draft to be the live version everyone's calls read"
              }
            >
              <UploadCloud size={14} />
              {isPushing ? "Pushing..." : "Push to Live →"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="edit" className="flex flex-1 flex-col">
          <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b border-gray-100 bg-transparent p-0">
            <TabsTrigger
              value="edit"
              title="Edit the raw prompt template and its metadata"
              className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              Edit
            </TabsTrigger>
            <TabsTrigger
              value="simulate"
              title="Test this prompt against sample input without affecting production"
              className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <FlaskConical size={13} />
              Simulate
            </TabsTrigger>
            <TabsTrigger
              value="history"
              title="Review past AI calls made with this prompt"
              className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-0.5 pb-2 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <History size={13} />
              History{runsCount > 0 ? ` · ${runsCount} run${runsCount === 1 ? "" : "s"}` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex flex-1 flex-col gap-3">
            {LOCKED_SCHEMA_PROMPT_KEYS.has(vcs.key) ? (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  AI Prompt
                </label>
                <p className="text-xs text-gray-500">
                  This is the only thing you can change. Write instructions in plain language —
                  tone, emphasis, formatting, anything you want the AI to do differently. It's
                  combined automatically with the required CV formatting rules every time a CV is
                  generated, so you don't need to worry about breaking anything.
                </p>
                <Textarea
                  value={aiPromptSection}
                  onChange={(e) => setAiPromptSection(e.target.value)}
                  placeholder="e.g. Make the tone more formal, and put the company name and dates on the same line, separated by a comma."
                  className="min-h-[280px] flex-1 font-mono text-sm leading-relaxed"
                />

                <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs text-gray-600">
                  💡 Tip: Save your draft, then Push to Live once you&apos;re happy with it —
                  production keeps using the current live version until you do. Generate a real CV
                  to see the effect — the Simulate tab doesn't reflect this box yet.
                </div>
              </>
            ) : (
              <>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Prompt template
                </label>
                <Textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="min-h-[340px] flex-1 font-mono text-sm leading-relaxed"
                />
                <div className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs text-gray-600">
                  💡 Tip: Save your draft, then Push to Live once you&apos;re happy with it —
                  production keeps reading the current live version until you do.
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="simulate" className="flex flex-1 flex-col">
            <SimulateTab
              vcsId={vcs.id}
              versionId={simulateVersion?.id ?? null}
              versionLabel={simulateVersionLabel}
              savedPromptText={baselinePrompt}
              hasUnsavedChanges={promptIsDirty}
            />
          </TabsContent>

          <TabsContent value="history" className="flex flex-1 flex-col">
            <RunHistoryTab vcsId={vcs.id} />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRequestDelete}
            title="Soft-delete this key — it moves to the Recycle Bin and can be restored later"
          >
            <Trash2 size={14} />
            Delete Prompt
          </Button>
        </div>
      </CardContent>
      </Card>
    </div>
  );
};

export default PromptEditView;
