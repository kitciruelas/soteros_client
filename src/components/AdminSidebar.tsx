import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  children?: SidebarItem[];
}

interface AdminSidebarProps { 
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed = false }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);
  const isCollapsed = collapsed;

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'ri-dashboard-3-line',
      path: '/admin/dashboard'
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: 'ri-notification-3-line',
      path: '/admin/alerts',
     
    },
    {
      id: 'evacuation',
      label: 'Evacuation Management',
      icon: 'ri-map-pin-line',
      path: '/admin/evacuation',
      children: [
        {
          id: 'evacuation-centers',
          label: 'Evacuation Centers',
          icon: 'ri-building-2-line',
          path: '/admin/evacuation/centers'
        },
   /*
{
  id: 'evacuation-routes',
  label: 'Evacuation Routes',
  icon: 'ri-route-line',
  path: '/admin/evacuation/routes'
},
*/
        
        {
          id: 'evacuation-resources',
          label: 'Evacuation Resources',
          icon: 'ri-tools-line',
          path: '/admin/evacuation/resources'
        }
      ]
    },
    {
      id: 'incidents',
      label: 'Incident Management',
      icon: 'ri-error-warning-line',
      path: '/admin/incidents',
      children: [
        {
          id: 'incident-map',
          label: 'Incident Map',
          icon: 'ri-map-pin-2-line',
          path: '/admin/incidents/map'
        },
        {
          id: 'view-incidents',
          label: 'View Incidents',
          icon: 'ri-eye-line',
          path: '/admin/incidents/view'
        }
      ]
    },
    {
      id: 'users',
      label: 'User Management',
      icon: 'ri-user-line',
      path: '/admin/users'
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: 'ri-team-line',
      path: '/admin/staff'
    },
    {
      id: 'teams',
      label: 'Teams Management',
      icon: 'ri-group-line',
      path: '/admin/teams'
    },
    {
      id: 'safety-protocols',
      label: 'Safety Protocols',
      icon: 'ri-shield-check-line',
      path: '/admin/safety-protocols'
    },

      {
      id: 'welfare',
      label: 'Welfare Check',
      icon: 'ri-heart-pulse-line',
      path: '/admin/welfare'
    },
    {
      id: 'feedback',
      label: 'User Feedback',
      icon: 'ri-chat-1-line',
      path: '/admin/feedback'
    },
   
    {
      id: 'activity-logs',
      label: 'Activity Logs',
      icon: 'ri-history-line',
      path: '/admin/activity-logs'
    }
  
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => {
    if (path === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/')) return true;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.path) || (hasChildren ? item.children!.some(child => isActive(child.path)) : false);

    return (
      <div key={item.id} className="mb-1 group relative">
        <div className="relative">
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'} py-3 text-left rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
              } ${level > 0 && !isCollapsed ? 'ml-4' : ''}`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <i className={`${item.icon} text-lg ${isCollapsed ? '' : 'mr-3'}`}></i>
                {!isCollapsed && (
                  <>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
              {!isCollapsed && (
                <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-lg transition-transform`}></i>
              )}
            </button>
          ) : (
            <Link
              to={item.path}
              className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
              } ${level > 0 && !isCollapsed ? 'ml-4' : ''}`}
            >
              <i className={`${item.icon} text-lg ${isCollapsed ? '' : 'mr-3'}`}></i>
              {!isCollapsed && (
                <>
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )}
        </div>

        {!isCollapsed && hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}

        {isCollapsed && hasChildren && (
          <div className="absolute left-full top-0 ml-2 hidden group-hover:block bg-white border border-gray-200 rounded-md shadow-lg py-2 z-50 min-w-[200px]">
            {item.children!.map(child => {
              const childActive = isActive(child.path);
              return (
                <Link
                  key={child.id}
                  to={child.path}
                  className={`flex items-center px-3 py-2 text-sm ${childActive ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <i className={`${child.icon} text-base mr-2`}></i>
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {isCollapsed && !hasChildren && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow hidden group-hover:block whitespace-nowrap z-50">
            {item.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white shadow-xl border-r border-gray-200 h-full flex flex-col transition-all duration-200`}> 
      {/* Header */}
      <div className={`${isCollapsed ? 'p-4' : 'p-6'} border-b border-gray-200`}>
        <div className="flex items-center">
          <div className={`bg-blue-600 rounded-lg flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-10 h-10 mr-3'}`}>
            <i className="ri-admin-line text-white text-xl"></i>
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
              <p className="text-sm text-gray-500">SoteROS Emergency</p>
            </div>
          )}
         
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'} overflow-y-auto relative thin-scrollbar`}>
        <nav className="space-y-2">
          {sidebarItems.map(item => renderSidebarItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200`}> 
        <div className="flex items-center text-sm text-gray-500">
          <i className={`${isCollapsed ? 'ri-information-line' : 'ri-shield-check-line'} ${isCollapsed ? '' : 'mr-2'}`}></i>
          {!isCollapsed && <span>Emergency Management System</span>}
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
