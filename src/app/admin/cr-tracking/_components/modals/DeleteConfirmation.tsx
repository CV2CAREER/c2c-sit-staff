import React, { useState } from "react";
import { ExclamationCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog"; // Assuming Dialog is the parent

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  itemName: string;
  recycle?: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  recycle
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[90vw] md:min-w-[60vw] lg:min-w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Confirm Deletion
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <ExclamationCircleOutlined className="text-3xl text-yellow-500 mr-4" />
            <p className="text-lg font-medium">Delete CR "{itemName}"?</p>
          </div>
          {!recycle ? (
            <p className="text-sm text-gray-600 mb-6">
              This will move the CR to Recycle Bin. Are you sure you want to
              proceed?
            </p>
          ) : (
            <p className="text-sm text-gray-600 mb-6">
              This permanently delete this CR. Are you sure you want to proceed?
            </p>
          )}
          <div className="flex justify-end space-x-4">
            <Button
              onClick={onClose}
              className="px-6 h-10 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-300 flex items-center justify-center"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="px-6 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center justify-center"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span>
                  <LoadingOutlined /> &nbsp; Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </div>{" "}
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmModal;
