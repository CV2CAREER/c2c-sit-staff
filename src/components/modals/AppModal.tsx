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
        className={`fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] p-8 shadow-lg
        max-h-[650px] overflow-y-auto custom-scrollbar bg-white rounded-lg ${contentClassName || 'max-w-md w-full'}`}
        onInteractOutside={(e: any) => {
          if (!closeOnOutsideClick) {
            e.preventDefault();
          }
        }}
      >
        {title && (
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4 text-black">
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default AppModal;
