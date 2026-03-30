// hooks/useConfirmationModal.jsx
"use client"; 

import React, { useState, useCallback } from 'react';
import ConfirmationModal from '@/components/modals/ConfirmationModal'; // Adjust path as needed

export interface ConfirmationModalOptions {
  title?: string;
  description?: string;
  onConfirm: () => Promise<void> | void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  cancelButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

interface UseConfirmationModalReturn {
  openConfirmationModal: (options: ConfirmationModalOptions) => void;
  ConfirmationModalComponent: React.FC;
}

/**
 * Custom hook to manage and display a confirmation modal.
 * Provides a function to open the modal with dynamic content and a component to render the modal.
 * @returns {UseConfirmationModalReturn} An object containing `openConfirmationModal` and `ConfirmationModalComponent`.
 */
export const useConfirmationModal = (): UseConfirmationModalReturn => {
  const [modalState, setModalState] = useState<{
    visible: boolean;
    title?: string;
    description?: string;
    onConfirm?: () => Promise<void> | void;
    confirmLoading: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    visible: false,
    title: '',
    description: '',
    onConfirm: undefined,
    confirmLoading: false,
  });

  const openConfirmationModal = useCallback((options: ConfirmationModalOptions) => {
    setModalState({
      visible: true,
      title: options.title,
      description: options.description,
      onConfirm: options.onConfirm,
      confirmLoading: false,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
    });
  }, []);

  const handleCancel = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false, confirmLoading: false }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (modalState.onConfirm) {
      setModalState(prev => ({ ...prev, confirmLoading: true }));
      try {
        await modalState.onConfirm();
      } catch {
        // console.error("Confirmation action failed:", error);
      } finally {
        setModalState(prev => ({ ...prev, visible: false, confirmLoading: false }));
      }
    } else {
      handleCancel();
    }
  }, [modalState.onConfirm, handleCancel]);

  const ConfirmationModalComponent = useCallback(() => (
    <ConfirmationModal
      visible={modalState.visible}
      title={modalState.title}
      description={modalState.description}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      confirmLoading={modalState.confirmLoading}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
    />
  ), [
    modalState.visible,
    modalState.title,
    modalState.description,
    modalState.confirmLoading,
    modalState.confirmText,
    modalState.cancelText,
    handleConfirm,
    handleCancel,
  ]);

  return { openConfirmationModal, ConfirmationModalComponent };
};