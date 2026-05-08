"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  templateName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export function DeleteConfirmModal({
  open,
  onClose,
  templateName,
  onConfirm,
  loading,
}: DeleteConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Move to Recycle Bin</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Are you sure you want to move &quot;{templateName}&quot; to the recycle bin?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={loading}>
            {loading ? "Moving..." : "Move to Bin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
