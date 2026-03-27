import React from 'react';
import { FiLoader } from 'react-icons/fi';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-80 md:w-96 p-[1.5rem] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Confirm Logout</h2>
          <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>

          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-career-blue-800 hover:bg-blue-600'
              } text-white rounded-md transition flex items-center justify-center`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FiLoader className="mr-2 h-4 w-4 animate-spin" /> Logging Out...
                </>
              ) : (
                'Log Out'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomUserLogoutModal;
