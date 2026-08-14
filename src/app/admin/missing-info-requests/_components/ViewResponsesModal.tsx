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
import { RequestResponse, RequestResponsesData } from "@/hooks/api/missing-info-template.api";

interface ViewResponsesModalProps {
  open: boolean;
  onClose: () => void;
  data: RequestResponsesData | null;
  isLoading: boolean;
}

function formatValue(value: string | null, fieldType: string): string {
  if (!value) return "—";
  
  if (fieldType === "file") {
    return value;
  }
  
  if (fieldType === "date") {
    try {
      return new Date(value).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }
  
  return value;
}

function isHttpUrl(value: string | null): value is string {
  return !!value && (value.startsWith("http://") || value.startsWith("https://"));
}

export default function ViewResponsesModal({
  open,
  onClose,
  data,
  isLoading,
}: ViewResponsesModalProps) {
  if (!data) return null;

  const { request, responses } = data;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-[#10365A]">
            Responses for {request.client?.name || "Client"}
          </DialogTitle>
          <DialogDescription>
            {request.template?.name} • {responses.length} response{responses.length !== 1 ? "s" : ""}
            {request.personalMessage && (
              <p className="mt-1 text-[12px] text-[#6B7280] italic">
                "{request.personalMessage}"
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#9CA3AF] text-[13px]">Loading responses...</p>
          </div>
        ) : responses.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#9CA3AF] text-[13px]">No responses submitted yet.</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4">
            {responses.map((response) => (
              <div
                key={response.id}
                className="border border-[#E5E9EF] rounded-xl bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-[#1F2937]">
                      {response.fieldLabel}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      Type: {response.fieldType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#9CA3AF]">
                      {new Date(response.createdAt).toLocaleString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-[#F9FAFB] rounded-lg">
                  {response.fieldType === "file" && isHttpUrl(response.fieldValue) ? (
                    <a
                      href={formatValue(response.fieldValue, response.fieldType)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] text-[#0B96D6] hover:underline"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                        />
                      </svg>
                      View File
                    </a>
                  ) : (
                    <p className="text-[13px] text-[#1F2937] whitespace-pre-wrap">
                      {formatValue(response.fieldValue, response.fieldType)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border border-[#E5E9EF] text-[#10365A] font-semibold text-[13px]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
