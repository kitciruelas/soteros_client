"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAuthState, clearAuthData, type UserData } from "../utils/auth"
import { userAuthApi } from "../utils/api"
import { notificationsApi } from "../types/notifications"
import LogoutModal from "./LogoutModal"
import AlertModal from "./AlertModal"
import Avatar from "./base/Avatar"

interface NavbarProps {
  isAuthenticated?: boolean
  userData?: UserData | null
}

const Navbar: React.FC<NavbarProps> = ({ isAuthenticated: propIsAuthenticated, userData: propUserData }) => {
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false)
  const [userData, setUserData] = useState<UserData | null>(propUserData || null)
  const [userType, setUserType] = useState<'user' | 'admin' | 'staff' | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  
  // Notification states (like AdminLayout)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [readNotifications, setReadNotifications] = useState<Set<number>>(() => {
    const saved = localStorage.getItem('readNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    const authState = getAuthState()
    // Only allow user type to access these pages
    const isUserAuth = authState.isAuthenticated && authState.userType === 'user'
    setIsAuthenticated(isUserAuth)
    setUserData(isUserAuth ? authState.userData : null)
    setUserType(isUserAuth ? authState.userType : null)

    const handleAuthStateChange = () => {
      const newAuthState = getAuthState()
      // Only allow user type to access these pages
      const isNewUserAuth = newAuthState.isAuthenticated && newAuthState.userType === 'user'
      setIsAuthenticated(isNewUserAuth)
      setUserData(isNewUserAuth ? newAuthState.userData : null)
      setUserType(isNewUserAuth ? newAuthState.userType : null)
    }

    window.addEventListener("storage", handleAuthStateChange)
    window.addEventListener("authStateChanged", handleAuthStateChange)

    return () => {
      window.removeEventListener("storage", handleAuthStateChange)
      window.removeEventListener("authStateChanged", handleAuthStateChange)
    }
  }, [])

  // Save read notifications to localStorage (like AdminLayout)
  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify([...readNotifications]));
  }, [readNotifications]);

  // Fetch notifications on mount (like AdminLayout)
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, userType });
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // Set up polling for notifications (like AdminLayout)
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false)
        }
        if (isProfileDropdownOpen) {
          setIsProfileDropdownOpen(false)
        }
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isProfileDropdownOpen && !target.closest(".profile-dropdown")) {
        setIsProfileDropdownOpen(false)
      }
      if (showNotifDropdown && !target.closest(".notification-dropdown")) {
        setShowNotifDropdown(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    if (isProfileDropdownOpen || showNotifDropdown) {
      document.addEventListener("keydown", handleKeyDown)
      document.addEventListener("click", handleClickOutside)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("click", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isMobileMenuOpen, isProfileDropdownOpen, showNotifDropdown])

  // Fetch notifications (like AdminLayout)
  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping notification fetch');
      return;
    }
    
    console.log('Fetching notifications for authenticated user');
    try {
      const response = await notificationsApi.getNotifications(10, 0);
      if (response.success && Array.isArray(response.notifications)) {
        setNotifications(response.notifications);

        // Clean up read notifications that are no longer in the list
        const currentIds = new Set(response.notifications.map(notif => notif.id));
        setReadNotifications(prev => {
          const cleaned = new Set([...prev].filter(id => currentIds.has(id)));
          return cleaned;
        });
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Set empty notifications on error to prevent UI issues
      setNotifications([]);
    }
  };

  // Toggle notification dropdown (like AdminLayout)
  const toggleNotifDropdown = () => {
    if (!showNotifDropdown) {
      fetchNotifications();
    }
    setShowNotifDropdown(!showNotifDropdown);
  };

  // Mark notification as read (like AdminLayout)
  const markAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setReadNotifications(prev => new Set([...prev, notificationId]));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Still update local state even if API call fails
      setReadNotifications(prev => new Set([...prev, notificationId]));
    }
  };

  // Mark all notifications as read (like AdminLayout)
  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      const allIds = notifications.map(notif => notif.id);
      setReadNotifications(new Set(allIds));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Still update local state even if API call fails
      const allIds = notifications.map(notif => notif.id);
      setReadNotifications(new Set(allIds));
    }
  };

  // Get unread notifications count (like AdminLayout)
  const unreadCount = notifications.filter(notif => !readNotifications.has(notif.id)).length;


  const toggleNotificationDropdown = () => {
    toggleNotifDropdown()
    setIsProfileDropdownOpen(false) // Close profile dropdown when opening notification dropdown
  }

  const closeNotificationDropdown = () => {
    setShowNotifDropdown(false)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    setIsProfileDropdownOpen(false) // Close profile dropdown when opening mobile menu
    setShowNotifDropdown(false) // Close notification dropdown when opening mobile menu
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen)
    setIsMobileMenuOpen(false) // Close mobile menu when opening profile dropdown
  }

  const closeProfileDropdown = () => {
    setIsProfileDropdownOpen(false)
  }

  const handleNavigation = (path: string) => {
    // Close all menus first
    closeProfileDropdown()
    closeMobileMenu()

    // If we're on the profile page, use window.location.href for reliable navigation
    if (window.location.pathname === "/profile") {
      window.location.href = path
      return
    }

    // Force navigation even if we're on the same path
    if (window.location.pathname === path) {
      window.location.reload()
      return
    }

    // Use React Router navigate for other pages
    try {
      navigate(path, { replace: false })
    } catch (error) {
      console.error("Navigation error:", error)
      // Fallback to window.location if navigate fails
      window.location.href = path
    }
  }

  const handleProfileClick = () => {
    handleNavigation("/profile")
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
    closeProfileDropdown()
    closeMobileMenu()
  }

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true)
    try {
      // Call the logout API to log the activity
      await userAuthApi.logout()
      clearAuthData()
      navigate("/")
    } catch (error) {
      console.error("Logout error:", error)
      // Even if API call fails, clear local auth data
      clearAuthData()
      navigate("/")
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  const handleLogoutCancel = () => {
    setShowLogoutModal(false)
  }

  return (
    <>
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50 transition-all duration-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center min-w-0 flex-shrink-0">
              <img
                src="/images/soterblue.png"
                alt="Logo"
                className="w-[130px] h-[130px] sm:w-[160px] sm:h-[160px] lg:w-[200px] lg:h-[200px] object-contain flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                onClick={() => {
                  if (window.location.pathname === "/") {
                    // If already on home page, scroll to hero section
                    const heroSection = document.getElementById("hero-section")
                    if (heroSection) {
                      heroSection.scrollIntoView({ behavior: "smooth" })
                    }
                  } else {
                    // If on other page, navigate to home
                    handleNavigation("/")
                  }
                }}
              />
              
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              <button
                onClick={() => {
                  if (window.location.pathname === "/") {
                    // If already on home page, scroll to hero section
                    const heroSection = document.getElementById("hero-section")
                    if (heroSection) {
                      heroSection.scrollIntoView({ behavior: "smooth" })
                    }
                  } else {
                    // If on other page, navigate to home
                    handleNavigation("/")
                  }
                }}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm xl:text-base whitespace-nowrap"
              >
                Home
              </button>
              <button
                onClick={() => handleNavigation("/evacuation-center")}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm xl:text-base whitespace-nowrap"
              >
               Evacuation Centers
              </button>
              <button
                onClick={() => handleNavigation("/incident-report")}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm xl:text-base whitespace-nowrap"
              >
                Report
              </button>
              <button
                onClick={() => {
                  if (window.location.pathname === "/") {
                    // If already on home page, scroll to FAQ section
                    const faqSection = document.getElementById("faq-section")
                    if (faqSection) {
                      faqSection.scrollIntoView({ behavior: "smooth" })
                    }
                  } else {
                    // If on other page, navigate to home and then scroll to FAQ
                    window.location.href = "/#faq-section"
                  }
                }}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm xl:text-base whitespace-nowrap"
              >
                FAQs
              </button>
          
            </div>

            {/* Desktop Auth - Profile Section with Notifications */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4 min-w-0">
              {isAuthenticated ? (
                <>
                  {/* Notification Icon */}
                  <div className="relative notification-dropdown">
                    <button
                      onClick={toggleNotificationDropdown}
                      className="relative p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 focus:outline-none"
                    >
                      <i className="ri-notification-line text-xl"></i>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    
                    {/* Notification Dropdown */}
                    {showNotifDropdown && (
                      <div 
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 cursor-pointer"
                        onClick={() => {
                          closeNotificationDropdown()
                          handleNavigation("/notifications")
                        }}
                      >
                        {/* Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation(); // Prevent dropdown click
                                  await markAllAsRead();
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8">
                              <i className="ri-notification-off-line text-4xl text-gray-300"></i>
                              <p className="text-gray-500 mt-2">No notifications</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                              const isRead = readNotifications.has(notification.id) || notification.is_read;
                              return (
                                <div
                                  key={notification.id}
                                  onClick={async (e) => {
                                    e.stopPropagation(); // Prevent dropdown click
                                    if (!isRead) {
                                      await markAsRead(notification.id);
                                    }
                                    
                                    // Navigate based on notification type
                                    if (notification.type === 'safety_protocol') {
                                      closeNotificationDropdown();
                                      handleNavigation("/safety-protocols");
                                    } else if (notification.type === 'alert') {
                                      closeNotificationDropdown();
                                      setSelectedAlert(notification);
                                      setShowAlertModal(true);
                                    } else if (notification.type === 'welfare') {
                                      closeNotificationDropdown();
                                      handleNavigation("/welfare-check");
                                    } else if (notification.type === 'system') {
                                      closeNotificationDropdown();
                                      handleNavigation("/history-report");
                                    }
                                  }}
                                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    !isRead ? 'bg-blue-50' : ''
                                  }`}
                                >
                                    <div className="flex items-start space-x-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {notification.title}
                                          </p>
                                          {!isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {new Date(notification.created_at).toLocaleString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Profile Dropdown */}
                <div className="relative profile-dropdown">
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center space-x-2 lg:space-x-3 px-2 lg:px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium focus:outline-none group min-w-0"
                  >
                    <Avatar
                      name={
                        userData?.firstName && userData?.lastName
                          ? `${userData.firstName} ${userData.lastName}`
                          : userData?.first_name && userData?.last_name
                          ? `${userData.first_name} ${userData.last_name}`
                          : undefined
                      }
                      email={userData?.email}
                      profilePicture={userData?.profile_picture}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="hidden lg:block text-left min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate max-w-32">
                        {(userData?.firstName || userData?.first_name) && (userData?.lastName || userData?.last_name)
                          ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
                          : userData?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-32" title={userData?.email || "No email"}>
                        {userData?.email || "No email"}
                      </p>
                    </div>
                    <i
                      className={`ri-arrow-down-s-line ml-1 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""} group-hover:text-blue-600 flex-shrink-0`}
                    ></i>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            name={
                              userData?.firstName && userData?.lastName
                                ? `${userData.firstName} ${userData.lastName}`
                                : userData?.first_name && userData?.last_name
                                ? `${userData.first_name} ${userData.last_name}`
                                : undefined
                            }
                            email={userData?.email}
                            profilePicture={userData?.profile_picture}
                            size="lg"
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {(userData?.firstName || userData?.first_name) &&
                              (userData?.lastName || userData?.last_name)
                                ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
                                : userData?.email?.split("@")[0] || "User"}
                            </p>
                            <p
                              className="text-gray-600 text-xs sm:text-sm truncate"
                              title={userData?.email || "No email"}
                            >
                              {userData?.email || "No email provided"}
                            </p>
                          
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={handleProfileClick}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <i className="ri-user-settings-line text-gray-600 group-hover:text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Account Settings</p>
                            <p className="text-xs text-gray-500">Manage your profile</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleNavigation("/history-report")}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <i className="ri-file-list-line text-gray-600 group-hover:text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">History Report</p>
                            <p className="text-xs text-gray-500">View your incident reports</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleNavigation("/feedback")}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <i className="ri-feedback-line text-gray-600 group-hover:text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Submit Feedback</p>
                            <p className="text-xs text-gray-500">Share your thoughts</p>
                          </div>
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={handleLogoutClick}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
                            <i className="ri-logout-box-line text-gray-600 group-hover:text-red-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Sign Out</p>
                            <p className="text-xs text-gray-500">Logout from your account</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <button
                    onClick={() => handleNavigation("/auth/login")}
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-base whitespace-nowrap"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => handleNavigation("/auth/signup")}
                    className="bg-blue-600 text-white px-3 lg:px-6 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm lg:text-base whitespace-nowrap"
                  >
                    <span className="hidden lg:inline">Get Started</span>
                    <span className="lg:hidden">Join</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button and Notifications */}
            <div className="md:hidden flex items-center space-x-2">
              {isAuthenticated && (
                <div className="relative notification-dropdown">
                  <button
                    onClick={toggleNotificationDropdown}
                    className="relative p-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 focus:outline-none"
                  >
                    <i className="ri-notification-line text-xl"></i>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Mobile Notification Dropdown */}
                  {showNotifDropdown && (
                    <div 
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 cursor-pointer"
                      onClick={() => {
                        closeNotificationDropdown()
                        handleNavigation("/notifications")
                      }}
                    >
                      {/* Header */}
                      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent dropdown click
                                markAllAsRead();
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8">
                            <i className="ri-notification-off-line text-4xl text-gray-300"></i>
                            <p className="text-gray-500 mt-2">No notifications</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => {
                              const isRead = readNotifications.has(notification.id) || notification.is_read;
                              return (
                                <div
                                  key={notification.id}
                                  onClick={async (e) => {
                                    e.stopPropagation(); // Prevent dropdown click
                                    if (!isRead) {
                                      await markAsRead(notification.id);
                                    }
                                    
                                    // Navigate based on notification type
                                    if (notification.type === 'safety_protocol') {
                                      closeNotificationDropdown();
                                      handleNavigation("/safety-protocols");
                                    } else if (notification.type === 'alert') {
                                      closeNotificationDropdown();
                                      setSelectedAlert(notification);
                                      setShowAlertModal(true);
                                    } else if (notification.type === 'welfare') {
                                      closeNotificationDropdown();
                                      handleNavigation("/welfare-check");
                                    } else if (notification.type === 'system') {
                                      closeNotificationDropdown();
                                      handleNavigation("/history-report");
                                    }
                                  }}
                                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    !isRead ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {notification.title}
                                        </p>
                                        {!isRead && (
                                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {new Date(notification.created_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}
              
            <button
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none flex-shrink-0"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <i className={`ri-${isMobileMenuOpen ? "close" : "menu"}-line text-xl text-gray-700`}></i>
            </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeMobileMenu}></div>
          <div className="fixed top-16 left-0 right-0 bg-white shadow-xl border-t border-gray-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-2">
              <button
                onClick={() => {
                  if (window.location.pathname === "/") {
                    // If already on home page, scroll to hero section
                    const heroSection = document.getElementById("hero-section")
                    if (heroSection) {
                      heroSection.scrollIntoView({ behavior: "smooth" })
                    }
                    // Close mobile menu
                    closeMobileMenu()
                  } else {
                    // If on other page, navigate to home
                    handleNavigation("/")
                  }
                }}
                className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-home-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">Home</span>
              </button>
              <button
                onClick={() => handleNavigation("/evacuation-center")}
                className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-building-2-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">Centers</span>
              </button>
              <button
                onClick={() => handleNavigation("/incident-report")}
                className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-error-warning-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">Report</span>
              </button>
              <button
                onClick={() => {
                  if (window.location.pathname === "/") {
                    // If already on home page, scroll to FAQ section
                    const faqSection = document.getElementById("faq-section")
                    if (faqSection) {
                      faqSection.scrollIntoView({ behavior: "smooth" })
                    }
                  } else {
                    // If on other page, navigate to home and then scroll to FAQ
                    window.location.href = "/#faq-section"
                  }
                  // Close mobile menu
                  closeMobileMenu()
                }}
                className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-question-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">FAQ</span>
              </button>


              <div className="border-t border-gray-200 my-4"></div>

              {isAuthenticated ? (
                <div className="space-y-3">
                  {/* Mobile User Info Card */}
                  <div className="px-3 sm:px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <Avatar
                        name={
                          userData?.firstName && userData?.lastName
                            ? `${userData.firstName} ${userData.lastName}`
                            : userData?.first_name && userData?.last_name
                            ? `${userData.first_name} ${userData.last_name}`
                            : undefined
                        }
                        email={userData?.email}
                        profilePicture={userData?.profile_picture}
                        size="lg"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {( userData?.first_name) && (userData?.last_name)
                            ? `${ userData.first_name} ${userData.last_name}`
                            : userData?.email?.split("@")[0] || "User"}
                        </p>
                        <p className="text-gray-600 text-xs sm:text-sm truncate" title={userData?.email || "No email"}>
                          {userData?.email || "No email provided"}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-1 flex-shrink-0"></div>
                          <span className="text-xs text-gray-500">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Menu Items */}
                  <button
                    onClick={() => handleNavigation("/profile")}
                    className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                      <i className="ri-settings-line text-gray-600 group-hover:text-blue-600"></i>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">Account Settings</p>
                      <p className="text-xs sm:text-sm text-gray-500">Manage your profile</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigation("/history-report")}
                    className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                      <i className="ri-file-list-line text-gray-600 group-hover:text-blue-600"></i>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">History Report</p>
                      <p className="text-xs sm:text-sm text-gray-500">View your incident reports</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigation("/feedback")}
                    className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                      <i className="ri-feedback-line text-gray-600 group-hover:text-blue-600"></i>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">Submit Feedback</p>
                      <p className="text-xs sm:text-sm text-gray-500">Share your thoughts</p>
                    </div>
                  </button>

                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors flex-shrink-0">
                      <i className="ri-logout-box-line text-gray-600 group-hover:text-red-600"></i>
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">Sign Out</p>
                      <p className="text-xs sm:text-sm text-gray-500">Logout from your account</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => handleNavigation("/auth/login")}
                    className="flex items-center w-full px-3 sm:px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
                  >
                    <i className="ri-login-box-line text-lg mr-3 flex-shrink-0"></i>
                    <span className="text-sm sm:text-base">Sign In</span>
                  </button>
                  <button
                    onClick={() => handleNavigation("/auth/signup")}
                    className="flex items-center justify-center w-full px-3 sm:px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
                  >
                    <i className="ri-user-add-line text-lg mr-2 flex-shrink-0"></i>
                    <span className="text-sm sm:text-base">Get Started</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        alert={selectedAlert}
      />
    </>
  )
}

export default Navbar