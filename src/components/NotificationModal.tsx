"use client"

import React from 'react'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  notification: {
    id: number
    title?: string
    message?: string
    type?: 'alert' | 'safety_protocol' | 'welfare' | 'system'
    severity?: 'info' | 'warning' | 'emergency'
    created_at?: string
  } | null
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, notification }) => {
  if (!isOpen || !notification) return null

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

  const getSeverityIcon = (severity?: string, type?: string) => {
    if (type === 'system' && notification.title?.includes('Welcome')) {
      return 'ri-hand-heart-line'
    }
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

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'system':
        return 'System Notification'
      case 'alert':
        return 'Alert'
      case 'safety_protocol':
        return 'Safety Protocol'
      case 'welfare':
        return 'Welfare Check'
      default:
        return 'Notification'
    }
  }

  const isWelcomeMessage = notification.title?.includes('Welcome')

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
          <div className={`px-6 py-4 border-b ${isWelcomeMessage ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : getSeverityColor(notification.severity)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isWelcomeMessage ? 'bg-blue-100 text-blue-600' : getSeverityColor(notification.severity)}`}>
                  <i className={`${getSeverityIcon(notification.severity, notification.type)} text-xl`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isWelcomeMessage ? 'Welcome!' : getTypeLabel(notification.type)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {notification.created_at ? new Date(notification.created_at).toLocaleString() : 'Unknown time'}
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
              {notification.title || 'Notification'}
            </h4>
            
            {notification.type && !isWelcomeMessage && (
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {notification.type.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )}

            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {notification.message || 'No message available'}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationModal

