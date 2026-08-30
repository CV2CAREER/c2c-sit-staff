"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteOptionModalProps {
  open: boolean;
  onClose: () => void;
  optionLabel: string;
  hasChildren: boolean;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export function DeleteOptionModal({
  open,
  onClose,
  optionLabel,
  hasChildren,
  onConfirm,
  loading,
}: DeleteOptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Option</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Move &quot;{optionLabel}&quot; to the recycle bin?
          {hasChildren ? " Its nested options will be moved with it." : ""} Customers will no
          longer see it. You can restore it or delete it permanently from the recycle bin later.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={loading}>
            {loading ? "Moving..." : "Move to Recycle Bin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
