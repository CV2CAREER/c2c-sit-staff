import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  closeOnOutsideClick?: boolean;
  children: React.ReactNode;
  title?: string;
  contentClassName?: string
}

const AppModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  closeOnOutsideClick = true,
  children,
  title,
  contentClassName
}) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: any) => {
        if (!open && closeOnOutsideClick) {
          onClose();
        }
      }}
    >
      <DialogContent
        className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] shadow-lg
        bg-white rounded-lg overflow-hidden [&>button:last-child]:hidden ${contentClassName || 'max-w-md w-full'}`}
        onInteractOutside={(e: any) => {
          if (!closeOnOutsideClick) {
            e.preventDefault();
          }
        }}
      >
        <DialogTitle className={title ? "sr-only" : "sr-only"}>
          {title || "Dialog"}
        </DialogTitle>
        {title && (
          <div className="px-8 pt-8 pb-0">
            <h2 className="text-2xl font-bold mb-4 text-black">{title}</h2>
          </div>
        )}
        <div className="max-h-[650px] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppModal;
