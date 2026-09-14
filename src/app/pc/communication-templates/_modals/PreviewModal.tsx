"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CommunicationTemplate, EmailTemplateType } from "@/hooks/useCommunicationTemplates";

const TYPE_BADGE: Record<EmailTemplateType, string> = {
  customer: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  admin: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
};

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: CommunicationTemplate | null;
}

export function PreviewModal({ open, onClose, template }: PreviewModalProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (open) setViewport("desktop");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[820px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl">{template?.name ?? "Template Preview"}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {template?.type && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[template.type]}`}>
                    {template.type === "admin" ? "Admin" : "Customer"}
                  </span>
                )}
                {template?.key && (
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {template.key}
                  </span>
                )}
                {template?.updatedAt && (
                  <span className="text-xs text-gray-400">
                    Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 shrink-0">
              <button
                type="button"
                title="Desktop width"
                onClick={() => setViewport("desktop")}
                className={`p-1.5 rounded-full transition-colors ${viewport === "desktop" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Monitor size={15} />
              </button>
              <button
                type="button"
                title="Mobile width"
                onClick={() => setViewport("mobile")}
                className={`p-1.5 rounded-full transition-colors ${viewport === "mobile" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <Smartphone size={15} />
              </button>
            </div>
          </div>
        </DialogHeader>

        <p className="text-xs text-gray-500 -mt-2">
          Raw EJS tags (e.g. <code>&lt;%= name %&gt;</code>) render as literal text here — this is a
          structural preview, not a live send-test with real data.
        </p>

        <div className="flex justify-center rounded-lg bg-gray-100 p-4">
          <iframe
            srcDoc={template?.body ?? "<p>No content</p>"}
            className="rounded-md border border-gray-200 bg-white shadow-sm transition-all duration-300"
            style={{ height: 520, width: viewport === "mobile" ? 390 : "100%" }}
            sandbox="allow-same-origin"
            title="Template Preview"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
