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

type SelectedRequest = {
  clientName: string;
  channel: string;
  templateId: string;
};

interface BulkReminderModalProps {
  open: boolean;
  onClose: () => void;
  count: number;
  selectedRequests?: SelectedRequest[];
  onConfirm: () => void;
  isSending: boolean;
}

export default function BulkReminderModal({
  open,
  onClose,
  count,
  selectedRequests = [],
  onConfirm,
  isSending,
}: BulkReminderModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            Send reminder to {count} client{count !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription>
            Reminders will be sent via each client&apos;s preferred channels:
          </DialogDescription>
        </DialogHeader>

        <ul className="text-[13px] leading-relaxed pl-4 my-0 space-y-1">
          {selectedRequests.map((req, i) => (
            <li key={i}>
              <strong>{req.clientName}</strong> — {req.channel === "whatsapp" ? "WhatsApp" : "Email"}
            </li>
          ))}
        </ul>

        <div className="bg-[#EEF6FF] rounded-lg px-3 py-2.5 text-[11px] text-[#10365A]">
          A delivery report will be sent to your inbox once all reminders are processed.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSending || count === 0}
            className="bg-[#0B96D6] hover:bg-[#0a86c0] text-white"
          >
            {isSending
              ? "Sending..."
              : `Send ${count} reminder${count !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
