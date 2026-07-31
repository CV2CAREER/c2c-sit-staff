"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Save, RotateCcw, Sparkles, Clock, Tag, Activity } from "lucide-react";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreatePromptDialog from "./_components/CreatePromptDialog";
import DeletePromptDialog from "./_components/DeletePromptDialog";
import RecycleBinDialog from "./_components/RecycleBinDialog";
import UsageAnalyticsSection from "./_components/UsageAnalyticsSection";
import { useVcsPrompts, useUpdateVcsPrompt, VcsPrompt } from "./hooks/use-vcs-prompts";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const PromptsPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useVcsPrompts();
  const { mutateAsync: updatePrompt, isPending: isSaving } = useUpdateVcsPrompt();

  const prompts = useMemo(() => data?.data || [], [data]);

  const [selectedId, setSelectedId] = useState<string>("");
  const [promptText, setPromptText] = useState("");
  const [active, setActive] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<VcsPrompt | null>(null);
  const [showUsage, setShowUsage] = useState(false);

  const selected = useMemo(
    () => prompts.find((p) => p.id === selectedId) || null,
    [prompts, selectedId],
  );

  // Default to the first prompt once the list loads.
  useEffect(() => {
    if (!selectedId && prompts.length > 0) {
      setSelectedId(prompts[0].id);
    }
  }, [prompts, selectedId]);

  // Keep the editor in sync whenever the selection changes.
  useEffect(() => {
    if (selected) {
      setPromptText(selected.prompt);
      setActive(selected.active);
    }
  }, [selected]);

  const isDirty =
    !!selected && (promptText !== selected.prompt || active !== selected.active);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["vcs-prompts"] });

  const handleSave = async () => {
    if (!selected) return;

    try {
      await updatePrompt({
        id: selected.id,
        prompt: promptText !== selected.prompt ? promptText : undefined,
        active: active !== selected.active ? active : undefined,
      });
      toast.success(`"${selected.key}" saved.`);
      invalidate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save prompt.");
    }
  };

  const handleDiscard = () => {
    if (!selected) return;
    setPromptText(selected.prompt);
    setActive(selected.active);
  };

  return (
    <section className="flex flex-col gap-3 mt-4">
      <PageHeader
        title="AI Prompts"
        description="Manage every AI prompt configuration used across the platform — versioned and organized by key."
        renderJSX={
          <div className="flex items-center gap-2">
            <Button
              variant={showUsage ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => setShowUsage((prev) => !prev)}
            >
              <Activity size={16} />
              Usage Analytics
            </Button>
            <RecycleBinDialog
              onRestored={(id) => {
                invalidate();
                setSelectedId(id);
              }}
            />
            <CreatePromptDialog
              onCreated={(id) => {
                invalidate();
                setSelectedId(id);
              }}
            />
          </div>
        }
        className="rounded-xl border border-primary/15 p-3 sm:p-3 shadow-[0_1px_10px_rgba(0,142,211,0.10)]"
      />

      <div className="w-full rounded-xl border border-primary/15 bg-white p-4 sm:p-6 shadow-[0_1px_10px_rgba(0,142,211,0.10)]">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-[420px] w-full" />
          </div>
        ) : prompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-medium text-gray-800">No prompts yet</p>
            <p className="max-w-sm text-sm text-gray-500">
              Create the first key-based prompt to start driving AI generation
              across the platform.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5 sm:max-w-md">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Prompt Key
              </label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt key" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2 font-mono text-sm">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            p.active ? "bg-emerald-500" : "bg-gray-300"
                          }`}
                        />
                        {p.key}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">{prompts.length} prompt(s) total</p>
            </div>

            {selected && (
              <div className="flex flex-col gap-4 rounded-xl border border-gray-100 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <Tag size={12} />
                      {selected.key}
                    </span>
                    {selected.version && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        v{selected.version}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock size={12} />
                      Updated {formatDate(selected.updatedAt)}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">Active</span>
                    <span className="text-xs text-gray-500">
                      Inactive prompts won&apos;t be picked up by services querying this key.
                    </span>
                  </div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Prompt
                  </label>
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="min-h-[420px] font-mono text-sm leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-xs text-gray-400">
                    {isDirty ? "You have unsaved changes" : "No changes"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={handleDiscard}
                      disabled={!isDirty || isSaving}
                    >
                      <RotateCcw size={14} />
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={handleSave}
                      disabled={!isDirty || isSaving}
                    >
                      <Save size={14} />
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showUsage && <UsageAnalyticsSection />}

      {deleteTarget && (
        <DeletePromptDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          id={deleteTarget.id}
          promptKey={deleteTarget.key}
          onDeleted={() => {
            invalidate();
            setSelectedId("");
            setDeleteTarget(null);
          }}
        />
      )}
    </section>
  );
};

export default PromptsPage;
