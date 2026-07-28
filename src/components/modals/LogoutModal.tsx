import React from 'react';
import { FiLoader } from 'react-icons/fi';
import { LogOut, X } from 'lucide-react';

// Logout Modal Component
const CustomUserLogoutModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-primary/15 bg-white p-6 shadow-[0_8px_30px_rgba(0,142,211,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogOut size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Confirm Logout</h2>
            <p className="mt-1 text-sm text-gray-500">Are you sure you want to log out of your account?</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-primary/20 px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow transition-colors ${
              isLoading ? 'cursor-not-allowed bg-primary/60' : 'bg-primary hover:bg-primary/90'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FiLoader className="h-4 w-4 animate-spin" /> Logging Out...
              </>
            ) : (
              'Log Out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomUserLogoutModal;
