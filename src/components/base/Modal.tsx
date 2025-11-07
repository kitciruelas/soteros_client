import React, { useEffect } from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer
}: ModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl'
  };

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4">
        <div 
          className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} my-8 transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-white rounded-t-2xl">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            )}
          </div>
          
          {/* Content - Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
          
          {/* Footer - Fixed */}
          {footer && (
            <div className="flex-shrink-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: string;
  iconColor?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon = 'ri-question-line',
  iconColor = 'text-blue-600',
  isLoading = false,
  loadingText = 'Processing...'
}: ConfirmModalProps) {
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm" showCloseButton={false}>
      <div className="text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <i className={`${icon} text-2xl ${iconColor}`}></i>
        </div>
        
        {/* Message */}
        <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
            fullWidth
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                {loadingText}
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
