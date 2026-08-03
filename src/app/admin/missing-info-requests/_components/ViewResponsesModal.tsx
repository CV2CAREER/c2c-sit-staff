"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRequestResponses, RequestResponsesData } from "@/hooks/api/missing-info-template.api";

interface ViewResponsesModalProps {
  open: boolean;
  requestId: string | null;
  onClose: () => void;
}

export default function ViewResponsesModal({ open, requestId, onClose }: ViewResponsesModalProps) {
  const { data, isLoading, isError, error, refetch } = useRequestResponses(
    open ? requestId : null,
  );

  useEffect(() => {
    if (open && requestId) {
      refetch();
    }
  }, [open, requestId, refetch]);

  const detail: RequestResponsesData | null = data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Responses</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.clientName || "\u2014"}${detail.clientEmail ? ` \u2022 ${detail.clientEmail}` : ""}`
              : "Loading responses..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-10 text-center text-[13px] text-[#9CA3AF]">
            Loading responses...
          </div>
        )}

        {isError && (
          <div className="py-10 text-center text-[13px] text-red-500">
            Failed to load responses.{" "}
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Please try again."}
          </div>
        )}

        {!isLoading && !isError && detail && detail.responses.length === 0 && (
          <div className="py-10 text-center text-[13px] text-[#9CA3AF]">
            No responses submitted yet.
          </div>
        )}

        {!isLoading && !isError && detail && detail.responses.length > 0 && (
          <div className="rounded-xl border border-[#E5E9EF] overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E9EF]">
                  <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-2.5 font-semibold w-[35%]">
                    Field
                  </th>
                  <th className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-2.5 font-semibold">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.responses.map((r) => (
                  <tr key={r.id} className="border-b border-[#E5E9EF] last:border-b-0">
                    <td className="px-4 py-3 text-[#10365A] font-semibold align-top">
                      {r.fieldLabel}
                    </td>
                    <td className="px-4 py-3 text-[#1F2937] whitespace-pre-wrap break-words">
                      {r.fieldValue || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
