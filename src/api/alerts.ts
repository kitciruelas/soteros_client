import { apiRequest } from '../utils/api';

export type AlertType = 'weather' | 'earthquake' | 'flood' | 'fire' | 'other';
export type AlertSeverity = 'emergency' | 'warning' | 'info';
export type AlertStatus = 'active' | 'resolved';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';
export type AlertRecipient = 
  | 'all_users' 
  | 'all_students'
  | 'all_faculty'
  | 'all_employees'
  | 'emergency_responders'
  | 'all_staff'
  | 'all_admins'
  | `department_${string}`
  | string; // for direct email addresses

// Interfaces for alerts
export interface Alert {
  id: number;
  alert_type: AlertType;
  alert_severity: AlertSeverity;
  title: string;
  description: string;
  message?: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  status: AlertStatus;
  priority?: AlertPriority;
  recipients?: AlertRecipient[];
  location_text?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertData {
  title: string;
  message: string;
  type: AlertType;
  priority?: AlertPriority;
  recipients?: AlertRecipient[];
  send_immediately?: boolean;
  // Geographic fields
  latitude?: number | null;
  longitude?: number | null;
  radius_km?: number;
  location_text?: string;
}

export interface UpdateAlertData {
  title?: string;
  message?: string;
  type?: AlertType;
  recipients?: AlertRecipient[];
  priority?: AlertPriority;
  status?: AlertStatus;
}

// API functions for alerts
export const alertsApi = {
  getAlerts: async () => {
    return apiRequest<{ success: boolean; alerts: Alert[] }>('/alerts');
  },
  
  getAlert: async (id: number) => {
    return apiRequest<{ success: boolean; alert: Alert }>(`/alerts/${id}`);
  },
  
  createAlert: async (alertData: CreateAlertData) => {
    return apiRequest<{ 
      success: boolean; 
      alertId: number;
      sent: boolean;
      geographic: boolean;
      location: string | null;
    }>('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  },
  
  updateAlert: async (id: number, alertData: UpdateAlertData) => {
    return apiRequest<{ success: boolean }>(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(alertData),
    });
  },
  
  sendAlert: async (id: number) => {
    return apiRequest<{ success: boolean; message: string }>(`/alerts/${id}/send`, {
      method: 'POST',
    });
  },
  
  deleteAlert: async (id: number) => {
    return apiRequest<{ success: boolean; message: string }>(`/alerts/${id}`, {
      method: 'DELETE',
    });
  },
  
  getAlertLogs: async (alertId: number) => {
    return apiRequest<{ success: boolean; logs: { 
      id: number;
      alert_id: number;
      action: string;
      recipients_count: number;
      created_at: string;
    }[] }>(`/alerts/${alertId}/logs`);
  },
};
