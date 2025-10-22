import React, { useState, useEffect } from 'react';
import { useToast } from './base/Toast';

interface PrivacyNoticeProps {
  onAccept?: () => void;
  onDecline?: () => void;
  showDecline?: boolean;
  variant?: 'modal' | 'banner';
}

const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  onAccept,
  onDecline,
  showDecline = false,
  variant = 'banner'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Check if user has already accepted privacy notice
    const privacyAccepted = localStorage.getItem('privacy-notice-accepted');
    if (!privacyAccepted) {
      setIsVisible(true);
    } else {
      setHasAccepted(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('privacy-notice-accepted', 'true');
    localStorage.setItem('privacy-notice-accepted-date', new Date().toISOString());
    setHasAccepted(true);
    setIsVisible(false);
    onAccept?.();
    showToast({
      message: 'Privacy notice accepted. Your data is protected.',
      type: 'success'
    });
  };

  const handleDecline = () => {
    localStorage.setItem('privacy-notice-declined', 'true');
    localStorage.setItem('privacy-notice-declined-date', new Date().toISOString());
    setIsVisible(false);
    onDecline?.();
    showToast({
      message: 'Privacy notice declined. Some features may be limited.',
      type: 'warning'
    });
  };

  if (!isVisible || hasAccepted) {
    return null;
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <i className="ri-shield-check-line text-2xl text-blue-600 mr-3"></i>
              <h2 className="text-2xl font-bold text-gray-900">Data Privacy & Security</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <i className="ri-lock-line mr-2"></i>
                  Your Data is Protected
                </h3>
                <p className="text-blue-800 text-sm">
                  All incident reports and personal information are encrypted and stored securely. 
                  Only authorized personnel can access this data.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                  <i className="ri-eye-off-line mr-2"></i>
                  Privacy Controls
                </h3>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Incident data is not publicly accessible</li>
                  <li>• All access is logged and monitored</li>
                  <li>• Data is encrypted in transit and at rest</li>
                  <li>• Only authorized admin and staff can view reports</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
                  <i className="ri-information-line mr-2"></i>
                  Data Usage
                </h3>
                <p className="text-amber-800 text-sm">
                  Your incident reports are used solely for emergency response and public safety purposes. 
                  We do not share personal information with third parties without your consent.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </div>
              <div className="flex space-x-3">
                {showDecline && (
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Decline
                  </button>
                )}
                <button
                  onClick={handleAccept}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Accept & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  return (
    <div className="bg-blue-600 text-white p-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <i className="ri-shield-check-line text-xl mr-3"></i>
          <div>
            <p className="font-medium">Your data is protected with enterprise-grade security</p>
            <p className="text-blue-100 text-sm">
              All incident reports are encrypted and only accessible to authorized personnel.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {showDecline && (
            <button
              onClick={handleDecline}
              className="text-blue-200 hover:text-white transition-colors"
            >
              Decline
            </button>
          )}
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNotice;
