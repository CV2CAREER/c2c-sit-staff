"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteQuestionModalProps {
  open: boolean;
  onClose: () => void;
  questionLabel: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export function DeleteQuestionModal({
  open,
  onClose,
  questionLabel,
  onConfirm,
  loading,
}: DeleteQuestionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Question</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Move &quot;{questionLabel}&quot; to the recycle bin? Clients will no longer see this
          question. You can restore it or delete it permanently from the recycle bin later.
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
