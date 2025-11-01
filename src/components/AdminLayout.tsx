import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminAuthGuard from './AdminAuthGuard';
import { getAuthState, clearAuthData } from '../utils/auth';
import { adminAuthApi, incidentsApi, adminNotificationsApi } from '../utils/api';
import { apiRequest } from '../utils/api';
import websocketService, { type NotificationData } from '../services/websocketService';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [welfareReports, setWelfareReports] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('readNotifications');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const wsInitialized = useRef(false);
  const [newNotificationCount, setNewNotificationCount] = useState(0);
  const [floatingNotifications, setFloatingNotifications] = useState<Array<{
    id: string;
    type: 'incident' | 'welfare' | 'alert' | 'safety_protocol' | 'system' | 'team' | 'staff';
    title: string;
    message: string;
    timestamp: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    severity?: 'info' | 'warning' | 'high' | 'critical';
    actionUrl?: string | null;
    notificationId?: number;
  }>>([]);
  const [notificationSound, setNotificationSound] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const authState = getAuthState();
    if (authState.isAuthenticated && authState.userType === 'admin') {
      setAdminInfo(authState.userData);
    }

    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      if (newAuthState.isAuthenticated && newAuthState.userType === 'admin') {
        setAdminInfo(newAuthState.userData);
      } else {
        setAdminInfo(null);
      }
    };

    window.addEventListener('authStateChanged', handleAuthStateChange);
    return () => window.removeEventListener('authStateChanged', handleAuthStateChange);
  }, []);

  // Initialize notification sound
  useEffect(() => {
    // Create audio element for notification sound
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.preload = 'auto';
    setNotificationSound(audio);
    
    // Fallback: try to load notification sound, if it fails, create a simple beep
    audio.addEventListener('error', () => {
      console.log('Notification sound file not found, using fallback');
      // Create a simple beep using Web Audio API
    });
    
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Handle new admin notifications from the unified API
  const handleNewAdminNotification = React.useCallback((notificationData: any) => {
    console.log('📬 New admin notification received:', notificationData);
    
    // Increment new notification counter
    setNewNotificationCount(prev => prev + 1);
    
    // Determine notification type and priority
    const notifType = notificationData.type || 'system';
    const priority = notificationData.priority_level || 'medium';
    const severity = notificationData.severity || 'info';
    
    // Add to floating notifications
    addFloatingNotification({
      id: `notification-${notificationData.id}-${Date.now()}`,
      type: notifType as any,
      title: notificationData.title || 'New Notification',
      message: notificationData.message || '',
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      severity: severity as 'info' | 'warning' | 'high' | 'critical',
      actionUrl: notificationData.action_url || null,
      notificationId: notificationData.id,
      timestamp: Date.now()
    });

    // Update notifications list
    fetchNotifications();

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      const browserNotif = new Notification(notificationData.title || 'New Notification', {
        body: notificationData.message || '',
        icon: '/images/Slogo.png',
        tag: `notification-${notificationData.id}`,
        badge: '/images/Slogo.png',
        requireInteraction: priority === 'critical' || priority === 'high'
      });
      
      // Auto-close after 5 seconds for low priority, 10 seconds for high/critical
      const autoCloseTime = (priority === 'critical' || priority === 'high') ? 10000 : 5000;
      setTimeout(() => browserNotif.close(), autoCloseTime);
    }

    // Play notification sound
    if (notificationSound) {
      try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(err => {
          console.log('Could not play notification sound:', err);
        });
      } catch (error) {
        console.log('Error playing notification sound:', error);
      }
    } else {
      // Fallback: Use Web Audio API for a simple beep
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different frequencies based on priority
        const frequencies: Record<string, number> = {
          'critical': 800,
          'high': 600,
          'medium': 400,
          'low': 300
        };
        
        oscillator.frequency.value = frequencies[priority] || 400;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.log('Could not create audio context:', error);
      }
    }
  }, [notificationSound]);

  // Poll for new notifications every 30 seconds as backup
  useEffect(() => {
    let lastNotificationId = 0;
    const pollInterval = setInterval(async () => {
      try {
        const response = await adminNotificationsApi.getNotifications({ 
          limit: 5,
          unread_only: true
        });
        
        if (response.success && Array.isArray(response.notifications)) {
          // Check for new notifications
          const newNotifications = response.notifications.filter((notif: any) => 
            notif.id > lastNotificationId && !notif.is_read
          );
          
          if (newNotifications.length > 0) {
            lastNotificationId = Math.max(...newNotifications.map((n: any) => n.id));
            
            // Show pop-up for each new notification
            newNotifications.forEach((notif: any) => {
              handleNewAdminNotification(notif);
            });
          }
        }
      } catch (error) {
        console.error('Error polling for notifications:', error);
      }
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [handleNewAdminNotification]);

  // Initialize WebSocket connection and fetch notifications on mount
  useEffect(() => {
    const initializeWebSocket = async () => {
      const authState = getAuthState();
      console.log('🔍 Initial WebSocket Auth Check:', {
        isAuthenticated: authState.isAuthenticated,
        userType: authState.userType,
        hasToken: !!(authState as any).token,
        tokenLength: (authState as any).token?.length || 0,
        wsInitialized: wsInitialized.current
      });
      
      // Get token from localStorage directly if not in userData
      const token = (authState as any).token || localStorage.getItem('adminToken');
      
      if (authState.isAuthenticated && authState.userType === 'admin' && token && !wsInitialized.current) {
        wsInitialized.current = true;
        
        // Request browser notification permission
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        
        try {
          setWsConnectionStatus('connecting');
          await websocketService.connect(token);
          setWsConnectionStatus('connected');
          
          // Set up real-time notification handlers
          websocketService.on('new_incident', handleNewIncident);
          websocketService.on('new_welfare_report', handleNewWelfareReport);
          websocketService.on('incident_updated', handleIncidentUpdate);
          websocketService.on('welfare_updated', handleWelfareUpdate);
          // Add handler for general admin notifications
          websocketService.on('new_admin_notification', handleNewAdminNotification);
          
          console.log('WebSocket connected for real-time notifications');
        } catch (error) {
          console.error('Failed to connect WebSocket:', error);
          setWsConnectionStatus('disconnected');
        }
      } else {
        console.log('❌ WebSocket initialization skipped:', {
          reason: !authState.isAuthenticated ? 'Not authenticated' :
                  authState.userType !== 'admin' ? 'Not admin user' :
                  !token ? 'No token' :
                  wsInitialized.current ? 'Already initialized' : 'Unknown reason'
        });
        setWsConnectionStatus('disconnected');
      }
    };

    initializeWebSocket();
    fetchNotifications();

    // Retry WebSocket connection if it fails initially
    const retryConnection = () => {
      setTimeout(() => {
        if (wsConnectionStatus === 'disconnected' && !wsInitialized.current) {
          console.log('🔄 Retrying WebSocket connection...');
          initializeWebSocket();
        }
      }, 3000); // Retry after 3 seconds
    };
    
    retryConnection();

    // Periodic connection health check (less frequent)
    const healthCheckInterval = setInterval(() => {
      if (wsConnectionStatus === 'disconnected' && !wsInitialized.current) {
        console.log('🔄 Periodic WebSocket health check - attempting reconnection...');
        initializeWebSocket();
      }
    }, 30000); // Check every 30 seconds (less aggressive)

    // Cleanup WebSocket on unmount
    return () => {
      clearInterval(healthCheckInterval);
      websocketService.off('new_incident', handleNewIncident);
      websocketService.off('new_welfare_report', handleNewWelfareReport);
      websocketService.off('incident_updated', handleIncidentUpdate);
      websocketService.off('welfare_updated', handleWelfareUpdate);
      websocketService.off('new_admin_notification', handleNewAdminNotification);
    };
  }, []);

  // Save read notifications to localStorage
  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify([...readNotifications]));
  }, [readNotifications]);

  // Listen for WebSocket disconnection events and auto-reconnect
  useEffect(() => {
    const handleWebSocketDisconnect = () => {
      console.log('🔄 WebSocket disconnected, attempting auto-reconnect...');
      setWsConnectionStatus('disconnected');
      wsInitialized.current = false;
      
      // Attempt to reconnect after a short delay
      setTimeout(() => {
        const authState = getAuthState();
        const token = (authState as any).token || localStorage.getItem('adminToken');
        
        if (authState.isAuthenticated && authState.userType === 'admin' && token) {
          console.log('🔄 Auto-reconnecting WebSocket...');
          setWsConnectionStatus('connecting');
          websocketService.connect(token)
            .then(() => {
              setWsConnectionStatus('connected');
              console.log('✅ WebSocket auto-reconnected successfully');
            })
            .catch((error) => {
              console.error('❌ WebSocket auto-reconnection failed:', error);
              setWsConnectionStatus('disconnected');
            });
        }
      }, 2000);
    };

    // Handle tab visibility changes to maintain WebSocket connection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab became visible, checking WebSocket connection...');
        // Only reconnect if WebSocket is actually disconnected, not just because tab was hidden
        if (wsConnectionStatus === 'disconnected' && !wsInitialized.current) {
          const authState = getAuthState();
          const token = (authState as any).token || localStorage.getItem('adminToken');
          
          if (authState.isAuthenticated && authState.userType === 'admin' && token) {
            console.log('🔄 Reconnecting WebSocket after tab became visible (connection was lost)...');
            setWsConnectionStatus('connecting');
            websocketService.connect(token)
              .then(() => {
                setWsConnectionStatus('connected');
                console.log('✅ WebSocket reconnected after tab became visible');
              })
              .catch((error) => {
                console.error('❌ WebSocket reconnection failed after tab became visible:', error);
                setWsConnectionStatus('disconnected');
              });
          }
        } else if (wsConnectionStatus === 'connected') {
          console.log('👁️ Tab became visible - WebSocket still connected, no need to reconnect');
        }
      } else {
        console.log('👁️ Tab became hidden - WebSocket will continue running in background');
      }
    };

    window.addEventListener('websocketDisconnected', handleWebSocketDisconnect);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('websocketDisconnected', handleWebSocketDisconnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [wsConnectionStatus]);

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearAuthData();
      websocketService.disconnect();
      navigate('/admin/login');
    }
  };

  // WebSocket event handlers for real-time notifications
  const handleNewIncident = (incidentData: NotificationData) => {
    console.log('🚨 New incident received via WebSocket:', incidentData);
    
    // Increment new notification counter
    setNewNotificationCount(prev => prev + 1);
    
    // Add new incident to notifications list
    setNotifications(prev => {
      const newIncident = {
        ...incidentData,
        id: incidentData.id || (incidentData as any).incident_id,
        date_reported: incidentData.date_reported || new Date().toISOString()
      };
      
      // Check if incident already exists to avoid duplicates
      const exists = prev.some(notif => 
        (notif.id === newIncident.id || (notif as any).incident_id === newIncident.id)
      );
      
      if (!exists) {
        return [newIncident, ...prev].slice(0, 10); // Keep only latest 10
      }
      return prev;
    });

    // Add floating notification
    console.log('🎯 Adding floating notification for incident');
    addFloatingNotification({
      id: `incident-${incidentData.id || (incidentData as any).incident_id}`,
      type: 'incident',
      title: 'New Incident Report',
      message: `${incidentData.incident_type || 'Incident'} reported at ${incidentData.location || 'Unknown location'}`,
      priority: (incidentData.priority_level as 'low' | 'medium' | 'high' | 'critical') || 'medium'
    });

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('New Incident Report', {
        body: `${incidentData.incident_type || 'Incident'} reported at ${incidentData.location || 'Unknown location'}`,
        icon: '/images/Slogo.png',
        tag: `incident-${incidentData.id}`
      });
    }
  };

  const handleNewWelfareReport = (welfareData: NotificationData) => {
    console.log('❤️ New welfare report received via WebSocket:', welfareData);
    
    // Increment new notification counter
    setNewNotificationCount(prev => prev + 1);
    
    // Add new welfare report to welfare reports list
    setWelfareReports(prev => {
      const newWelfareReport = {
        ...welfareData,
        type: 'welfare',
        id: `welfare_${welfareData.report_id || welfareData.id}`,
        title: 'Welfare Check - Needs Help',
        description: welfareData.additional_info || welfareData.description || 'User needs assistance',
        date_reported: welfareData.submitted_at || welfareData.date_reported || new Date().toISOString(),
        priority_level: 'high',
        user_name: `${welfareData.first_name || ''} ${welfareData.last_name || ''}`.trim() || welfareData.user_name || 'Unknown User'
      };
      
      // Check if welfare report already exists to avoid duplicates
      const exists = prev.some(report => 
        report.id === newWelfareReport.id || 
        report.report_id === welfareData.report_id
      );
      
      if (!exists) {
        return [newWelfareReport, ...prev].slice(0, 5); // Keep only latest 5
      }
      return prev;
    });

    // Add floating notification
    console.log('🎯 Adding floating notification for welfare');
    addFloatingNotification({
      id: `welfare-${welfareData.report_id || welfareData.id}`,
      type: 'welfare',
      title: 'Welfare Check - Needs Help',
      message: `${welfareData.user_name || 'User'} needs assistance`,
      priority: 'high'
    });

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('Welfare Check - Needs Help', {
        body: `${welfareData.user_name || 'User'} needs assistance`,
        icon: '/images/Slogo.png',
        tag: `welfare-${welfareData.report_id || welfareData.id}`
      });
    }
  };

  const handleIncidentUpdate = (incidentData: NotificationData) => {
    console.log('Incident updated via WebSocket:', incidentData);
    
    // Update existing incident in notifications list
    setNotifications(prev => 
      prev.map(notif => 
        (notif.id === incidentData.id || notif.incident_id === incidentData.id) 
          ? { ...notif, ...incidentData }
          : notif
      )
    );
  };

  const handleWelfareUpdate = (welfareData: NotificationData) => {
    console.log('Welfare report updated via WebSocket:', welfareData);
    
    // Update existing welfare report in welfare reports list
    setWelfareReports(prev => 
      prev.map(report => 
        (report.id === `welfare_${welfareData.report_id}` || report.report_id === welfareData.report_id)
          ? { ...report, ...welfareData }
          : report
      )
    );
  };


  // Fetch notifications from unified admin notifications API
  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    
    try {
      // Fetch from the new admin notifications API
      const response = await adminNotificationsApi.getNotifications({ 
        limit: 50 
      });

      if (response.success && Array.isArray(response.notifications)) {
        // Separate notifications by type for backwards compatibility
        const incidents = response.notifications.filter((n: any) => n.type === 'incident');
        const welfareReports = response.notifications
          .filter((n: any) => n.type === 'welfare')
          .map((notif: any) => {
            // Parse metadata if it exists
            const metadata = notif.metadata || {};
            return {
              ...notif,
              id: `welfare_${notif.related_id || notif.id}`,
              notificationId: notif.id, // Preserve original notification ID for API calls
              report_id: notif.related_id,
              title: notif.title,
              description: notif.message,
              date_reported: notif.created_at,
              submitted_at: notif.created_at,
              user_name: metadata.user_name || 'Unknown User',
              status: metadata.status || 'needs_help'
            };
          });

        // Transform incidents to match expected format
        const transformedIncidents = incidents.map((notif: any) => {
          const metadata = notif.metadata || {};
          return {
            ...notif,
            id: notif.related_id || notif.id,
            incident_id: notif.related_id,
            notificationId: notif.id, // Preserve original notification ID for API calls
            incident_type: metadata.incident_type || notif.title.replace(/^[^\s]+\s+/, ''),
            description: notif.message,
            location: metadata.location || 'Unknown',
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            priority_level: notif.priority_level,
            date_reported: notif.created_at,
            status: 'pending'
          };
        });

        setNotifications(transformedIncidents);
        setWelfareReports(welfareReports);

        // Update read notifications based on API response and preserve existing read state
        // Store read state using the same ID format as transformed notifications
        const transformedIds = new Set<string>();
        transformedIncidents.forEach((incident: any) => {
          transformedIds.add(String(incident.id || incident.incident_id));
        });
        welfareReports.forEach((report: any) => {
          transformedIds.add(String(report.id));
        });

        setReadNotifications(prev => {
          const updated = new Set([...prev].filter(id => transformedIds.has(id)));
          
          // Add notifications that are marked as read in the database using transformed IDs
          response.notifications.forEach((notif: any) => {
            if (notif.is_read) {
              // Use the same ID format as transformed notifications
              if (notif.type === 'incident') {
                const transformedId = String(notif.related_id || notif.id);
                updated.add(transformedId);
              } else if (notif.type === 'welfare') {
                const transformedId = String(`welfare_${notif.related_id || notif.id}`);
                updated.add(transformedId);
              } else {
                // Fallback to original ID
                updated.add(String(notif.id));
              }
            }
          });
          
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin notifications:', error);
      // Fallback to old method if new API fails
      console.log('Falling back to legacy notification fetching...');
      try {
        const [incidentsResponse, welfareResponse] = await Promise.allSettled([
          incidentsApi.getIncidents(),
          apiRequest('/admin/welfare/reports?status=needs_help&limit=5')
        ]);

        let latestIncidents = [];
        if (incidentsResponse.status === 'fulfilled' && incidentsResponse.value.success) {
          latestIncidents = incidentsResponse.value.incidents.slice(0, 10);
          setNotifications(latestIncidents);
        }

        let latestWelfareReports = [];
        if (welfareResponse.status === 'fulfilled' && welfareResponse.value.success) {
          latestWelfareReports = welfareResponse.value.reports.map((report: any) => ({
            ...report,
            type: 'welfare',
            id: `welfare_${report.report_id}`,
            title: 'Welfare Check - Needs Help',
            description: report.additional_info || 'User needs assistance',
            date_reported: report.submitted_at,
            priority_level: 'high',
            user_name: `${report.first_name || ''} ${report.last_name || ''}`.trim() || 'Unknown User'
          }));
          setWelfareReports(latestWelfareReports);
        }
      } catch (fallbackError) {
        console.error('Fallback notification fetch also failed:', fallbackError);
      }
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // Toggle notification dropdown
  const toggleNotifDropdown = () => {
    if (!showNotifDropdown) {
      // Always fetch notifications asynchronously when opening dropdown
      fetchNotifications();
      // Reset new notification counter when opening dropdown
      setNewNotificationCount(0);
    }
    setShowNotifDropdown(!showNotifDropdown);
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string | number) => {
    const idString = String(notificationId);
    setReadNotifications(prev => new Set([...prev, idString]));
    
    // Find the notification to get the original notification ID for API call
    const allNotifs = [...notifications, ...welfareReports];
    const notif = allNotifs.find((n: any) => 
      String(n.id || n.incident_id) === idString || String(n.notificationId) === idString
    );
    
    // Use original notification ID for API call, fallback to provided ID
    const originalId = notif?.notificationId || notif?.id || notificationId;
    
    // Also mark as read in the database
    try {
      await adminNotificationsApi.markAsRead(Number(originalId));
      console.log('✅ Notification marked as read in database');
    } catch (error) {
      console.error('❌ Failed to mark notification as read in database:', error);
      // Keep local state updated even if API call fails
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const allIds = [...notifications, ...welfareReports].map((notif: any) => String(notif.id || notif.incident_id));
    setReadNotifications(new Set(allIds));
    
    // Also mark all as read in the database
    try {
      await adminNotificationsApi.markAllAsRead();
      console.log('✅ All notifications marked as read in database');
      // Refetch notifications to sync with database state
      await fetchNotifications();
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read in database:', error);
      // Keep local state updated even if API call fails
    }
  };

  // Get all notifications combined
  const allNotifications = [...notifications, ...welfareReports]
    .sort((a: any, b: any) => new Date(b.date_reported || b.submitted_at).getTime() - new Date(a.date_reported || a.submitted_at).getTime());

  // Show only 10 notifications by default, or all if showAllNotifications is true
  const displayedNotifications = showAllNotifications ? allNotifications : allNotifications.slice(0, 10);

  // Get unread notifications count
  const unreadCount = allNotifications.filter((notif: any) => !readNotifications.has(String(notif.id || notif.incident_id))).length;

  // Get priority incidents count (including welfare reports)
  const priorityIncidentsCount = allNotifications.filter((notif: any) => 
    notif.priority_level === 'high' || notif.priority_level === 'critical' || notif.type === 'welfare'
  ).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotifDropdown && !target.closest('.notification-dropdown') && !target.closest('.notification-button')) {
        setShowNotifDropdown(false);
      }
    };

    if (showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifDropdown]);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Floating notification functions
  const addFloatingNotification = (notification: {
    id: string;
    type: 'incident' | 'welfare' | 'alert' | 'safety_protocol' | 'system' | 'team' | 'staff';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    severity?: 'info' | 'warning' | 'high' | 'critical';
    actionUrl?: string | null | undefined;
    notificationId?: number;
    timestamp?: number;
  }) => {
    const newFloatingNotif = {
      ...notification,
      timestamp: notification.timestamp || Date.now()
    };
    
    setFloatingNotifications(prev => [...prev, newFloatingNotif]);
    
    // Auto-dismiss based on priority
    // Critical/High: 10 seconds, Medium: 7 seconds, Low: 5 seconds
    const dismissTime = 
      (notification.priority === 'critical' || notification.priority === 'high') ? 10000 :
      notification.priority === 'medium' ? 7000 : 5000;
    
    setTimeout(() => {
      removeFloatingNotification(newFloatingNotif.id);
    }, dismissTime);
  };

  const removeFloatingNotification = (id: string) => {
    setFloatingNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Test function to manually trigger floating notifications
  const testFloatingNotification = (type: 'incident' | 'welfare' = 'incident') => {
    if (type === 'incident') {
      addFloatingNotification({
        id: `test-incident-${Date.now()}`,
        type: 'incident',
        title: 'Test Incident Report',
        message: 'Fire incident reported at Test Location - This is a test notification',
        priority: 'high'
      });
    } else {
      addFloatingNotification({
        id: `test-welfare-${Date.now()}`,
        type: 'welfare',
        title: 'Test Welfare Check - Needs Help',
        message: 'Test User needs assistance - This is a test notification',
        priority: 'high'
      });
    }
  };

  // Manual WebSocket reconnection function
  const reconnectWebSocket = async () => {
    const authState = getAuthState();
    
    // Debug localStorage contents
    console.log('🔍 LocalStorage Debug:', {
      userInfo: localStorage.getItem('userInfo'),
      admin: localStorage.getItem('admin'),
      adminToken: localStorage.getItem('adminToken'),
      user: localStorage.getItem('user'),
      token: localStorage.getItem('token'),
      userToken: localStorage.getItem('userToken'),
      staff: localStorage.getItem('staff'),
      staffToken: localStorage.getItem('staffToken')
    });
    
    // Get token from localStorage directly if not in userData
    const token = (authState as any).token || localStorage.getItem('adminToken');
    
    console.log('🔍 Auth State Debug:', {
      isAuthenticated: authState.isAuthenticated,
      userType: authState.userType,
      hasTokenInUserData: !!(authState as any).token,
      hasTokenInLocalStorage: !!localStorage.getItem('adminToken'),
      finalToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 20) + '...' || 'No token'
    });
    
    if (authState.isAuthenticated && authState.userType === 'admin' && token) {
      console.log('🔄 Manually reconnecting WebSocket...');
      setWsConnectionStatus('connecting');
      try {
        await websocketService.connect(token);
        setWsConnectionStatus('connected');
        console.log('✅ WebSocket reconnected successfully');
      } catch (error) {
        console.error('❌ WebSocket reconnection failed:', error);
        setWsConnectionStatus('disconnected');
      }
    } else {
      console.error('❌ Cannot reconnect: No valid auth token');
      console.error('❌ Auth state details:', authState);
    }
  };

  return (
    <AdminAuthGuard>
      <div className="h-screen bg-gray-50 flex">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <AdminSidebar collapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
            <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl overflow-y-auto thin-scrollbar">
              <AdminSidebar />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Sticky Top Navigation Bar */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {/* Mobile Menu Button */}
                <button
                  onClick={toggleMobileMenu}
                  className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 mr-3"
                >
                  <i className="ri-menu-line text-xl"></i>
                </button>

                {/* Desktop Sidebar Toggle */}
                <button
                  onClick={toggleSidebar}
                  className="hidden lg:block p-2 rounded-lg text-gray-600 hover:bg-gray-100 mr-3"
                >
                  <i className={`ri-${isSidebarCollapsed ? 'menu-unfold' : 'menu-fold'}-line text-xl`}></i>
                </button>

                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              </div>

              {/* Admin Info & Actions */}
              <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={toggleNotifDropdown}
                  className="notification-button p-3 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-600 relative transition-all duration-200 group"
                >
                  <i className="ri-notification-3-line text-xl group-hover:scale-110 transition-transform"></i>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {newNotificationCount > 0 && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-bounce">
                      <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
                    </div>
                  )}
                  {priorityIncidentsCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifDropdown && (
                  <div className="notification-dropdown absolute right-0 mt-2 w-[520px] h-[520px] max-w-[100vw] max-h-[80vh] overflow-hidden bg-white rounded-xl shadow-2xl border border-gray-200 z-50 backdrop-blur-sm">
                    {/* Header with stats */}
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <h3 className="font-bold text-gray-900 text-lg flex items-center">
                            <i className="ri-notification-3-line mr-2 text-blue-600"></i>
                            Incident Alerts
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={fetchNotifications}
                            disabled={isLoadingNotifications}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh notifications"
                          >
                            <i className={`ri-refresh-line text-gray-500 ${isLoadingNotifications ? 'animate-spin' : ''}`}></i>
                          </button>
                          <button
                            onClick={() => setShowNotifDropdown(false)}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <i className="ri-close-line text-gray-500"></i>
                          </button>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div className="mt-3 flex justify-center">
                          <button
                            onClick={markAllAsRead}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <i className="ri-check-double-line mr-1"></i>
                            Mark All Read
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="h-[380px] max-h-[60vh] overflow-y-auto">
                      {isLoadingNotifications ? (
                        <div className="p-8 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                          <p className="text-sm font-medium">Loading notifications...</p>
                          <p className="text-xs text-gray-400 mt-1">Fetching latest incidents and welfare reports</p>
                        </div>
                      ) : allNotifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <i className="ri-notification-off-line text-4xl mb-3 block text-gray-300"></i>
                          <p className="text-sm font-medium">No notifications</p>
                          <p className="text-xs text-gray-400 mt-1">New incidents and welfare reports will appear here</p>
                        </div>
                      ) : (
                        displayedNotifications.map((notif) => {
                          const notificationId = notif.id || notif.incident_id;
                          const idString = String(notificationId);
                          const isRead = readNotifications.has(idString);
                          const isPriority = notif.priority_level === 'high' || notif.priority_level === 'critical' || notif.type === 'welfare';
                          const isWelfare = notif.type === 'welfare';
                          
                          const getPriorityColor = (priority: string) => {
                            if (isWelfare) return 'bg-red-100 text-red-800 border-red-200';
                            switch (priority) {
                              case 'critical': return 'bg-red-100 text-red-800 border-red-200';
                              case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
                              case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                              case 'low': return 'bg-green-100 text-green-800 border-green-200';
                              default: return 'bg-gray-100 text-gray-800 border-gray-200';
                            }
                          };
                          
                          return (
                            <div
                              key={notificationId}
                              className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 relative group ${
                                !isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                              } ${isPriority ? 'ring-1 ring-red-200 bg-red-50/30' : ''}`}
                              onClick={() => {
                                if (!isRead) {
                                  markAsRead(idString);
                                }
                                if (isWelfare) {
                                  navigate('/admin/welfare');
                                } else {
                                  navigate('/admin/incidents/view');
                                }
                                setShowNotifDropdown(false);
                              }}
                            >
                              {!isRead && (
                                <div className="absolute left-3 top-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              )}
                              {isPriority && (
                                <div className="absolute right-3 top-3">
                                  <i className={`${isWelfare ? 'ri-heart-pulse-line' : 'ri-fire-line'} text-red-500 text-sm animate-pulse`}></i>
                                </div>
                              )}
                              <div className={`${!isRead ? 'ml-4' : ''} ${isPriority ? 'pr-6' : ''}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <p className={`text-sm font-semibold ${isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                      {isWelfare ? 'Welfare Check - Needs Help' : notif.incident_type}
                                    </p>
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full border ${getPriorityColor(notif.priority_level)}`}>
                                      {isWelfare ? 'WELFARE' : notif.priority_level?.toUpperCase()}
                                    </span>
                                    {isPriority && (
                                      <span className="text-xs text-red-600 font-bold flex items-center">
                                        <i className={`${isWelfare ? 'ri-heart-pulse-line' : 'ri-alarm-warning-line'} mr-1`}></i>
                                        {isWelfare ? 'NEEDS HELP' : 'URGENT'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400 ml-2">
                                    {new Date(notif.date_reported || notif.submitted_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className={`text-xs leading-relaxed mb-2 ${isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {isWelfare ? (
                                    <span>
                                      <strong>{notif.user_name}</strong> needs assistance
                                      {notif.description && ` - ${notif.description.length > 80 ? notif.description.substring(0, 80) + '...' : notif.description}`}
                                    </span>
                                  ) : (
                                    notif.description?.length > 100 
                                      ? `${notif.description.substring(0, 100)}...` 
                                      : notif.description
                                  )}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xs text-gray-400 flex items-center">
                                      <i className="ri-time-line mr-1"></i>
                                      {new Date(notif.date_reported || notif.submitted_at).toLocaleTimeString()}
                                    </span>
                                    {isWelfare ? (
                                      <span className="text-xs text-gray-400 flex items-center">
                                        <i className="ri-user-line mr-1"></i>
                                        {notif.user_name}
                                      </span>
                                    ) : notif.location && (
                                      <span className="text-xs text-gray-400 flex items-center">
                                        <i className="ri-map-pin-line mr-1"></i>
                                        {notif.location.length > 20 ? `${notif.location.substring(0, 20)}...` : notif.location}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                                    <span className="mr-1">{isWelfare ? 'View Welfare' : 'View'}</span>
                                    <i className="ri-arrow-right-s-line group-hover:translate-x-1 transition-transform"></i>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* See More Button */}
                    {allNotifications.length > 10 && !showAllNotifications && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                        <button
                          onClick={() => setShowAllNotifications(true)}
                          className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
                        >
                          <i className="ri-eye-line mr-2"></i>
                          See More ({allNotifications.length - 10} more)
                        </button>
                      </div>
                    )}

                    {/* Show Less Button */}
                    {showAllNotifications && allNotifications.length > 10 && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                        <button
                          onClick={() => setShowAllNotifications(false)}
                          className="w-full py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center font-medium"
                        >
                          <i className="ri-eye-off-line mr-2"></i>
                          Show Less
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>

                {/* Profile Dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <i className="ri-user-line text-white text-sm"></i>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {adminInfo?.name || adminInfo?.first_name || adminInfo?.firstName || 'Admin'}
                      </p>
                      <p className="text-xs text-gray-500">{adminInfo?.email || 'admin@example.com'}</p>
                    </div>
                    <i className="ri-arrow-down-s-line text-gray-400"></i>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate('/admin/profile');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <i className="ri-user-line mr-3"></i>
                    Profile Settings
                  </button>
                     
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <i className="ri-logout-box-line mr-3"></i>
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {children || <Outlet />}
          </main>
        </div>

        {/* Enhanced Floating Notifications */}
        <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md">
          {floatingNotifications.map((notification, index) => {
            const getPriorityStyles = (priority: string, severity?: string) => {
              // Use severity for more granular styling
              if (severity === 'critical') {
                return {
                  bg: 'bg-gradient-to-r from-red-600 to-red-700',
                  border: 'border-red-800',
                  text: 'text-white',
                  shadow: 'shadow-2xl shadow-red-500/50',
                  glow: 'ring-2 ring-red-400 ring-opacity-75'
                };
              }
              if (severity === 'high') {
                return {
                  bg: 'bg-gradient-to-r from-orange-600 to-orange-700',
                  border: 'border-orange-800',
                  text: 'text-white',
                  shadow: 'shadow-2xl shadow-orange-500/50',
                  glow: 'ring-2 ring-orange-400 ring-opacity-75'
                };
              }
              
              switch (priority) {
                case 'critical':
                  return {
                    bg: 'bg-gradient-to-r from-red-600 to-red-700',
                    border: 'border-red-800',
                    text: 'text-white',
                    shadow: 'shadow-2xl shadow-red-500/50',
                    glow: 'ring-2 ring-red-400 ring-opacity-75'
                  };
                case 'high':
                  return {
                    bg: 'bg-gradient-to-r from-orange-600 to-orange-700',
                    border: 'border-orange-800',
                    text: 'text-white',
                    shadow: 'shadow-2xl shadow-orange-500/50',
                    glow: 'ring-2 ring-orange-400 ring-opacity-75'
                  };
                case 'medium':
                  return {
                    bg: 'bg-gradient-to-r from-blue-600 to-blue-700',
                    border: 'border-blue-800',
                    text: 'text-white',
                    shadow: 'shadow-xl shadow-blue-500/30',
                    glow: ''
                  };
                case 'low':
                  return {
                    bg: 'bg-gradient-to-r from-green-600 to-green-700',
                    border: 'border-green-800',
                    text: 'text-white',
                    shadow: 'shadow-lg shadow-green-500/30',
                    glow: ''
                  };
                default:
                  return {
                    bg: 'bg-gradient-to-r from-gray-600 to-gray-700',
                    border: 'border-gray-800',
                    text: 'text-white',
                    shadow: 'shadow-lg shadow-gray-500/30',
                    glow: ''
                  };
              }
            };

            const getIcon = (type: string, priority: string) => {
              const iconMap: Record<string, string> = {
                'welfare': 'ri-heart-pulse-line',
                'incident': 'ri-fire-line',
                'alert': 'ri-alarm-warning-line',
                'safety_protocol': 'ri-shield-check-line',
                'system': 'ri-settings-3-line',
                'team': 'ri-team-line',
                'staff': 'ri-user-star-line'
              };
              
              if (type && iconMap[type]) return iconMap[type];
              if (priority === 'critical') return 'ri-alarm-warning-line';
              if (priority === 'high') return 'ri-fire-line';
              return 'ri-notification-3-line';
            };

            const getTypeLabel = (type: string) => {
              const labels: Record<string, string> = {
                'incident': 'INCIDENT',
                'welfare': 'WELFARE',
                'alert': 'ALERT',
                'safety_protocol': 'SAFETY',
                'system': 'SYSTEM',
                'team': 'TEAM',
                'staff': 'STAFF'
              };
              return labels[type] || 'NOTIFICATION';
            };

            const styles = getPriorityStyles(notification.priority, notification.severity);
            const dismissTime = 
              (notification.priority === 'critical' || notification.priority === 'high') ? 10000 :
              notification.priority === 'medium' ? 7000 : 5000;

            const handleNotificationClick = () => {
              // Mark as read if notificationId exists
              if (notification.notificationId) {
                markAsRead(String(notification.notificationId));
              }
              
              // Navigate based on action URL or type
              if (notification.actionUrl) {
                navigate(notification.actionUrl);
              } else {
                switch (notification.type) {
                  case 'welfare':
                    navigate('/admin/welfare');
                    break;
                  case 'incident':
                    navigate('/admin/incidents/view');
                    break;
                  case 'alert':
                    navigate('/admin/alerts');
                    break;
                  case 'safety_protocol':
                    navigate('/admin/safety-protocols');
                    break;
                  default:
                    navigate('/admin/dashboard');
                }
              }
              
              removeFloatingNotification(notification.id);
              setShowNotifDropdown(false);
            };

            return (
              <div
                key={notification.id}
                className={`
                  ${styles.bg}
                  ${styles.border}
                  ${styles.text}
                  ${styles.shadow}
                  ${styles.glow}
                  max-w-sm w-full rounded-xl border-2 p-5 transform transition-all duration-500 ease-out
                  cursor-pointer hover:scale-[1.02] hover:shadow-2xl
                  animate-slide-in-right
                  ${notification.priority === 'critical' || notification.priority === 'high' ? 'animate-pulse' : ''}
                `}
                style={{
                  animation: `slideInRight 0.5s ease-out ${index * 100}ms both`,
                }}
                onClick={handleNotificationClick}
                onMouseEnter={(e) => {
                  // Pause auto-dismiss on hover
                  const card = e.currentTarget;
                  card.style.animationPlayState = 'paused';
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg bg-white bg-opacity-20 ${styles.shadow}`}>
                      <i className={`${getIcon(notification.type, notification.priority)} text-2xl`}></i>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider bg-white bg-opacity-30 px-2 py-1 rounded">
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider bg-white bg-opacity-20 px-2 py-1 rounded">
                          {notification.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notification.notificationId) {
                        markAsRead(String(notification.notificationId));
                      }
                      removeFloatingNotification(notification.id);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-full hover:bg-white hover:bg-opacity-30 transition-colors"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
                
                <div className="mb-3">
                  <h4 className="font-bold text-base mb-2 leading-tight">
                    {notification.title}
                  </h4>
                  <p className="text-sm opacity-95 leading-relaxed line-clamp-3">
                    {notification.message}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-xs opacity-90 mb-3">
                  <span className="flex items-center">
                    <i className="ri-time-line mr-1"></i>
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center font-semibold">
                    <i className="ri-arrow-right-line mr-1"></i>
                    View Details
                  </span>
                </div>
                
                {/* Enhanced Progress bar for auto-dismiss */}
                <div className="h-1.5 bg-white bg-opacity-20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white bg-opacity-70 rounded-full"
                    style={{
                      animation: `progressBar ${dismissTime}ms linear forwards`
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Add CSS animations */}
        <style>{`
          @keyframes slideInRight {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes progressBar {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
          
          .animate-slide-in-right {
            animation: slideInRight 0.5s ease-out both;
          }
        `}</style>
      </div>
    </AdminAuthGuard>
  );
};

export default AdminLayout;
