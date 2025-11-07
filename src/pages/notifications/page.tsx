"use client"

import { useState, useEffect } from "react"
import { notificationsApi, type Notification } from "../../types/notifications"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread' | 'alert' | 'safety_protocol' | 'welfare' | 'system'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const itemsPerPage = 20

  useEffect(() => {
    loadNotifications()
  }, [currentPage, filter])

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const offset = (currentPage - 1) * itemsPerPage
      const response = await notificationsApi.getNotifications(itemsPerPage, offset)
      
      if (response.success) {
        let filteredNotifications = response.notifications
        
        // Apply filters
        if (filter === 'unread') {
          filteredNotifications = filteredNotifications.filter(n => !n.is_read)
        } else if (filter !== 'all') {
          filteredNotifications = filteredNotifications.filter(n => n.type === filter)
        }
        
        setNotifications(filteredNotifications)
        setUnreadCount(response.unreadCount)
        setTotalPages(Math.ceil(response.total / itemsPerPage))
        setTotalItems(response.total)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'alert':
        return severity === 'emergency' ? 'ri-error-warning-fill' : 'ri-alarm-warning-line'
      case 'safety_protocol':
        return 'ri-shield-check-line'
      case 'welfare':
        return 'ri-heart-pulse-line'
      case 'system':
        return 'ri-settings-line'
      default:
        return 'ri-notification-line'
    }
  }

  const getNotificationColor = (severity: string) => {
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'alert':
        return 'Alert'
      case 'safety_protocol':
        return 'Safety Protocol'
      case 'welfare':
        return 'Welfare Check'
      case 'system':
        return 'System'
      default:
        return 'Notification'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'emergency':
        return 'Emergency'
      case 'warning':
        return 'Warning'
      case 'info':
        return 'Info'
      default:
        return 'General'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Stay updated with alerts, safety protocols, and welfare checks
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap self-start sm:self-auto"
              >
                <i className="ri-check-double-line mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Mark all as read</span>
                <span className="sm:hidden">Mark read</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                <i className="ri-notification-line text-blue-600 text-sm sm:text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                <i className="ri-error-warning-line text-red-600 text-sm sm:text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Unread</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{unreadCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                <i className="ri-alarm-warning-line text-orange-600 text-sm sm:text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Alerts</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'alert').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                <i className="ri-shield-check-line text-green-600 text-sm sm:text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Safety</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">
                  {notifications.filter(n => n.type === 'safety_protocol').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All', count: totalItems },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'alert', label: 'Alerts', count: notifications.filter(n => n.type === 'alert').length },
              { key: 'safety_protocol', label: 'Safety', count: notifications.filter(n => n.type === 'safety_protocol').length },
              { key: 'welfare', label: 'Welfare', count: notifications.filter(n => n.type === 'welfare').length },
              { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === filterOption.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">{filterOption.label}</span>
                <span className="sm:hidden">{filterOption.label.length > 5 ? filterOption.label.substring(0, 4) : filterOption.label}</span>
                <span className="ml-1">({filterOption.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <i className="ri-notification-off-line text-5xl sm:text-6xl text-gray-300"></i>
              <p className="text-gray-500 mt-4 text-base sm:text-lg">No notifications found</p>
              <p className="text-gray-400 mt-2 text-sm sm:text-base">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-3 sm:p-4 md:p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 border ${getNotificationColor(notification.severity)}`}>
                      <i className={`${getNotificationIcon(notification.type, notification.severity)} text-base sm:text-lg`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 break-words">
                          {notification.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {!notification.is_read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                              New
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getNotificationColor(notification.severity)}`}>
                            {getSeverityLabel(notification.severity)}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                            {getTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-3 break-words">{notification.message}</p>
                      <div className="flex items-center text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center">
                          <i className="ri-time-line mr-1"></i>
                          <span className="break-words">{new Date(notification.created_at).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 mt-4 sm:mt-6">
            <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left order-2 sm:order-1">
              <span className="hidden sm:inline">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
              </span>
              <span className="sm:hidden">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <div className="flex space-x-2 justify-center sm:justify-end order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center"
              >
                <i className="ri-arrow-left-line mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center"
              >
                <span>Next</span>
                <i className="ri-arrow-right-line ml-1 sm:ml-2"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
