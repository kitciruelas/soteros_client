import React from 'react';
import Button from './base/Button';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: LogoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-8 text-center">
            <h3 className="text-xl font-bold text-white mb-1">Are You Sure?</h3>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-center text-gray-700 mb-6">
              Are you sure you want to sign out?
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={onConfirm}
                disabled={isLoading}
                fullWidth
              >
                {isLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Signing out...
                  </>
                ) : (
                  <>
                    <i className="ri-logout-box-line mr-2"></i>
                    Yes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onClose}
                disabled={isLoading}
                fullWidth
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
