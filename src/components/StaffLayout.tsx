import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { getAuthState, clearAuthData } from '../utils/auth';
import { staffAuthApi } from '../utils/api';
import LogoutModal from './LogoutModal';

interface StaffLayoutProps {
  children?: React.ReactNode;
}

const StaffLayout: React.FC<StaffLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const authState = getAuthState();
    
    if (!authState.isAuthenticated) {
      navigate('/auth/login');
      return;
    }

    if (authState.userType !== 'staff') {
      navigate('/');
      return;
    }

    setUserData(authState.userData);
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
        if (isProfileDropdownOpen) {
          setIsProfileDropdownOpen(false);
        }
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isProfileDropdownOpen && !target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    if (isProfileDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen, isProfileDropdownOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsProfileDropdownOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsMobileMenuOpen(false);
  };

  const closeProfileDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  const handleNavigation = (path: string) => {
    closeProfileDropdown();
    closeMobileMenu();
    navigate(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    closeProfileDropdown();
    closeMobileMenu();
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      // Call the logout API to log the activity
      await staffAuthApi.logout();
      clearAuthData();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local auth data
      clearAuthData();
      navigate('/');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50 transition-all duration-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <i className="ri-shield-check-line text-xl text-white"></i>
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold text-gray-900">Staff Portal</span>
                  <span className="block text-sm text-gray-600">Emergency Response Management</span>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                <button
                  onClick={() => handleNavigation('/staff')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveRoute('/staff') && !isActiveRoute('/staff/incidents')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => handleNavigation('/staff/incidents')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveRoute('/staff/incidents') && !isActiveRoute('/staff/incidents/map')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Incident Assigned
                </button>
                <button
                  onClick={() => handleNavigation('/staff/incidents/map')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActiveRoute('/staff/incidents/map')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Map View
                </button>
              </div>

              {/* Desktop Profile */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="relative profile-dropdown">
                  <button
                    onClick={toggleProfileDropdown}
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 font-medium focus:outline-none group"
                  >
                    <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-semibold text-sm">
                        {userData.name?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                        {userData.name || userData.email?.split('@')[0] || 'Staff Member'}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-32" title={userData?.email || 'No email'}>
                        {userData?.email || 'No email'}
                      </p>
                    </div>
                    <i className={`ri-arrow-down-s-line ml-1 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''} group-hover:text-blue-600`}></i>
                  </button>
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 rounded-t-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-white font-semibold text-lg">
                              {userData.name?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'S'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {userData.name || userData.email?.split('@')[0] || 'Staff Member'}
                            </p>
                            <p className="text-gray-600 text-xs truncate" title={userData?.email || 'No email'}>
                              {userData?.email || 'No email provided'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {userData.position || 'Staff Member'}
                            </p>
                            <div className="flex items-center mt-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                              <span className="text-xs text-gray-500">Online</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-2">
                        <button
                          onClick={() => handleNavigation('/staff/profile')}
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
                          onClick={() => handleNavigation('/staff/feedback')}
                          className="flex items-center w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                            <i className="ri-feedback-line text-gray-600 group-hover:text-blue-600"></i>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Submit Feedback</p>
                            <p className="text-xs text-gray-500">Help us improve the app</p>
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
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none"
                onClick={toggleMobileMenu}
                aria-label="Toggle mobile menu"
              >
                <i className={`ri-${isMobileMenuOpen ? 'close' : 'menu'}-line text-xl text-gray-700`}></i>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeMobileMenu}></div>
            <div className="fixed top-16 left-0 right-0 bg-white shadow-xl border-t border-gray-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="px-4 py-6 space-y-2">
                <button
                  onClick={() => handleNavigation('/staff')}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    isActiveRoute('/staff') && !isActiveRoute('/staff/incidents') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <i className="ri-dashboard-line text-lg mr-3"></i>
                  Dashboard
                </button>
                <button
                  onClick={() => handleNavigation('/staff/incidents')}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    isActiveRoute('/staff/incidents') && !isActiveRoute('/staff/incidents/map')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <i className="ri-error-warning-line text-lg mr-3"></i>
                  Incident Assigned
                </button>
                <button
                  onClick={() => handleNavigation('/staff/incidents/map')}
                  className={`flex items-center w-full px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                    isActiveRoute('/staff/incidents/map')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <i className="ri-map-pin-line text-lg mr-3"></i>
                  Map View
                </button>


                <div className="border-t border-gray-200 my-4"></div>

                {/* Mobile User Info Card */}
                <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white font-semibold text-lg">
                        {userData.name?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-base truncate">
                        {userData.name || userData.email?.split('@')[0] || 'Staff Member'}
                      </p>
                      <p className="text-gray-600 text-sm truncate" title={userData?.email || 'No email'}>
                        {userData?.email || 'No email provided'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {userData.position || 'Staff Member'}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                        <span className="text-xs text-gray-500">Online</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Menu Items */}
                <button
                  onClick={() => handleNavigation('/staff/profile')}
                  className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                    <i className="ri-settings-line text-gray-600 group-hover:text-blue-600"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Account Settings</p>
                    <p className="text-xs text-gray-500">Manage your profile</p>
                  </div>
                </button>

                <button
                  onClick={handleLogoutClick}
                  className="flex items-center w-full px-4 py-3 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
                    <i className="ri-logout-box-line text-gray-600 group-hover:text-red-600"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Sign Out</p>
                    <p className="text-xs text-gray-500">Logout from your account</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="pt-4">
          <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children || <Outlet />}
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />
    </>
  );
};

export default StaffLayout;
