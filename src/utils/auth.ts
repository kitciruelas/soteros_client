export interface UserData {
  id?: string;
  user_id?: number;
  admin_id?: number;
  staff_id?: number;
  // CamelCase fields (preferred)
  firstName?: string;
  lastName?: string;
  name?: string; // For staff users
  // Snake_case fields (for backward compatibility with database)
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  userType?: 'user' | 'admin' | 'staff';
  role?: string; // Admin role field
  // Authentication token
  token?: string;
  // Additional database fields
  user_type?: string;
  profile_picture?: string;
  college?: string;
  created_at?: string;
  updated_at?: string;
  status?: number | string; // Can be number or string
  // Team assignment fields
  assigned_team_id?: number;
  // Staff-specific fields
  position?: string;
  department?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  userData: UserData | null;
  userType: 'user' | 'admin' | 'staff' | null;
}

/**
 * Get the current authentication state by checking all possible storage keys
 * Only returns authenticated if valid user data AND token are present
 */
export function getAuthState(): AuthState {
  // Check for user data in localStorage first, then sessionStorage
  const checkStorage = (storage: Storage): AuthState | null => {
    // Check for new unified userInfo key first
    const userInfo = storage.getItem('userInfo');
    if (userInfo) {
      try {
        const userData = JSON.parse(userInfo);
        const userType = userData.role || userData.userType || 'user';
        
        // Only consider authenticated if token is present
        if (userData.token && typeof userData.token === 'string' && userData.token.length > 10) {
          return {
            isAuthenticated: true,
            userData: { ...userData, userType: userType as 'user' | 'admin' | 'staff' },
            userType: userType as 'user' | 'admin' | 'staff'
          };
        } else {
          console.warn('UserInfo found but token is missing or invalid:', userData);
        }
      } catch (e) {
        console.error('Error parsing userInfo data:', e);
      }
    }

    // Fallback to old storage keys for backward compatibility
    // Check for regular user
    const user = storage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        // For old storage format, we need to check if token exists separately
        const token = storage.getItem('token') || storage.getItem('userToken');
        if (token) {
          return {
            isAuthenticated: true,
            userData: { ...userData, userType: 'user' as const, token },
            userType: 'user' as const
          };
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Check for admin
    const admin = storage.getItem('admin');
    if (admin) {
      try {
        const adminData = JSON.parse(admin);
        const token = storage.getItem('adminToken');
        if (token) {
          return {
            isAuthenticated: true,
            userData: { ...adminData, userType: 'admin' as const, token },
            userType: 'admin' as const
          };
        }
      } catch (e) {
        console.error('Error parsing admin data:', e);
      }
    }

    // Check for staff
    const staff = storage.getItem('staff');
    if (staff) {
      try {
        const staffData = JSON.parse(staff);
        const token = storage.getItem('staffToken') || storage.getItem('token');
        if (token) {
          return {
            isAuthenticated: true,
            userData: { ...staffData, userType: 'staff' as const, token },
            userType: 'staff' as const
          };
        }
      } catch (e) {
        console.error('Error parsing staff data:', e);
      }
    }

    return null;
  };

  // Check localStorage first
  const localStorageAuth = checkStorage(localStorage);
  if (localStorageAuth) {
    return localStorageAuth;
  }

  // Check sessionStorage
  const sessionStorageAuth = checkStorage(sessionStorage);
  if (sessionStorageAuth) {
    return sessionStorageAuth;
  }

  // No authentication found
  return {
    isAuthenticated: false,
    userData: null,
    userType: null
  };
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  // Clear new unified storage key
  localStorage.removeItem('userInfo');
  sessionStorage.removeItem('userInfo');

  // Clear old storage keys for backward compatibility
  localStorage.removeItem('user');
  localStorage.removeItem('admin');
  localStorage.removeItem('staff');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('admin');
  sessionStorage.removeItem('staff');

  // Dispatch custom event to notify other components
  window.dispatchEvent(new Event('authStateChanged'));
}

/**
 * Update user data in the appropriate storage
 */
export function updateUserData(userData: UserData): void {
  const authState = getAuthState();
  if (!authState.isAuthenticated || !authState.userType) {
    return;
  }

  const storageKey = authState.userType;
  const storage = sessionStorage; // Always use sessionStorage for auth data

  // Save to both the legacy key (for backward compatibility) and the new userInfo key
  storage.setItem(storageKey, JSON.stringify(userData));
  
  // Also save to userInfo key for getAuthState to read properly
  storage.setItem('userInfo', JSON.stringify({
    ...userData,
    role: userData.userType || 'user'
  }));

  // Dispatch custom event to notify other components
  window.dispatchEvent(new Event('authStateChanged'));
}
