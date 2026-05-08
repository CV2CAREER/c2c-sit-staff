"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CommunicationTemplate } from "@/hooks/useCommunicationTemplates";
import { buildPreviewHtml } from "../_utils/buildPreviewHtml";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: CommunicationTemplate | null;
}

export function PreviewModal({ open, onClose, template }: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{template?.templateName ?? "Template Preview"}</DialogTitle>
        </DialogHeader>
        <iframe
          srcDoc={buildPreviewHtml(template?.body ?? "", template?.subject ?? "")}
          className="w-full rounded-md border border-gray-200"
          style={{ height: 520 }}
          sandbox="allow-same-origin"
          title="Template Preview"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
