// Interfaces for alerts
export interface Alert {
  id: number;
  alert_type: string;
  alert_severity: 'emergency' | 'warning' | 'info';
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  status: 'active' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface CreateAlertData {
  title: string;
  description: string;
  alert_type: string;
  alert_severity: 'emergency' | 'warning' | 'info';
  latitude: number;
  longitude: number;
  radius_km: number;
}

export interface UpdateAlertData {
  title?: string;
  description?: string;
  alert_type?: string;
  alert_severity?: 'emergency' | 'warning' | 'info';
  status?: 'active' | 'resolved';
}

// API functions for alerts
export const alertsApi = {
  getAlerts: async () => {
    return apiRequest<{ success: boolean; alerts: Alert[] }>('/alerts');
  },
  
  createAlert: async (alertData: CreateAlertData) => {
    return apiRequest<{ success: boolean; alertId: number }>('/alerts', {
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
    return apiRequest<{ success: boolean }>(`/alerts/${id}/send`, {
      method: 'POST',
    });
  },
  
  deleteAlert: async (id: number) => {
    return apiRequest<{ success: boolean }>(`/alerts/${id}`, {
      method: 'DELETE',
    });
  },
  
  getAlertLogs: async (alertId: number) => {
    return apiRequest<{ success: boolean; logs: any[] }>(`/alerts/${alertId}/logs`);
  },
};
