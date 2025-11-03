"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
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
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(propIsAuthenticated || false)
  const [userData, setUserData] = useState<UserData | null>(propUserData || null)
  const [userType, setUserType] = useState<'user' | 'admin' | 'staff' | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [isMobileServicesOpen, setIsMobileServicesOpen] = useState(false)
  const isPathActive = (path: string) => typeof window !== 'undefined' && window.location.pathname === path
  const [isScrolled, setIsScrolled] = useState(false)
  const servicesHoverTimeoutRef = useRef<number | null>(null)
  
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
      if (isServicesDropdownOpen && !target.closest(".services-dropdown")) {
        setIsServicesDropdownOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    if (isProfileDropdownOpen || showNotifDropdown || isServicesDropdownOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.addEventListener("click", handleClickOutside)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("click", handleClickOutside)
      document.body.style.overflow = "unset"
    }
  }, [isMobileMenuOpen, isProfileDropdownOpen, showNotifDropdown, isServicesDropdownOpen])

  // Detect scroll to toggle rounded pill style
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
    setIsServicesDropdownOpen(false) // Close services dropdown when opening mobile menu
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
    setIsServicesDropdownOpen(false)

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
      <nav className="sticky top-2 sm:top-3 z-50 transition-all duration-200">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Inner bar (rounded only after scroll) */}
          <div className={`mb-3 transition-all duration-300 max-w-6xl mx-auto ${
            isScrolled
              ? 'mt-4 sm:mt-5 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-full px-3 sm:px-4 md:px-6'
              : 'mt-2 px-0 bg-transparent'
          }`}>
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center min-w-0 flex-shrink-0">
              <img
                src="/images/soteros_logo.png"
                alt="Logo"
                className="w-28 h-28 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 ..."
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
            <div className="hidden lg:flex items-center space-x-3 xl:space-x-4 2xl:space-x-6">
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
                className={`text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-sm xl:text-base whitespace-nowrap px-2 py-2 rounded-lg hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isPathActive('/') ? 'text-blue-600' : ''}`}
              >
                Home
              </button>
              {/* Services Dropdown */}
              <div
                className="relative services-dropdown"
                onMouseEnter={() => {
                  if (servicesHoverTimeoutRef.current) {
                    window.clearTimeout(servicesHoverTimeoutRef.current)
                    servicesHoverTimeoutRef.current = null
                  }
                  setIsServicesDropdownOpen(true)
                }}
                onMouseLeave={() => {
                  if (servicesHoverTimeoutRef.current) {
                    window.clearTimeout(servicesHoverTimeoutRef.current)
                  }
                  servicesHoverTimeoutRef.current = window.setTimeout(() => {
                    setIsServicesDropdownOpen(false)
                  }, 150)
                }}
              >
                <button
                  onClick={() => setIsServicesDropdownOpen(!isServicesDropdownOpen)}
                className={`flex items-center text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-sm xl:text-base whitespace-nowrap px-2 py-2 rounded-lg hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isPathActive('/evacuation-center') || isPathActive('/safety-protocols') || isPathActive('/welfare-check') ? 'text-blue-600' : ''}`}
                >
                  Services
                  <i className={`ri-arrow-down-s-line ml-1 transition-transform duration-200 ${isServicesDropdownOpen ? "rotate-180" : ""}`}></i>
                </button>
                {isServicesDropdownOpen && (
                  <div
                    className="absolute left-0 mt-2 w-[22rem] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95"
                    onMouseEnter={() => {
                      if (servicesHoverTimeoutRef.current) {
                        window.clearTimeout(servicesHoverTimeoutRef.current)
                        servicesHoverTimeoutRef.current = null
                      }
                    }}
                    onMouseLeave={() => {
                      if (servicesHoverTimeoutRef.current) {
                        window.clearTimeout(servicesHoverTimeoutRef.current)
                      }
                      servicesHoverTimeoutRef.current = window.setTimeout(() => {
                        setIsServicesDropdownOpen(false)
                      }, 150)
                    }}
                  >
                    {/* Arrow indicator */}
                    <div className="absolute left-8 -top-1.5 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45"></div>
                    <div className="p-3">
                      <div className="px-3 py-2 mb-2 border-b border-gray-100">
                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Services</p>
                      </div>
                      <div className="space-y-1">
                        <button
                          onClick={() => handleNavigation("/evacuation-center")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200">
                              <i className="ri-building-2-line"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">Evacuation Centers</p>
                                <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-blue-600"></i>
                              </div>
                              <p className="text-xs text-gray-500 truncate">Find nearby shelters and resources</p>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleNavigation("/safety-protocols")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200">
                              <i className="ri-shield-check-line"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">Safety Protocols</p>
                                <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-blue-600"></i>
                              </div>
                              <p className="text-xs text-gray-500 truncate">Official guides and preparedness tips</p>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleNavigation("/welfare-check")}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200">
                              <i className="ri-heart-pulse-line"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">Welfare Check</p>
                                <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-blue-600"></i>
                              </div>
                              <p className="text-xs text-gray-500 truncate">Check on residents' safety and needs</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleNavigation("/incident-report")}
                className={`text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-sm xl:text-base whitespace-nowrap px-2 py-2 rounded-lg hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isPathActive('/incident-report') ? 'text-blue-600' : ''}`}
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
                className={`text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-sm xl:text-base whitespace-nowrap px-2 py-2 rounded-lg hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
              >
                FAQs
              </button>
              <button
                onClick={() => handleNavigation("/about")}
                className={`text-gray-700 hover:text-blue-600 transition-colors font-medium text-sm lg:text-sm xl:text-base whitespace-nowrap px-2 py-2 rounded-lg hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isPathActive('/about') ? 'text-blue-600' : ''}`}
              >
                About
              </button>
          
            </div>

            {/* Desktop Auth - Profile Section with Notifications */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2 xl:space-x-3 min-w-0">
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
                        className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 cursor-pointer max-w-[calc(100vw-2rem)]"
                        onClick={() => {
                          closeNotificationDropdown()
                          handleNavigation("/notifications")
                        }}
                      >
                        {/* Header */}
                        <div className="px-3 sm:px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-lg">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Notifications</h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation(); // Prevent dropdown click
                                  await markAllAsRead();
                                }}
                                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                              >
                                <span className="hidden xs:inline">Mark all as read</span>
                                <span className="xs:hidden">Mark all</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="text-center py-6 sm:py-8">
                              <i className="ri-notification-off-line text-3xl sm:text-4xl text-gray-300"></i>
                              <p className="text-gray-500 mt-2 text-xs sm:text-sm">No notifications</p>
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
                                  className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    !isRead ? 'bg-blue-50' : ''
                                  }`}
                                >
                                    <div className="flex items-start space-x-2 sm:space-x-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                            {notification.title}
                                          </p>
                                          {!isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                          )}
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                                          {notification.message}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
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
                    className="flex items-center space-x-1 lg:space-x-2 xl:space-x-3 px-1 lg:px-2 xl:px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium focus:outline-none group min-w-0"
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
                      profilePicture={undefined}
                      size="md"
                      className="flex-shrink-0"
                    />
                    <div className="hidden xl:block text-left min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate max-w-24 2xl:max-w-32">
                        {(userData?.firstName || userData?.first_name) && (userData?.lastName || userData?.last_name)
                          ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
                          : userData?.email?.split("@")[0] || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-24 2xl:max-w-32" title={userData?.email || "No email"}>
                        {userData?.email || "No email"}
                      </p>
                    </div>
                    <i
                      className={`ri-arrow-down-s-line ml-1 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""} group-hover:text-blue-600 flex-shrink-0`}
                    ></i>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 sm:w-72 md:w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[calc(100vw-2rem)]">
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
                            profilePicture={undefined}
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
                            <p className="font-medium text-sm">Report History</p>
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
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 lg:px-6 py-2 rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium text-sm lg:text-base whitespace-nowrap shadow-md flex items-center gap-2"
                  >
                    <span className="hidden lg:inline">Get Started</span>
                    <span className="lg:hidden">Join</span>
                    <i className="ri-arrow-right-line"></i>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button and Notifications */}
            <div className="md:hidden flex items-center space-x-1">
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
                      className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 cursor-pointer max-w-[calc(100vw-2rem)]"
                      onClick={() => {
                        closeNotificationDropdown()
                        handleNavigation("/notifications")
                      }}
                    >
                      {/* Header */}
                      <div className="px-3 sm:px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-xl">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation(); // Prevent dropdown click
                                await markAllAsRead();
                              }}
                              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                            >
                              <span className="hidden xs:inline">Mark all as read</span>
                              <span className="xs:hidden">Mark all</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center py-6 sm:py-8">
                            <i className="ri-notification-off-line text-3xl sm:text-4xl text-gray-300"></i>
                            <p className="text-gray-500 mt-2 text-xs sm:text-sm">No notifications</p>
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
                                  className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                    !isRead ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <div className="flex items-start space-x-2 sm:space-x-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                          {notification.title}
                                        </p>
                                        {!isRead && (
                                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                                        {notification.message}
                                      </p>
                                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
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
              <i className={`ri-${isMobileMenuOpen ? "close" : "menu"}-line text-lg sm:text-xl text-gray-700`}></i>
            </button>
            </div>
          </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeMobileMenu}></div>
          <div className="fixed top-14 sm:top-16 left-0 right-0 bg-white shadow-xl border-t border-gray-200 rounded-t-2xl max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-2">
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
                className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-home-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">Home</span>
              </button>
              
              {/* Mobile Services dropdown (card style) */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setIsMobileServicesOpen(!isMobileServicesOpen)}
                  aria-expanded={isMobileServicesOpen}
                  className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-gray-800"
                >
                  <span className="flex items-center">
                    <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3">
                      <i className="ri-briefcase-line"></i>
                    </span>
                    <span className="text-sm sm:text-base font-medium">Services</span>
                  </span>
                  <span className={`w-8 h-8 flex items-center justify-center rounded-lg ${isMobileServicesOpen ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500'}`}>
                    <i className={`ri-arrow-down-s-line transition-transform duration-200 ${isMobileServicesOpen ? 'rotate-180' : ''}`}></i>
                  </span>
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isMobileServicesOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'} `}>
                  <div className="overflow-hidden">
                    <div className="pb-2">
                      <button
                        onClick={() => handleNavigation('/evacuation-center')}
                        className="w-full px-5 py-3 flex items-center text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <i className="ri-building-2-line text-lg mr-3"></i>
                        <span className="text-sm">Evacuation Centers</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/safety-protocols')}
                        className="w-full px-5 py-3 flex items-center text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <i className="ri-shield-check-line text-lg mr-3"></i>
                        <span className="text-sm">Safety Protocols</span>
                      </button>
                      <button
                        onClick={() => handleNavigation('/welfare-check')}
                        className="w-full px-5 py-3 flex items-center text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <i className="ri-heart-pulse-line text-lg mr-3"></i>
                        <span className="text-sm">Welfare Check</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleNavigation("/incident-report")}
                className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
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
                className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-question-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">FAQ</span>
              </button>
              <button
                onClick={() => handleNavigation("/about")}
                className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <i className="ri-information-line text-lg mr-3 flex-shrink-0"></i>
                <span className="text-sm sm:text-base">About</span>
              </button>


              <div className="border-t border-gray-200 my-4"></div>

              {isAuthenticated ? (
                <div className="space-y-3">
                  {/* Mobile User Info Card */}
                  <div className="px-3 sm:px-4 py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
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
                        profilePicture={undefined}
                        size="lg"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {(userData?.firstName || userData?.first_name) && (userData?.lastName || userData?.last_name)
                            ? `${userData.firstName || userData.first_name} ${userData.lastName || userData.last_name}`
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
                    className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
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
                    className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
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
                    className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
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
                    className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
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
                    className="flex items-center w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium"
                  >
                    <i className="ri-login-box-line text-lg mr-3 flex-shrink-0"></i>
                    <span className="text-sm sm:text-base">Sign In</span>
                  </button>
                  <button
                    onClick={() => handleNavigation("/auth/signup")}
                    className="flex items-center justify-center w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
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