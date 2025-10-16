"use client"

import React from 'react'

interface AlertModalProps {
  isOpen: boolean
  onClose: () => void
  alert: {
    id: number
    title?: string
    description?: string
    message?: string
    severity?: 'info' | 'warning' | 'emergency'
    alert_type?: string
    created_at?: string
  } | null
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, alert }) => {
  if (!isOpen || !alert) return null

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'emergency':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'emergency':
        return 'ri-error-warning-fill'
      case 'warning':
        return 'ri-alarm-warning-line'
      case 'info':
        return 'ri-information-line'
      default:
        return 'ri-notification-line'
    }
  }

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'emergency':
        return 'Emergency Alert'
      case 'warning':
        return 'Warning Alert'
      case 'info':
        return 'Information Alert'
      default:
        return 'Alert'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className={`px-6 py-4 border-b ${getSeverityColor(alert.severity)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(alert.severity)}`}>
                  <i className={`${getSeverityIcon(alert.severity)} text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getSeverityLabel(alert.severity)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Unknown time'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              {alert.title || 'Alert Notification'}
            </h4>
            
            <div className="mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                {alert.alert_type ? alert.alert_type.replace('_', ' ').toUpperCase() : 'ALERT'}
              </span>
            </div>

            <div className="text-gray-700 leading-relaxed">
              {alert.description || alert.message || 'No description available'}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertModal
