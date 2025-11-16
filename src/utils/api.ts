const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://soteros-backend-q2yihjhchq-et.a.run.app/api');

// Ensure we always use the full URL in production
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  
  // In production, always use the full URL
  return 'https://soteros-backend-q2yihjhchq-et.a.run.app/api';
};

const FINAL_API_BASE_URL = getApiBaseUrl();

// Debug: Log the API URL being used (suppressed)
// console.log('🔧 API Configuration:', {
//   mode: import.meta.env.MODE,
//   dev: import.meta.env.DEV,
//   viteApiUrl: import.meta.env.VITE_API_URL,
//   finalApiBaseUrl: FINAL_API_BASE_URL
// });

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    users: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
}

// Get auth token from localStorage with enhanced error handling
export const getAuthToken = (): string | null => {
  console.log('🔑 Getting auth token from storage...');
  
  // Check localStorage first
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      console.log('📦 userInfo found in localStorage:', { 
        hasToken: !!parsed.token, 
        tokenLength: parsed.token ? parsed.token.length : 0,
        userType: parsed.userType || parsed.role,
        id: parsed.id || parsed.user_id || parsed.staff_id || parsed.admin_id
      });
      if (parsed.token && typeof parsed.token === 'string' && parsed.token.length > 10) {
        console.log('✅ Token found in localStorage userInfo');
        return parsed.token;
      } else {
        console.warn('⚠️ userInfo exists but token is missing or invalid:', {
          hasToken: !!parsed.token,
          tokenType: typeof parsed.token,
          tokenLength: parsed.token ? parsed.token.length : 0
        });
        // Try to see if there are other token fields
        if (parsed.accessToken) {
          console.log('ℹ️ Found accessToken field, trying that...');
          if (typeof parsed.accessToken === 'string' && parsed.accessToken.length > 10) {
            return parsed.accessToken;
          }
        }
      }
    } catch (e) {
      console.error('❌ Error parsing userInfo from localStorage:', e);
    }
  } else {
    console.log('ℹ️ No userInfo found in localStorage');
  }
  
  // Check sessionStorage as fallback
  const sessionUserInfo = sessionStorage.getItem('userInfo');
  if (sessionUserInfo) {
    try {
      const parsed = JSON.parse(sessionUserInfo);
      console.log('📦 userInfo found in sessionStorage:', { 
        hasToken: !!parsed.token, 
        tokenLength: parsed.token ? parsed.token.length : 0,
        userType: parsed.userType || parsed.role 
      });
      if (parsed.token && typeof parsed.token === 'string' && parsed.token.length > 10) {
        console.log('✅ Token found in sessionStorage userInfo');
        return parsed.token;
      } else {
        console.warn('⚠️ sessionStorage userInfo exists but token is missing or invalid');
      }
    } catch (e) {
      console.error('❌ Error parsing userInfo from sessionStorage:', e);
    }
  } else {
    console.log('ℹ️ No userInfo found in sessionStorage');
  }
  
  // Fallback to check for admin token (legacy support)
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken && adminToken.length > 10) {
    console.log('Using legacy adminToken, length:', adminToken.length);
    return adminToken;
  } else if (adminToken) {
    console.warn('adminToken found but too short:', adminToken.length);
  } else {
    console.log('No adminToken found in localStorage');
  }
  
  // Check for staff token (legacy support)
  const staffToken = localStorage.getItem('staffToken');
  if (staffToken && staffToken.length > 10) {
    console.log('Using legacy staffToken, length:', staffToken.length);
    return staffToken;
  } else if (staffToken) {
    console.warn('staffToken found but too short:', staffToken.length);
  } else {
    console.log('No staffToken found in localStorage');
  }
  
  // Check for regular user token (legacy support)
  const userToken = localStorage.getItem('token') || localStorage.getItem('userToken');
  if (userToken && userToken.length > 10) {
    console.log('Using legacy userToken, length:', userToken.length);
    return userToken;
  } else if (userToken) {
    console.warn('userToken found but too short:', userToken.length);
  } else {
    console.log('No userToken found in localStorage');
  }
  
  // Also check sessionStorage for legacy tokens
  const sessionStaffToken = sessionStorage.getItem('staffToken');
  if (sessionStaffToken && sessionStaffToken.length > 10) {
    console.log('Using staffToken from sessionStorage, length:', sessionStaffToken.length);
    return sessionStaffToken;
  }
  
  const sessionToken = sessionStorage.getItem('token');
  if (sessionToken && sessionToken.length > 10) {
    console.log('Using token from sessionStorage, length:', sessionToken.length);
    return sessionToken;
  }
  
  console.warn('❌ No valid token found in any storage location');
  console.warn('📋 Debug info - checking all storage keys:');
  const allKeys = ['userInfo', 'staffToken', 'adminToken', 'token', 'userToken', 'staff', 'user', 'admin'];
  allKeys.forEach(key => {
    const local = localStorage.getItem(key);
    const session = sessionStorage.getItem(key);
    if (local) console.log(`  localStorage.${key}:`, local.substring(0, 50) + '...');
    if (session) console.log(`  sessionStorage.${key}:`, session.substring(0, 50) + '...');
  });
  return null;
};

// Clear authentication data on token errors
export const clearAuthDataOnError = (): void => {
  console.log('Clearing auth data due to token error');
  
  // Clear all authentication storage
  localStorage.removeItem('userInfo');
  sessionStorage.removeItem('userInfo');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('staffToken');
  sessionStorage.removeItem('staffToken');
  localStorage.removeItem('token');
  localStorage.removeItem('userToken');
  sessionStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('staff');
  localStorage.removeItem('admin');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('staff');
  sessionStorage.removeItem('admin');
  
  // Dispatch event to notify components
  window.dispatchEvent(new Event('authStateChanged'));
};

// Create headers with auth token
const createHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    // Always add the token and let the backend validate it
    // Don't try to guess expiration on frontend - backend will return proper error codes
    headers['Authorization'] = `Bearer ${token}`;
    console.log('Authorization header set with token (length:', token.length, ')');
  } else {
    console.warn('⚠️ No token found - request will be sent without Authorization header');
    console.warn('⚠️ This may cause 401 errors. User may need to log in again.');
  }
  
  return headers;
};

// Form-data request helper (no default JSON content-type)
export const apiFormRequest = async <T = any>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${FINAL_API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const config: RequestInit = { method: 'POST', body: formData, headers, ...options };
  
  console.log(`API Form Request: POST ${url}`);
  
  try {
    const response = await fetch(url, config);
    
    // Handle 401 Unauthorized and 403 Forbidden responses (token issues)
    if (response.status === 401 || (response.status === 403 && !endpoint.includes('/routing/'))) {
      console.warn(`Authentication error (${response.status}) for ${endpoint}`);
      
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Authentication failed' };
      }

      clearAuthDataOnError();
      throw new Error(errorData.message || 'Authentication failed. Please log in again.');
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData;

      try {
        errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        errorMessage = response.statusText || errorMessage;
      }

      console.error(`API Form Error for ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url
      });

      throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    console.log(`API Form Success for ${endpoint}:`, responseData.success !== undefined ? responseData.success : 'No success field');
    return responseData;
  } catch (error) {
    console.error(`API form request failed for ${endpoint}:`, error);

    if (error instanceof Error) {
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        throw new Error(`Authentication error: ${error.message}`);
      }
      throw error;
    }

    throw new Error(`Unknown error occurred: ${String(error)}`);
  }
};

// Generic API request function with enhanced error handling
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${FINAL_API_BASE_URL}${endpoint}`;
  const headers = createHeaders();
  
  const config: RequestInit = {
    headers,
    ...options,
  };
  
  // Suppress API request log for login endpoints to avoid cluttering console
  if (!endpoint.includes('/auth/login/')) {
    console.log(`API Request: ${config.method || 'GET'} ${url}`);
    console.log('Environment:', import.meta.env.MODE);
    console.log('API Base URL:', FINAL_API_BASE_URL);
  }
  
  try {
    const response = await fetch(url, config);
    
    
    // Handle 401 Unauthorized and 403 Forbidden responses (token issues)
    // Don't treat 403 as auth error for routing endpoints since they may return 403 from external APIs
    // Don't clear auth data for login endpoints since user is trying to log in
    if (response.status === 401 || (response.status === 403 && !endpoint.includes('/routing/'))) {
      // Only log warning if NOT a login endpoint
      if (!endpoint.includes('/auth/login/')) {
        console.warn(`Authentication error (${response.status}) for ${endpoint}`);
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Authentication failed' };
      }

      // Only clear auth data if NOT a login endpoint
      if (!endpoint.includes('/auth/login/')) {
        // Check if token exists before clearing - if no token, we've already cleared
        const hadToken = !!getAuthToken();
        if (hadToken) {
          console.warn('🔄 Token was present but invalid - clearing auth data');
          clearAuthDataOnError();
        } else {
          console.warn('⚠️ No token found and got 401 - auth data may have been already cleared');
        }
        // Throw specific error for authentication issues
        throw new Error(errorData.message || 'Authentication failed. Please log in again.');
      }
    }
    
    if (!response.ok) {
      // Special handling for login endpoints - return error data instead of throwing
      if (endpoint.includes('/auth/login/') && (response.status === 401 || response.status === 403)) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { success: false, message: 'Authentication failed' };
        }
        // Suppress console log for login failures to avoid cluttering console
        return errorData;
      }

      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorData;

      try {
        errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (parseError) {
        // If JSON parsing fails, use the status text
        errorMessage = response.statusText || errorMessage;
        
      }

      // Log detailed error information
      console.error(`API Error for ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url
      });

      // Create error with full error data attached for detailed error handling
      const error = new Error(errorMessage);
      (error as any).responseData = errorData;
      (error as any).status = response.status;
      throw error;
    }
    
    const responseData = await response.json();
    // Suppress API success log for login endpoints to avoid cluttering console
    if (!endpoint.includes('/auth/login/')) {
      console.log(`API Success for ${endpoint}:`, responseData.success !== undefined ? responseData.success : 'No success field');
    }
    return responseData;
  } catch (error) {
    // Suppress API error log for login endpoints to avoid cluttering console
    if (!endpoint.includes('/auth/login/')) {
      console.error(`API request failed for ${endpoint}:`, error);
    }

    // Re-throw the error with additional context
    if (error instanceof Error) {
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        throw new Error(`Authentication error: ${error.message}`);
      }
      throw error;
    }

    throw new Error(`Unknown error occurred: ${String(error)}`);
  }
};

// Admin Authentication API
export const adminAuthApi = {
  register: async (name: string, email: string, password: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      admin: {
        id: number;
        name: string;
        email: string;
        role: string;
        status: string;
      };
    }>('/admin/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  login: async (email: string, password: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      token: string;
      admin: {
        id: number;
        name: string;
        email: string;
        role: string;
        status: string;
      };
    }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return apiRequest('/admin/auth/logout', {
      method: 'POST',
    });
  },

  getProfile: async () => {
    return apiRequest('/admin/auth/profile');
  },

  updateProfile: async (profileData: { name: string; email: string }) => {
    return apiRequest('/admin/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/admin/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  uploadProfilePicture: async (file: File) => {
    const form = new FormData();
    form.append('profilePicture', file);
    return apiFormRequest<{
      success: boolean;
      message: string;
      admin: {
        id: number;
        name: string;
        email: string;
        role: string;
        status: string;
        profile_picture?: string;
      };
      profilePicture: string;
    }>('/admin/auth/upload-picture', form);
  },

  deleteProfilePicture: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      admin: {
        id: number;
        name: string;
        email: string;
        role: string;
        status: string;
        profile_picture?: string;
      };
    }>('/admin/auth/delete-picture', {
      method: 'DELETE',
    });
  },
};

// User Authentication API
export const userAuthApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      token: string;
      user: any;
    }>('/auth/login/user', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return apiRequest('/auth/logout/user', {
      method: 'POST',
    });
  },
};

// Staff Authentication API
export const staffAuthApi = {
  login: async (email: string, password: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
      token: string;
      staff: any;
    }>('/auth/login/staff', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    return apiRequest('/auth/logout/staff', {
      method: 'POST',
    });
  },
};

// Admin Dashboard API
export const adminDashboardApi = {
  getStats: async () => {
    return apiRequest<{
      success: boolean;
      stats: {
        users: {
          total_users: number;
          active_users: number;
          new_users_month: number;
        };
        staff: {
          total_staff: number;
          active_staff: number;
        };
        incidents: {
          total_incidents: number;
          active_incidents: number;
          high_priority_incidents: number;
          incidents_this_week: number;
        };
        alerts: {
          total_alerts: number;
          active_alerts: number;
          alerts_this_week: number;
        };
      };
      recentActivity: Array<{
        action: string;
        details: string;
        created_at: string;
        user_type: string;
        user_id: number;
      }>;
      trends: {
        incidents: Array<{ date: string; count: number }>;
        users: Array<{ date: string; count: number }>;
      };
    }>('/admin/dashboard/stats');
  },
  
  getOverview: async () => {
    return apiRequest<{
      success: boolean;
      overview: {
        userTypeDistribution: Array<{ user_type: string; user_count: number }>;
        incidentTypes: Array<{ incident_type: string; count: number }>;
        alertTypes: Array<{ alert_type: string; count: number }>;
        evacuationCenters: {
          total_centers: number;
          open_centers: number;
          full_centers: number;
          total_capacity: number;
          total_occupancy: number;
        };
      };
    }>('/admin/dashboard/overview');
  },

  getAnalytics: async () => {
    return apiRequest<{
      success: boolean;
      analytics: {
        incidentTrends30Days: Array<{ date: string; count: number }>;
        userTrends90Days: Array<{ date: string; count: number }>;
        incidentStatus: Array<{ status: string; count: number }>;
        incidentPriority: Array<{ priority: string; count: number }>;
        evacuationOccupancy: Array<{
          name: string;
          capacity: number;
          current_occupancy: number;
          occupancy_rate: number
        }>;
        monthlyIncidents: Array<{
          month: string;
          total_incidents: number;
          resolved_incidents: number;
          high_priority_incidents: number
        }>;
        peakHours: Array<{
          hour: number;
          incident_count: number;
        }>;
      };
    }>('/admin/dashboard/analytics');
  },

  getLocationIncidents: async () => {
    return apiRequest<{
      success: boolean;
      locationIncidents: Array<{
        name: string;
        [key: string]: string | number;
      }>;
      note?: string;
    }>('/admin/dashboard/location-incidents');
  },

  getSeasonalPatterns: async () => {
    return apiRequest<{
      success: boolean;
      seasonalData: Array<{
        period: string;
        floods?: number;
        fires?: number;
        accidents?: number;
        otherIncidents?: number;
        allIncidents?: number;
        total: number;
      }>;
      analysis: {
        rainySeason: { floods: number; otherIncidents: number; total: number };
        summerSeason: { fires: number; otherIncidents: number; total: number };
        holidayPeriods: { accidents: number; otherIncidents: number; total: number };
        regularPeriods: { allIncidents: number; total: number };
      };
      note?: string;
      totalIncidentsAnalyzed: number;
    }>('/admin/dashboard/seasonal-patterns');
  },

  getMonthlyTrends: async (period: 'days' | 'weeks' | 'months' = 'months', limit: number = 12) => {
    return apiRequest<{
      success: boolean;
      trendsData: Array<{
        period: string;
        total_incidents: number;
        resolved_incidents: number;
        high_priority_incidents: number;
      }>;
      period: string;
      limit: number;
      note?: string;
    }>(`/admin/dashboard/monthly-trends?period=${period}&limit=${limit}`);
  },

  getResponseTimeByType: async () => {
    return apiRequest<{
      success: boolean;
      responseTimeData: Array<{
        incident_type: string;
        incident_count: number;
        avg_response_time_minutes: number;
        min_response_time_minutes: number;
        max_response_time_minutes: number;
        avg_resolution_time_minutes: number | null;
        avg_response_time_hours: string;
        avg_response_time_days: number;
        display_value: number;
        display_unit: 'hours' | 'days';
      }>;
      note?: string;
      totalIncidents: number;
    }>('/admin/dashboard/response-time-by-type');
  },

  getResponseTimeIndividual: async (limit: number = 100) => {
    return apiRequest<{
      success: boolean;
      incidents: Array<{
        incident_id: number;
        incident_type: string;
        date_reported: string;
        updated_at: string;
        status: string;
        response_time_minutes: number;
        response_time_hours: number;
        response_time_days: number;
        display_value: number;
        display_unit: 'hours' | 'days';
      }>;
      total: number;
      note?: string;
    }>(`/admin/dashboard/response-time-individual?limit=${limit}`);
  },
};

// User Management API
export const userManagementApi = {
  getUsers: async (params: PaginationParams = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    return apiRequest<PaginatedResponse<any>>(`/users?${queryString}`);
  },
  
  getUserById: async (id: number) => {
    return apiRequest(`/users/${id}`);
  },
  
  updateUser: async (id: number, userData: any) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  updateUserStatus: async (id: number, status: number, created_by?: number) => {
    const body: any = { status };
    if (created_by !== undefined) body.created_by = created_by;
    return apiRequest(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  
  deleteUser: async (id: number) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  
  getUserStats: async () => {
    return apiRequest('/users/stats');
  },
};

// Staff Management API
export const staffManagementApi = {
  getStaff: async (params: PaginationParams = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    return apiRequest<PaginatedResponse<any>>(`/staff?${queryString}`);
  },
  
  createStaff: async (staffData: any) => {
    return apiRequest('/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  },
  
  getStaffById: async (id: number) => {
    return apiRequest(`/staff/${id}`);
  },
  
  updateStaff: async (id: number, staffData: any) => {
    return apiRequest(`/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(staffData),
    });
  },

  updateStaffAvailability: async (id: number, availability: 'available' | 'busy' | 'off-duty') => {
    return apiRequest(`/staff/${id}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ availability }),
    });
  },
  
  updateStaffStatus: async (id: number, status: number) => {
    return apiRequest(`/staff/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
  
  deleteStaff: async (id: number) => {
    return apiRequest(`/staff/${id}`, {
      method: 'DELETE',
    });
  },
  
  getStaffStats: async () => {
    return apiRequest('/staff/stats');
  },

  uploadProfilePicture: async (staffId: number, file: File) => {
    const form = new FormData();
    form.append('profilePicture', file);
    return apiFormRequest<{
      success: boolean;
      message: string;
      staff: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        position?: string;
        department?: string;
        status: number;
        availability: string;
        profile_picture?: string;
      };
      profilePicture: string;
    }>(`/staff/${staffId}/upload-picture`, form);
  },

  deleteProfilePicture: async (staffId: number) => {
    return apiRequest<{
      success: boolean;
      message: string;
      staff: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        position?: string;
        department?: string;
        status: number;
        availability: string;
        profile_picture?: string;
      };
    }>(`/staff/${staffId}/delete-picture`, {
      method: 'DELETE',
    });
  },
};

// Activity Logs API
export const activityLogsApi = {
  getLogs: async (params: PaginationParams = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    return apiRequest<{
      success: boolean;
      logs: any[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalLogs: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
      message?: string;
    }>(`/activity-logs?${queryString}`);
  },
  
  getLogStats: async () => {
    return apiRequest<{
      success: boolean;
      stats: {
        userTypeDistribution: Array<{ user_type: string; count: number }>;
        topActions: Array<{ action: string; count: number }>;
        dailyActivity: Array<{ date: string; count: number }>;
        recentHighImpact: any[];
      };
    }>('/activity-logs/stats');
  },
  
  logActivity: async (activityData: any) => {
    return apiRequest('/activity-logs/log', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
  },
  
  cleanupLogs: async (days: number = 90) => {
    return apiRequest(`/activity-logs/cleanup?days=${days}`, {
      method: 'DELETE',
    });
  },
};

// Alerts API
export const alertsApi = {
  getAlerts: async () => {
    return apiRequest('/alerts');
  },
  
  createAlert: async (alertData: any) => {
    return apiRequest('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  },
  
  updateAlert: async (id: number, alertData: any) => {
    return apiRequest(`/alerts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(alertData),
    });
  },
  
  sendAlert: async (id: number) => {
    return apiRequest(`/alerts/${id}/send`, {
      method: 'POST',
    });
  },
  
  deleteAlert: async (id: number) => {
    return apiRequest(`/alerts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Evacuation Routes API
export const evacuationRoutesApi = {
  getRoutes: async (centerId?: number) => {
    const endpoint = centerId ? `/evacuation-routes?center_id=${centerId}` : '/evacuation-routes';
    return apiRequest(endpoint);
  },
  
  createRoute: async (routeData: any) => {
    return apiRequest('/evacuation-routes', {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
  },
  
  updateRoute: async (id: number, routeData: any) => {
    return apiRequest(`/evacuation-routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(routeData),
    });
  },
  
  deleteRoute: async (id: number) => {
    return apiRequest(`/evacuation-routes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Evacuation Centers & Resources API
export const evacuationCentersApi = {
  getCenters: async () => {
    return apiRequest('/evacuation-centers');
  },
  createCenter: async (center: { name: string; latitude: number; longitude: number; capacity: number; current_occupancy?: number; status?: 'open'|'full'|'closed'; contact_person?: string|null; contact_number?: string|null }) => {
    return apiRequest<{ success: boolean; data: any }>(`/evacuation-centers`, {
      method: 'POST',
      body: JSON.stringify(center),
    });
  },
  updateCenter: async (centerId: number, updates: Partial<{ name: string; latitude: number; longitude: number; capacity: number; current_occupancy: number; status: 'open'|'full'|'closed'; contact_person: string|null; contact_number: string|null }>) => {
    return apiRequest<{ success: boolean; data: any }>(`/evacuation-centers/${centerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  deleteCenter: async (centerId: number) => {
    return apiRequest<{ success: boolean }>(`/evacuation-centers/${centerId}`, { method: 'DELETE' });
  },
  getResources: async (centerId: number) => {
    return apiRequest<{ success: boolean; data: any[] }>(`/evacuation-centers/${centerId}/resources`);
  },
  createResource: async (
    centerId: number,
    resource: { type: 'facility' | 'feature' | 'water' | 'supply'; name: string; quantity?: number; picture?: string | null }
  ) => {
    return apiRequest<{ success: boolean; data: any }>(`/evacuation-centers/${centerId}/resources`, {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  },
  updateResource: async (
    centerId: number,
    resourceId: number,
    updates: Partial<{ type: 'facility' | 'feature' | 'water' | 'supply'; name: string; quantity: number; picture: string | null }>
  ) => {
    return apiRequest<{ success: boolean; data: any }>(`/evacuation-centers/${centerId}/resources/${resourceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  deleteResource: async (centerId: number, resourceId: number) => {
    return apiRequest<{ success: boolean }>(`/evacuation-centers/${centerId}/resources/${resourceId}`, {
      method: 'DELETE',
    });
  },
  uploadResourcePicture: async (centerId: number, resourceId: number, file: File) => {
    const form = new FormData();
    form.append('picture', file);
    return apiFormRequest<{ success: boolean; data: any }>(`/evacuation-centers/${centerId}/resources/${resourceId}/picture`, form);
  }
};

// Teams API
export const teamsApi = {
  getTeams: async () => {
    return apiRequest<{ success: boolean; teams: any[] }>(`/teams`);
  },
  getTeamById: async (id: number) => {
    return apiRequest<{ success: boolean; team: any }>(`/teams/${id}`);
  },
  getTeamStaff: async (teamId: number) => {
    return apiRequest<{ success: boolean; staff: any[] }>(`/teams/${teamId}/staff`);
  },
  assignStaffToTeam: async (teamId: number, staffId: number, role: string = 'member') => {
    return apiRequest<{ success: boolean; message: string }>(`/teams/${teamId}/staff/${staffId}`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
  removeStaffFromTeam: async (teamId: number, staffId: number) => {
    return apiRequest<{ success: boolean; message: string }>(`/teams/${teamId}/staff/${staffId}`, {
      method: 'DELETE',
    });
  },
};

// Incidents API
export const incidentsApi = {
  getIncidents: async () => {
    return apiRequest<{ success: boolean; incidents: any[] }>(`/incidents`);
  },
  getStaffIncidents: async (staffId: number) => {
    return apiRequest<{ 
      success: boolean; 
      incidents: any[]; 
      staffInfo: any; 
      assignmentStats: any 
    }>(`/incidents/staff/${staffId}`);
  },
  getIncidentById: async (id: number) => {
    return apiRequest<{ success: boolean; incident: any }>(`/incidents/${id}`);
  },
  validateIncident: async (
    id: number,
    payload: { validationStatus: 'validated' | 'rejected'; validationNotes?: string; assignedTo?: number | null }
  ) => {
    return apiRequest<{ success: boolean; message: string }>(`/incidents/${id}/validate`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  assignTeamToIncident: async (incidentId: number, teamId: number | null) => {
    return apiRequest<{ success: boolean; message: string; emailSent?: boolean; emailDetails?: any }>(`/incidents/${incidentId}/assign-team`, {
      method: 'PUT',
      body: JSON.stringify({ teamId }),
    });
  },
  assignTeamsToIncident: async (incidentId: number, teamIds: number[]) => {
    return apiRequest<{ 
      success: boolean; 
      message: string; 
      emailSent?: boolean; 
      emailDetails?: {
        totalTeams: number;
        totalEmailsSent: number;
        totalEmailsFailed: number;
        teamDetails: Array<{
          teamName: string;
          totalMembers: number;
          emailsSent: number;
          emailsFailed: number;
          failedEmails?: string[];
          error?: string;
        }>;
      }
    }>(`/incidents/${incidentId}/assign-teams`, {
      method: 'PUT',
      body: JSON.stringify({ teamIds }),
    });
  },
  assignStaffToIncident: async (incidentId: number, staffId: number | null) => {
    return apiRequest<{ success: boolean; message: string; emailSent?: boolean; emailDetails?: any }>(`/incidents/${incidentId}/assign-staff`, {
      method: 'PUT',
      body: JSON.stringify({ staffId }),
    });
  },
  updateIncidentStatus: async (incidentId: number, payload: { status: string; notes?: string }) => {
    console.log('📤 Updating incident status:', { incidentId, payload });
    return apiRequest<{ success: boolean; message: string }>(`/incidents/${incidentId}/update-status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: payload.status,
        notes: payload.notes || '' // Ensure notes is always sent, even if empty string
      }),
    });
  },
};

// Profile API
export const profileApi = {
  // Get current user profile
  getProfile: async () => {
    return apiRequest<{
      success: boolean;
      user: {
        userId: number;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        department?: string;
        position?: string;
        employeeId?: string;
        profile_picture?: string;
        createdAt: string;
        updatedAt: string;
      };
    }>('/profile/me');
  },

  // Update user profile
  updateProfile: async (profileData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      user: {
        userId: number;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        profile_picture?: string;
        createdAt: string;
        updatedAt: string;
      };
    }>('/profile/update', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Change user password
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Upload profile picture
  uploadProfilePicture: async (file: File) => {
    const form = new FormData();
    form.append('profilePicture', file);
    return apiFormRequest<{
      success: boolean;
      message: string;
      user: {
        userId: number;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        profile_picture?: string;
        createdAt: string;
        updatedAt: string;
      };
      profilePicture: string;
    }>('/profile/upload-picture', form);
  },

  // Delete profile picture
  deleteProfilePicture: async () => {
    return apiRequest<{
      success: boolean;
      message: string;
      user: {
        userId: number;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        profile_picture?: string;
        createdAt: string;
        updatedAt: string;
      };
    }>('/profile/delete-picture', {
      method: 'DELETE',
    });
  },
};

// Feedback API
export const feedbackApi = {
  // Submit feedback
  submitFeedback: async (data: { message: string; rating?: number | null }) => {
    return apiRequest<{
      success: boolean;
      message: string;
      feedbackId: number;
    }>('/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get feedback (admin/staff only)
  getFeedback: async (params: PaginationParams = {}) => {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    return apiRequest<{
      success: boolean;
      feedback: Array<{
        id: number;
        message: string;
        rating: number | null;
        created_at: string;
        updated_at: string;
        user_info: {
          id: number;
          name: string;
          email: string;
          type: 'user' | 'staff' | 'admin';
        };
      }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
    }>(`/feedback?${queryString}`);
  },

  // Update feedback status (admin/staff only)
  updateFeedbackStatus: async (id: number, status: 'pending' | 'reviewed' | 'resolved') => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>(`/feedback/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};

// Public API (no authentication required)
export const publicApi = {
  getHomeStats: async () => {
    return apiRequest<{
      success: boolean;
      stats: {
        users: {
          total: number;
        };
        staff: {
          total: number;
        };
        admins: {
          total: number;
        };
        incidents: {
          total: number;
          active: number;
          resolved: number;
        };
        evacuation_centers: {
          total: number;
        };
        alerts: {
          active: number;
        };
      };
      last_updated: string;
    }>('/public/stats');
  },

  getTestimonials: async (limit?: number) => {
    const queryString = limit ? `?limit=${limit}` : '';
    return apiRequest<{
      success: boolean;
      testimonials: Array<{
        id: number;
        quote: string;
        rating: number;
        name: string;
        type: string;
        created_at: string;
      }>;
    }>(`/public/testimonials${queryString}`);
  },
};

// Safety Protocols API
export const safetyProtocolsApi = {
  getProtocols: async () => {
    return apiRequest<any[]>(`/safety-protocols/public`);
  },
  uploadAttachment: async (file: File) => {
    const form = new FormData();
    form.append('attachment', file);
    console.log('📤 Uploading file to Cloudinary:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    const response = await apiFormRequest<{ success: boolean; filename: string; path: string; url: string }>(`/safety-protocols/upload`, form);
    console.log('✅ Upload response:', response);
    return response;
  },
  createProtocol: async (payload: { title: string; description: string; type: 'fire'|'earthquake'|'medical'|'intrusion'|'general'; file_attachment?: string|null; created_by?: number|null }) => {
    return apiRequest<{ success: boolean; data: any }>(`/safety-protocols`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateProtocol: async (protocolId: number, payload: Partial<{ title: string; description: string; type: 'fire'|'earthquake'|'medical'|'intrusion'|'general'; file_attachment: string|null; created_by: number|null }>) => {
    return apiRequest<{ success: boolean; data: any }>(`/safety-protocols/${protocolId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteProtocol: async (protocolId: number) => {
    return apiRequest<{ success: boolean }>(`/safety-protocols/${protocolId}`, { method: 'DELETE' });
  },
};

// Staff Dashboard API
export const staffDashboardApi = {
  getStats: async () => {
    return apiRequest<{
      success: boolean;
      stats: {
        totalIncidents: number;
        pendingIncidents: number;
        inProgressIncidents: number;
        resolvedIncidents: number;
        criticalIncidents: number;
        highPriorityIncidents: number;
      };
    }>('/staff/dashboard/stats');
  },
};

// Routing API proxy through backend
export const routingApi = {
  // Get driving directions between coordinates with OpenRouteService
  getDirections: async (
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][],
    options?: {
      avoidAreas?: Array<Array<[number, number]>>; // Polygons to avoid
      avoidFeatures?: string[]; // Features to avoid (e.g., 'highways', 'tollways')
      profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
      instructions?: boolean;
      format?: 'geojson' | 'json';
    }
  ) => {
    // Build coordinates array: [start, ...waypoints, end]
    const coordinates: [number, number][] = [start];
    if (waypoints && waypoints.length > 0) {
      coordinates.push(...waypoints);
    }
    coordinates.push(end);

    return apiRequest('/routing/directions', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: coordinates,
        profile: options?.profile || 'driving-car',
        instructions: options?.instructions !== false,
        format: options?.format || 'geojson',
        avoidAreas: options?.avoidAreas,
        avoidFeatures: options?.avoidFeatures
      })
    });
  },

  // Get route summary information
  getRouteSummary: async (
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][],
    options?: {
      avoidAreas?: Array<Array<[number, number]>>;
      avoidFeatures?: string[];
      profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
    }
  ) => {
    return apiRequest('/routing/route-summary', {
      method: 'POST',
      body: JSON.stringify({
        start: start,
        end: end,
        waypoints: waypoints || [],
        avoidAreas: options?.avoidAreas,
        avoidFeatures: options?.avoidFeatures,
        profile: options?.profile || 'driving-car'
      })
    });
  },

  // Get alternative routes with automatic rerouting for road closures
  getAlternativeRoutes: async (
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][],
    options?: {
      avoidAreas?: Array<Array<[number, number]>>;
      avoidFeatures?: string[];
      profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
      alternatives?: number; // Number of alternative routes to return
      continueStraight?: boolean;
    }
  ) => {
    const coordinates: [number, number][] = [start];
    if (waypoints && waypoints.length > 0) {
      coordinates.push(...waypoints);
    }
    coordinates.push(end);

    return apiRequest('/routing/alternatives', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: coordinates,
        profile: options?.profile || 'driving-car',
        alternatives: options?.alternatives || 3,
        continueStraight: options?.continueStraight || false,
        avoidAreas: options?.avoidAreas,
        avoidFeatures: options?.avoidFeatures,
        instructions: true,
        format: 'geojson'
      })
    });
  },

  // Check for road closures and get updated routes
  checkRoadClosures: async (
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][]
  ) => {
    const coordinates: [number, number][] = [start];
    if (waypoints && waypoints.length > 0) {
      coordinates.push(...waypoints);
    }
    coordinates.push(end);

    return apiRequest('/routing/check-closures', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: coordinates
      })
    });
  },

  // Get optimized route with traffic and road condition data
  getOptimizedRoute: async (
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][],
    options?: {
      avoidAreas?: Array<Array<[number, number]>>;
      avoidFeatures?: string[];
      profile?: 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'foot-walking';
      optimize?: 'fastest' | 'shortest' | 'recommended';
      traffic?: boolean;
    }
  ) => {
    const coordinates: [number, number][] = [start];
    if (waypoints && waypoints.length > 0) {
      coordinates.push(...waypoints);
    }
    coordinates.push(end);

    return apiRequest('/routing/optimized', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: coordinates,
        profile: options?.profile || 'driving-car',
        optimize: options?.optimize || 'recommended',
        traffic: options?.traffic || true,
        avoidAreas: options?.avoidAreas,
        avoidFeatures: options?.avoidFeatures,
        instructions: true,
        format: 'geojson'
      })
    });
  }
};

// Admin Notifications API
export const adminNotificationsApi = {
  getNotifications: async (params?: { 
    page?: number; 
    limit?: number; 
    unread_only?: boolean; 
    type?: string; 
    severity?: string 
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.unread_only) queryParams.append('unread_only', 'true');
    if (params?.type) queryParams.append('type', params.type);
    if (params?.severity) queryParams.append('severity', params.severity);
    
    const queryString = queryParams.toString();
    return apiRequest(`/admin/notifications${queryString ? '?' + queryString : ''}`);
  },
  
  getUnreadCount: async () => 
    apiRequest('/admin/notifications/unread-count'),
  
  getPriorityCount: async () => 
    apiRequest('/admin/notifications/priority-count'),
  
  markAsRead: async (id: number) => 
    apiRequest(`/admin/notifications/${id}/read`, { method: 'PUT' }),
  
  markAllAsRead: async () => 
    apiRequest('/admin/notifications/read-all', { method: 'PUT' }),
  
  deleteNotification: async (id: number) => 
    apiRequest(`/admin/notifications/${id}`, { method: 'DELETE' }),
  
  createTestNotification: async (data: { type?: string; title?: string; message?: string }) =>
    apiRequest('/admin/notifications/test', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    })
};

export default {
  adminAuthApi,
  userAuthApi,
  staffAuthApi,
  adminDashboardApi,
  userManagementApi,
  staffManagementApi,
  activityLogsApi,
  alertsApi,
  evacuationRoutesApi,
  evacuationCentersApi,
  teamsApi,
  incidentsApi,
  safetyProtocolsApi,
  profileApi,
  feedbackApi,
  routingApi,
  adminNotificationsApi,
};
