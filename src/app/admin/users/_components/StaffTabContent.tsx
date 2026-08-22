"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  ClientMissingInfoRequest,
  useSingleReminder,
  useCancelRequest,
} from "@/hooks/api/missing-info-template.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusPill, formatDate, OPEN_STATUSES } from "./missingInfoUi";

interface StaffTabContentProps {
  requests: ClientMissingInfoRequest[];
  isLoading: boolean;
  onViewResponses: (requestId: string) => void;
}

function metaFor(req: ClientMissingInfoRequest): string {
  const requested = `Requested ${formatDate(req.createdAt)}${
    req.requestedByName ? ` by ${req.requestedByName}` : ""
  }`;

  if (req.status === "submitted") {
    const submitted = req.fulfilledAt ? formatDate(req.fulfilledAt) : formatDate(req.createdAt);
    return `${requested} · Submitted ${submitted} (${req.ageDays} day${req.ageDays !== 1 ? "s" : ""})`;
  }
  if (req.status === "cancelled") return `${requested} · Cancelled by admin`;
  if (req.status === "declined") return `${requested} · Client declined to provide`;
  if (req.status === "failed") return `${requested} · Failed — last attempt today`;
  if (req.status === "expired") return `${requested} · No response — expired ${formatDate(req.createdAt)}`;
  if (req.reminderCount > 0)
    return `${requested} · Reminder sent ${formatDate(req.lastReminderAt)}`;
  return `${requested} · Pending`;
}

export default function StaffTabContent({
  requests,
  isLoading,
  onViewResponses,
}: StaffTabContentProps) {
  const { sendSingleReminder } = useSingleReminder();
  const { cancelRequest } = useCancelRequest();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClientMissingInfoRequest | null>(null);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-[13px] text-[#9CA3AF]">
        Loading requests…
      </div>
    );
  }

  const handleReminder = async (id: string) => {
    setBusyId(id);
    try {
      await sendSingleReminder(id);
      toast.success("Reminder sent");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to send reminder");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      await cancelRequest(cancelTarget.id);
      toast.success("Request cancelled");
      setCancelTarget(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to cancel request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="divide-y divide-[#EEF2F6]">
        {requests.map((req) => {
          const isOpen = OPEN_STATUSES.includes(req.status);
          return (
            <div
              key={req.id}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#0F1E2E]">
                    {req.templateName ||
                      req.missingInfoType.replace(/_/g, " ")}
                  </span>
                  <StatusPill status={req.status} />
                </div>
                <p className="mt-1 text-[11.5px] text-[#5B6B7C]">
                  {metaFor(req)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {req.status === "submitted" && (
                  <button
                    onClick={() => onViewResponses(req.id)}
                    className="text-[12px] font-semibold text-[#0B96D6] hover:underline"
                  >
                    View submission →
                  </button>
                )}
                {isOpen && (
                  <>
                    <button
                      onClick={() => handleReminder(req.id)}
                      disabled={busyId === req.id}
                      className="rounded-lg border border-[#E5E9EF] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#10365A] hover:border-[#0B96D6] hover:text-[#0B96D6] disabled:opacity-50"
                    >
                      Send reminder
                    </button>
                    <button
                      onClick={() => setCancelTarget(req)}
                      disabled={busyId === req.id}
                      className="rounded-lg border border-[#E5E9EF] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#5B6B7C] hover:border-[#DC2626] hover:text-[#DC2626] disabled:opacity-50"
                    >
                      Cancel request
                    </button>
                  </>
                )}
                {req.status === "failed" && (
                  <button
                    onClick={() =>
                      toast("Contact options opened — Email / Call / WhatsApp", {
                        icon: "📞",
                      })
                    }
                    className="rounded-lg border border-[#E5E9EF] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#10365A] hover:border-[#0B96D6] hover:text-[#0B96D6]"
                  >
                    Contact client
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(v) => !v && setCancelTarget(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[#10365A]">
              Cancel request?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel "
              {cancelTarget?.templateName || "this request"}"? The client will
              no longer see it as pending, and no further reminders will be
              sent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              className="border border-[#E5E9EF] text-[#10365A] font-semibold text-[13px]"
            >
              Keep request
            </Button>
            <Button
              onClick={handleCancel}
              disabled={busyId === cancelTarget?.id}
              className="bg-[#DC2626] text-white font-semibold text-[13px] hover:bg-[#B91C1C]"
            >
              {busyId === cancelTarget?.id
                ? "Cancelling…"
                : "Yes, cancel request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
