"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueueEntryActions, QueueEntry } from "@/hooks/api/queue-entry.api";

/**
 * SPR-21-51-003 — System-queue "Actioned" confirmation. A proof-of-work note
 * is mandatory (the backend rejects an empty note too); on confirm the client
 * receives the "change actioned" email.
 */
export default function SystemActionedModal({
  entry,
  onClose,
}: {
  entry: QueueEntry | null;
  onClose: () => void;
}) {
  const { resolve, isResolving } = useQueueEntryActions();
  const [note, setNote] = useState("");

  const close = () => {
    setNote("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!entry) return;
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error("A proof-of-work note is required to action this entry.");
      return;
    }
    const toastId = toast.loading(`Actioning "${entry.title}"...`);
    try {
      await resolve({ id: entry.id, note: trimmed });
      toast.dismiss(toastId);
      toast.success(`"${entry.title}" marked as Actioned.`);
      close();
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.response?.data?.message || "Failed to action entry.");
    }
  };

  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Action &ldquo;{entry?.title}&rdquo;</DialogTitle>
          <DialogDescription>
            Record what was done to resolve this client request. A proof-of-work
            note is required, and the client is emailed once you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {entry?.clientName && (
            <div className="text-[12px] text-[#6B7280]">
              Client:{" "}
              <strong className="text-[#1F2937]">{entry.clientName}</strong>
              {entry.clientEmail ? ` (${entry.clientEmail})` : ""}
            </div>
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="What did you do to resolve this? (required)"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isResolving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isResolving || !note.trim()}
            className="bg-[#D97706] hover:bg-[#b45309] text-white"
          >
            {isResolving ? "Actioning..." : "Mark as Actioned"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
