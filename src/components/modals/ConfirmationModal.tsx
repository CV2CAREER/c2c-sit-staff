// ConfirmationModal.jsx
import React from 'react';

import { Button } from '@/components/ui/button'; 
import { Typography } from 'antd'; 
import AppModal from './AppModal';

const { Text } = Typography;

const ConfirmationModal = ({
  visible,
  title = 'Are you sure?',
  description = 'Please confirm that you want to proceed with this action.', 
  onConfirm,
  onCancel,
  confirmLoading = false,
  confirmText = 'Confirm', 
  cancelText = 'Cancel',   
}: {
  visible: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; // Extend with shadcn variants
  cancelButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; // Extend with shadcn variants
}) => {
  return (
    <AppModal
      title={title}
      isOpen={visible}
      onClose={onCancel} 
    >
      <div className="grid gap-4 py-4">
        {/* Description */}
        <Text type="secondary" className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </Text>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost" // Use the new prop for cancel button variant
            onClick={onCancel}
            disabled={confirmLoading} // Disable cancel while confirming
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmLoading}
          >
            {confirmLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {confirmText === 'Confirm' ? 'Confirming...' : 'Loading...'} {/* Dynamic loading text */}
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </AppModal>
  );
};

export default ConfirmationModal;