"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import TiptapEditor from "@/app/admin/blog/_components/TiptapEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type {
  ClientContentSection,
  ClientContentStatus,
} from "@/types/clientContent.types";
import { isContentEmpty } from "../_utils/isContentEmpty";
import { ConfirmModal } from "./ConfirmModal";

interface EditContentModalProps {
  open: boolean;
  onClose: () => void;
  section: ClientContentSection | null;
  onSave: (values: { body: string; status: ClientContentStatus }) => Promise<void>;
  isSaving: boolean;
}

export function EditContentModal({
  open,
  onClose,
  section,
  onSave,
  isSaving,
}: EditContentModalProps) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<ClientContentStatus>("draft");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (open && section) {
      setBody(section.body);
      setStatus(section.status);
      setPublishConfirmOpen(false);
      setDiscardConfirmOpen(false);
    }
  }, [open, section]);

  const isDirty =
    !!section && (body !== section.body || status !== section.status);

  const requestClose = () => {
    if (isSaving) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  const save = async () => {
    await onSave({ body, status });
    setPublishConfirmOpen(false);
  };

  const handleSave = async () => {
    if (isContentEmpty(body)) {
      toast.error("Content cannot be empty.");
      return;
    }
    // Publishing pushes the copy straight to clients, so make it a deliberate act.
    if (status === "published") {
      setPublishConfirmOpen(true);
      return;
    }
    await save();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && requestClose()}>
        <DialogContent className="sm:max-w-[860px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{section?.name ?? "Edit Content"}</DialogTitle>
            {section && (
              <p className="text-xs text-gray-500">
                {section.placement} &middot; Version {section.version}
              </p>
            )}
          </DialogHeader>

          <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {status === "published" ? "Published" : "Draft"}
              </p>
              <p className="text-xs text-gray-500">
                {status === "published"
                  ? "Clients see this content."
                  : "Hidden from clients until published."}
              </p>
            </div>
            <Switch
              checked={status === "published"}
              onCheckedChange={(checked) =>
                setStatus(checked ? "published" : "draft")
              }
              aria-label="Publish this content"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-gray-700">
              Content details
            </label>
            <TiptapEditor content={body} setContent={setBody} />
          </div>

          <DialogFooter className="items-center">
            {isDirty && (
              <span className="mr-auto text-xs text-amber-600">
                You have unsaved changes.
              </span>
            )}
            <Button variant="outline" onClick={requestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={publishConfirmOpen}
        onClose={() => setPublishConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Publish this content?"
        message={
          <>
            &quot;{section?.name}&quot; will go live to clients immediately.
            {section?.placement ? ` ${section.placement}` : ""}
          </>
        }
        confirmLabel="Publish"
        loading={isSaving}
      />

      <ConfirmModal
        open={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onClose();
        }}
        title="Discard your changes?"
        message="Your edits to this content have not been saved. Closing now will lose them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        variant="destructive"
      />
    </>
  );
}
