import React from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmActionModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Replaces window.confirm() for jobsite-credential pipeline actions
// (Accept, Unapprove) — same shadcn Dialog primitive already used by
// RejectCredentialModal, just a plain confirm/cancel shape.
const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  title,
  description,
  confirmLabel = "Confirm",
  isConfirming,
  destructive,
  onConfirm,
  onClose,
}) => {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <p className="text-sm text-muted-foreground">{description}</p>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isConfirming}
          className={destructive ? "bg-red-600 hover:bg-red-700 text-white" : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default ConfirmActionModal;
