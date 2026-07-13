"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClientContentSection } from "@/types/clientContent.types";
import { buildContentPreviewHtml } from "../_utils/buildContentPreviewHtml";

interface PreviewContentModalProps {
  open: boolean;
  onClose: () => void;
  section: ClientContentSection | null;
}

export function PreviewContentModal({
  open,
  onClose,
  section,
}: PreviewContentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{section?.name ?? "Content Preview"}</DialogTitle>
          {section?.placement && (
            <p className="text-xs text-gray-500">{section.placement}</p>
          )}
        </DialogHeader>
        <iframe
          srcDoc={buildContentPreviewHtml(section?.body ?? "")}
          className="w-full rounded-md border border-gray-200"
          style={{ height: 520 }}
          sandbox="allow-same-origin"
          title={`${section?.name ?? "Content"} preview`}
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
