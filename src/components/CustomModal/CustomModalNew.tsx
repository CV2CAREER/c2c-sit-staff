// Deprecated: Will be deleted in later versions
import { useEffect } from 'react';

interface CustomModalProps {
  toggleVisibility?: (s: boolean) => void;
  visibility: boolean;
  children: React.ReactNode | any;
  callBack?: () => void;
  classNameToModifyModalPosition?: string;
  dialogPanelClassName?: string;
  callbackTrigger?: boolean;
}

const CustomModal = ({
  toggleVisibility = () => {},
  visibility,
  children,
  callBack = () => {},
  classNameToModifyModalPosition = 'center',
  dialogPanelClassName,
  callbackTrigger,
}: CustomModalProps) => {
  const closeModal = () => {
    if (!callbackTrigger) {
      toggleVisibility(false);
      callBack();
    }
  };

  // Disable body scroll when modal is open
  useEffect(() => {
    if (visibility) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visibility]);

  if (!visibility) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-80"
        onClick={closeModal}
      ></div>

      {/* Modal */}
      <div
        className={`relative z-[80] w-full max-w-[37.5rem] transform overflow-hidden shadow-xl transition-all bg-white rounded-lg ${
          dialogPanelClassName || ''
        }`}
      >
        <div
          className={`flex min-h-full items-center justify-${classNameToModifyModalPosition} p-8`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;