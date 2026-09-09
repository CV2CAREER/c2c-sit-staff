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
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePromptDialog;
