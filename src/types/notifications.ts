// Import apiRequest from utils
import { apiRequest } from '../utils/api';

// Notification types
export interface Notification {
  id: number;
  type: 'alert' | 'safety_protocol' | 'welfare' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'emergency';
  is_read: boolean;
  created_at: string;
  user_id?: number;
  related_id?: number;
  data?: {
    alertId?: number;
    protocolId?: number;
    welfareReportId?: number;
    [key: string]: any;
  };
}

export interface NotificationSettings {
  enableAlerts: boolean;
  enableSafetyProtocols: boolean;
  enableWelfare: boolean;
  enableSystem: boolean;
}

// API functions for notifications
export const notificationsApi = {
  getNotifications: async (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const queryString = params.toString();
    return apiRequest<{ 
      success: boolean; 
      notifications: Notification[];
      total: number;
      unreadCount: number;
    }>(`/notifications${queryString ? `?${queryString}` : ''}`);
  },
  
  markAsRead: async (notificationId: number) => {
    return apiRequest<{ success: boolean }>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },
  
  markAllAsRead: async () => {
    return apiRequest<{ success: boolean }>('/notifications/read-all', {
      method: 'PUT',
    });
  },
  
  deleteNotification: async (notificationId: number) => {
    return apiRequest<{ success: boolean }>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
  
  getSettings: async () => {
    return apiRequest<{ success: boolean; settings: NotificationSettings }>('/notifications/settings');
  },
  
  updateSettings: async (settings: Partial<NotificationSettings>) => {
    return apiRequest<{ success: boolean }>('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};
