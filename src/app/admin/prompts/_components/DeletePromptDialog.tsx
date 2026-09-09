"use client";

import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HintMark from "./HintMark";
import { useDeleteVcsPrompt } from "../hooks/use-vcs-prompts";

interface DeletePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  promptKey: string;
  onDeleted: () => void;
}

const DeletePromptDialog = ({
  open,
  onOpenChange,
  id,
  promptKey,
  onDeleted,
}: DeletePromptDialogProps) => {
  const { mutateAsync: deletePrompt, isPending } = useDeleteVcsPrompt();

  const handleDelete = async () => {
    try {
      await deletePrompt({ id });
      toast.success(`Prompt "${promptKey}" moved to the recycle bin.`);
      onOpenChange(false);
      onDeleted();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete prompt.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Prompt</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-mono font-semibold text-gray-800">{promptKey}</span>
            ? Any service that looks up this key will stop finding a prompt while
            it&apos;s deleted. This moves it to the recycle bin — you can restore it
            or permanently delete it from there.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-between pt-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending} className="gap-1.5">
            {isPending ? "Deleting..." : "Delete Prompt"}
            <HintMark text="Soft-deletes this key — it moves to the Recycle Bin and can be restored later." className="bg-white/20 text-white hover:bg-white/30" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePromptDialog;
