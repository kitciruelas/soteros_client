import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface StaffSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const StaffSidebar: React.FC<StaffSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      name: 'Home',
      path: '/staff',
      icon: 'ri-home-line',
      description: 'Dashboard Overview'
    },
    {
      name: 'Assigned Incidents',
      path: '/staff/incidents',
      icon: 'ri-alert-line',
      description: 'View Your Incidents'
    },
    {
      name: 'Incident Map',
      path: '/staff/incidents/map',
      icon: 'ri-map-pin-line',
      description: 'View Incidents on Map'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/staff') {
      return location.pathname === '/staff';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
        w-64 border-r border-gray-200
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="ri-shield-check-line text-white text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Staff Portal</h2>
              <p className="text-sm text-gray-600">Navigation</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                // Close mobile menu when item is clicked
                if (window.innerWidth < 768) {
                  onClose();
                }
              }}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive(item.path)
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <i className={`${item.icon} text-xl`}></i>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">Emergency Response</p>
            <p className="text-xs text-gray-400">Management System</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffSidebar;
















