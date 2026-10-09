"use client";

import { useRef, useState } from "react";
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

// Optional proof file: image or PDF, one file, up to 10 MB (the backend enforces the same limits).
const PROOF_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const PROOF_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf";
const PROOF_MAX_BYTES = 10 * 1024 * 1024;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * SPR-21-51-003 — System-queue "Actioned" confirmation. A proof-of-work note
 * is mandatory (the backend rejects an empty note too); an image or PDF can be
 * attached as optional extra proof. On confirm the client receives the
 * "change actioned" email.
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
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const clearFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const close = () => {
    setNote("");
    clearFile();
    onClose();
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!PROOF_TYPES.includes(picked.type)) {
      toast.error("The proof must be a PNG, JPG, WEBP image or a PDF.");
      clearFile();
      return;
    }
    if (picked.size > PROOF_MAX_BYTES) {
      toast.error("The proof file must be 10 MB or smaller.");
      clearFile();
      return;
    }
    setFile(picked);
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
      await resolve({ id: entry.id, note: trimmed, file });
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
            note is required, and the client is emailed once you confirm. You can
            also attach an image or PDF as proof.
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

          <div>
            <label className="block text-[12px] font-semibold text-[#1F2937] mb-1.5">
              Proof file or image <span className="font-normal text-[#9CA3AF]">(optional)</span>
            </label>
            <input
              ref={fileInput}
              type="file"
              accept={PROOF_ACCEPT}
              onChange={handlePick}
              disabled={isResolving}
              className="block w-full text-[12px] text-[#6B7280] file:mr-3 file:rounded-lg file:border file:border-[#E5E9EF] file:bg-white file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#10365A] hover:file:bg-[#F9FAFB]"
            />
            {file ? (
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-[#E5E9EF] bg-[#F9FAFB] px-3 py-1.5 text-[12px]">
                <span className="truncate text-[#1F2937]" title={file.name}>
                  {file.name} <span className="text-[#9CA3AF]">({formatSize(file.size)})</span>
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={isResolving}
                  className="ml-3 shrink-0 font-semibold text-[#DC2626] hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-[#9CA3AF]">PNG, JPG, WEBP or PDF, up to 10 MB.</p>
            )}
          </div>
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
