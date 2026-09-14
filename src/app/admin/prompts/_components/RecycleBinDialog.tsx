"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, Archive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HintMark from "./HintMark";
import {
  useDeletedVcsPrompts,
  useRestoreVcsPrompt,
  usePermanentlyDeleteVcsPrompt,
  VcsPrompt,
} from "../hooks/use-vcs-prompts";

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

interface RecycleBinDialogProps {
  onRestored: (id: string) => void;
}

const RecycleBinDialog = ({ onRestored }: RecycleBinDialogProps) => {
  const [open, setOpen] = useState(false);
  const [permanentTarget, setPermanentTarget] = useState<VcsPrompt | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading } = useDeletedVcsPrompts(open);
  const { mutateAsync: restorePrompt, isPending: isRestoring } = useRestoreVcsPrompt();
  const { mutateAsync: permanentlyDelete, isPending: isPurging } =
    usePermanentlyDeleteVcsPrompt();

  const deleted = data?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["vcs-prompts"] });
  };

  const handleRestore = async (prompt: VcsPrompt) => {
    try {
      await restorePrompt({ id: prompt.id });
      toast.success(`"${prompt.key}" restored.`);
      invalidate();
      onRestored(prompt.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to restore prompt.");
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentTarget) return;
    try {
      await permanentlyDelete({ id: permanentTarget.id });
      toast.success(`"${permanentTarget.key}" permanently deleted.`);
      setPermanentTarget(null);
      invalidate();
    } catch (error: any) {
      toast.error(error?.message || "Failed to permanently delete prompt.");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Archive size={16} />
        Recycle Bin
        <HintMark text="View and restore prompt keys that have been soft-deleted." />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recycle Bin</DialogTitle>
            <DialogDescription>
              Deleted prompts stay here until they&apos;re restored or permanently
              removed.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
          ) : deleted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Archive className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Recycle bin is empty.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {deleted.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-medium text-gray-800">
                      {prompt.key}
                    </span>
                    <span className="text-xs text-gray-400">
                      Deleted {prompt.deletedAt ? formatDate(prompt.deletedAt) : "—"}
                      {prompt.deletedBy ? ` by ${prompt.deletedBy}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleRestore(prompt)}
                      disabled={isRestoring}
                    >
                      <RotateCcw size={14} />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setPermanentTarget(prompt)}
                    >
                      <Trash2 size={14} />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!permanentTarget}
        onOpenChange={(next) => {
          if (!next) setPermanentTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Permanently Delete Prompt</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-mono font-semibold text-gray-800">
                {permanentTarget?.key}
              </span>{" "}
              and all of its prompt text. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-between pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={isPurging}>
              {isPurging ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecycleBinDialog;
