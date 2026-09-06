"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Eye, RotateCcw, History as HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  useRestoreVcsPromptVersion,
  useRollbackVcsPromptVersion,
  VcsPromptVersion,
} from "../hooks/use-vcs-prompts";
import { VERSION_STATUS_BADGE_CLASS, VERSION_STATUS_LABEL } from "./versionStatus";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

interface VersionsListProps {
  vcsId: string;
  promptKey: string;
  versions: VcsPromptVersion[];
  selectedIds: string[];
  onView: (version: VcsPromptVersion) => void;
  patchVersions: (updater: (list: VcsPromptVersion[]) => VcsPromptVersion[]) => void;
  onChanged: () => void;
}

type ConfirmAction = { type: "rollback" } | { type: "restore"; version: VcsPromptVersion };

const VersionsList = ({
  vcsId,
  promptKey,
  versions,
  selectedIds,
  onView,
  patchVersions,
  onChanged,
}: VersionsListProps) => {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const { mutateAsync: rollback, isPending: isRollingBack } = useRollbackVcsPromptVersion();
  const { mutateAsync: restore, isPending: isRestoring } = useRestoreVcsPromptVersion();

  const isBusy = isRollingBack || isRestoring;

  // Flip statuses locally as soon as the promotion succeeds, using the
  // newly-live version's id from the response, rather than waiting for the
  // background refetch to reflect it.
  const applyPromotion = (newLiveId: string) => {
    patchVersions((list) =>
      list.map((v) => {
        if (v.id === newLiveId) return { ...v, status: "live" };
        if (v.status === "live") return { ...v, status: "retired" };
        return v;
      }),
    );
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === "rollback") {
        const result = await rollback({ vcsId });
        applyPromotion(result.data.activePromptId);
        toast.success(`"${promptKey}" rolled back to the previous version.`);
      } else {
        const result = await restore({ vcsId, versionId: confirmAction.version.id });
        applyPromotion(result.data.activePromptId);
        toast.success(`"${promptKey}" restored to v${confirmAction.version.version}.`);
      }
      setConfirmAction(null);
      onChanged();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update version.");
    }
  };

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-16 text-center">
        <HistoryIcon className="h-7 w-7 text-gray-300" />
        <p className="text-sm font-medium text-gray-600">No version history yet</p>
        <p className="max-w-xs text-xs text-gray-400">
          Versions show up here once you save a draft or push a change to live.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-gray-900">Versions</h3>
        {versions.map((version) => {
          const isSelected = selectedIds.includes(version.id);
          return (
            <div
              key={version.id}
              className={`rounded-xl border p-3 ${
                version.status === "live"
                  ? "border-gray-100 border-l-4 border-l-emerald-500 bg-emerald-50/30"
                  : isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-gray-100"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">v{version.version}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${VERSION_STATUS_BADGE_CLASS[version.status]}`}
                    title={
                      version.status === "live"
                        ? "This is the version currently used in production"
                        : version.status === "draft"
                          ? "Unsaved/unpushed changes — not used in production"
                          : "A previous live version, no longer active"
                    }
                  >
                    {VERSION_STATUS_LABEL[version.status]}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {version.status === "draft"
                  ? `In progress · ${version.createdBy || "System"}`
                  : version.deployedAt
                    ? `Deployed ${formatDate(version.deployedAt)} by ${version.deployedBy || "System"}`
                    : "No deploy record"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => onView(version)}
                  title="Show this version side-by-side in the diff view above"
                >
                  <Eye size={13} />
                  View
                </Button>
                {version.status === "live" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={isBusy}
                    onClick={() => setConfirmAction({ type: "rollback" })}
                    title="Promote the most recently retired version back to live"
                  >
                    <RotateCcw size={13} />
                    Roll back
                  </Button>
                )}
                {version.status === "retired" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={isBusy}
                    onClick={() => setConfirmAction({ type: "restore", version })}
                    title="Make this version live again — the current live version will be retired"
                  >
                    <RotateCcw size={13} />
                    Restore
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "rollback" ? "Roll back to previous version" : "Restore this version"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "rollback"
                ? `This promotes the most recently retired version of "${promptKey}" back to live.`
                : `This makes v${confirmAction?.type === "restore" ? confirmAction.version.version : ""} of "${promptKey}" live again. The current live version will be retired.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirm} disabled={isBusy}>
              {isBusy ? "Working..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VersionsList;
