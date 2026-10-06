"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OutstandingRequest } from "@/hooks/api/missing-info-template.api";

/**
 * Confirmation for the Customer-queue "Resolve" action. Resolving is manual only:
 * the request leaves the outstanding list, who resolved it is recorded, nothing is
 * sent to the client and no automation runs. There is no undo, so it asks first.
 */
export default function ResolveRequestModal({
  request,
  onClose,
  onConfirm,
  isResolving,
}: {
  request: OutstandingRequest | null;
  onClose: () => void;
  onConfirm: () => void;
  isResolving: boolean;
}) {
  return (
    <Dialog
      open={request !== null}
      onOpenChange={(v) => {
        if (!v && !isResolving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Resolve this request?</DialogTitle>
          <DialogDescription>
            The request leaves the outstanding list and is recorded as resolved by you. Nothing is
            sent to the client and no automation runs. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-1 rounded-lg border border-[#E5E9EF] bg-[#F9FAFB] px-3 py-2.5 text-[13px]">
            <div className="text-[#6B7280]">
              Client: <strong className="text-[#1F2937]">{request.clientName}</strong>
              {request.clientEmail ? ` (${request.clientEmail})` : ""}
            </div>
            <div className="text-[#6B7280]">
              Request: <strong className="text-[#1F2937]">{request.templateName || "Missing information request"}</strong>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isResolving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isResolving} className="bg-[#0B96D6] hover:bg-[#0a86c0] text-white">
            {isResolving ? "Resolving..." : "Resolve request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
