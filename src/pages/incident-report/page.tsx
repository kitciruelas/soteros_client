import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/base/Button';
import useForm from '../../hooks/useForm';
import useGeolocation from '../../hooks/useGeolocation';
import Navbar from '../../components/Navbar';
import { useToast } from '../../components/base/Toast';
import { getAuthState, type UserData } from '../../utils/auth';
import { reverseGeocode } from '../../utils/geocoding';
import { apiFormRequest } from '../../utils/api';
import ReCAPTCHA from 'react-google-recaptcha';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import PrivacyPolicyModal from '../../components/PrivacyPolicyModal';
import TermsOfServiceModal from '../../components/TermsOfServiceModal';
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});


interface IncidentReportFormData {
  incidentType: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  priorityLevel: string;
  safetyStatus: string;
  guestName: string;
  guestContact: string;
  attachments: File[];
}

export default function IncidentReportPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [locationMethod, setLocationMethod] = useState<'auto' | 'manual'>('manual');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isReverseGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [boundaryError, setBoundaryError] = useState('');

  // New state for reCAPTCHA and terms checkbox
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [recaptchaValue, setRecaptchaValue] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [recaptchaError, setRecaptchaError] = useState('');

  // State for modals
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // State for attachments
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState('');

  // Network recovery state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [savedFormData, setSavedFormData] = useState<any>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restoreMessageShownRef = useRef<boolean>(false);
  const STORAGE_KEY = 'incident_report_draft';
  const SUBMISSION_SUCCESS_KEY = 'incident_report_submission_success';
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff in ms

  // Get user location
  const { latitude, longitude, error: locationError, loading: locationLoading, getCurrentLocation } = useGeolocation();

  // Clear saved form data after successful submission
  const clearSavedFormData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      // Mark that submission was successful to prevent restoration
      localStorage.setItem(SUBMISSION_SUCCESS_KEY, Date.now().toString());
      setSavedFormData(null);
      restoreMessageShownRef.current = false;
    } catch (error) {
      console.error('Failed to clear saved form data:', error);
    }
  };

  // Clear form and saved data (for clear button)
  const clearFormData = () => {
    try {
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SUBMISSION_SUCCESS_KEY);
      
      // Reset all form fields
      setValue('incidentType', '');
      setValue('description', '');
      setValue('location', '');
      setValue('latitude', null);
      setValue('longitude', null);
      setValue('priorityLevel', 'critical');
      setValue('safetyStatus', '');
      setValue('guestName', '');
      setValue('guestContact', '');
      
      // Clear attachments
      setSelectedFiles([]);
      setValue('attachments', []);
      
      // Reset other state
      setSavedFormData(null);
      restoreMessageShownRef.current = false;
      setRecaptchaValue(null);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setAgreedToTerms(false);
      setLocationMethod('manual');
      
      // Show confirmation
      showToast({
        type: 'success',
        title: 'Form Cleared',
        message: 'All form data has been cleared. You can now start fresh.',
        durationMs: 3000
      });
    } catch (error) {
      console.error('Failed to clear form data:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to clear form data. Please try again.',
        durationMs: 3000
      });
    }
  };

  // Handle reCAPTCHA change
  const onRecaptchaChange = (value: string | null) => {
    setRecaptchaValue(value);
    if (value) {
      setRecaptchaError('');
    }
  };

  // Handle terms checkbox change
  const onTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreedToTerms(e.target.checked);
    if (e.target.checked) {
      setTermsError('');
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024; // 10MB per file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (files.length + selectedFiles.length > maxFiles) {
      setAttachmentError(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Only images are allowed.`);
      } else if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds 10MB limit.`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setAttachmentError(errors.join(' '));
    } else {
      setAttachmentError('');
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setValue('attachments', [...selectedFiles, ...validFiles]);
    }
  };

  // Remove selected file
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setValue('attachments', newFiles);
    setAttachmentError('');
  };

  // Get location name on component mount
  useEffect(() => {
    const getLocationName = async () => {
      try {
        const result = await reverseGeocode(13.8043, 121.2855);
        if (result.success) {
          // Location name is available but not used in current implementation
          console.log('Location name:', result.locationName);
        } else {
          console.log('Using default location: Rosario, Batangas');
        }
      } catch (error) {
        console.error('Failed to get location name:', error);
        console.log('Using default location: Rosario, Batangas');
      }
    };

    getLocationName();
  }, []);


  // Philippine mobile number validation function
  const validatePhilippineMobile = (value: string): boolean => {
    if (!value) return false;

    // Handle E.164 format from PhoneInput (+639XXXXXXXXX)
    if (value.startsWith('+63')) {
      const cleanNumber = value.replace(/\D/g, '');
      return /^639\d{9}$/.test(cleanNumber); // 639 followed by 9 digits
    }

    // Handle local format (09XXXXXXXXX)
    if (value.startsWith('09')) {
      const cleanNumber = value.replace(/\D/g, '');
      return /^09\d{9}$/.test(cleanNumber); // 09 followed by 9 digits
    }

    // Handle international format without + (639XXXXXXXXX)
    const cleanNumber = value.replace(/\D/g, '');
    if (cleanNumber.startsWith('639') && cleanNumber.length === 12) {
      return /^639\d{9}$/.test(cleanNumber);
    }

    // Handle local format without spaces/dashes
    if (cleanNumber.startsWith('9') && cleanNumber.length === 10) {
      return /^9\d{9}$/.test(cleanNumber);
    }

    return false;
  };

  const validationRules = useMemo(() => ({
    incidentType: {
      required: true
    },
    description: {
      // No validation rules - completely optional
    },
    location: {
      required: true
    },
    priorityLevel: {
      required: true
    },
    safetyStatus: {
      required: true
    },
    guestName: {
      required: !isAuthenticated
    },
    guestContact: {
      required: !isAuthenticated,
      custom: (value: string) => {
        if (!isAuthenticated && !validatePhilippineMobile(value)) {
          return 'Please enter a valid Philippine mobile number (e.g., 09123456789 or +639123456789)';
        }
        return '';
      }
    }
  }), [isAuthenticated]);

  const { fields, setValue, validateAll, getValues, isSubmitting, setIsSubmitting } = useForm<IncidentReportFormData>(
    {
      incidentType: '',
      description: '',
      location: '',
      latitude: null,
      longitude: null,
      priorityLevel: 'critical',
      safetyStatus: '',
      guestName: '',
      guestContact: '',
      attachments: []
    },
    validationRules
  );

  // Check if there's saved data or form has values to show clear button
  const hasFormData = React.useMemo(() => {
    // Check if any form field has a value
    const hasValues = 
      fields.incidentType.value ||
      fields.description.value ||
      fields.location.value ||
      fields.safetyStatus.value ||
      fields.guestName.value ||
      fields.guestContact.value ||
      selectedFiles.length > 0;
    
    // Also check localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const age = Date.now() - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return hasValues || age < maxAge;
      }
    } catch (error) {
      // Ignore errors
    }
    
    return hasValues;
  }, [fields, selectedFiles]);

  // Save form data to localStorage
  const saveFormDataToStorage = (formData: any, files?: File[]) => {
    try {
      const dataToSave = {
        ...formData,
        timestamp: Date.now(),
        // Note: Files cannot be stored in localStorage, so we just store metadata
        fileMetadata: files?.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })) || []
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setSavedFormData(dataToSave);
    } catch (error) {
      console.error('Failed to save form data to localStorage:', error);
    }
  };

  // Restore form data from localStorage
  const restoreFormData = React.useCallback(() => {
    try {
      // Check if there was a successful submission - if so, don't restore
      const submissionSuccess = localStorage.getItem(SUBMISSION_SUCCESS_KEY);
      if (submissionSuccess) {
        // Submission was successful, clear everything and don't restore
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SUBMISSION_SUCCESS_KEY);
        restoreMessageShownRef.current = false;
        return;
      }

      // No successful submission, check if there's saved data to restore
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Only restore if data is less than 24 hours old
        const age = Date.now() - data.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (age < maxAge) {
          // Restore form fields
          if (data.incidentType) setValue('incidentType', data.incidentType);
          if (data.description) setValue('description', data.description);
          if (data.location) setValue('location', data.location);
          if (data.latitude !== null && data.latitude !== undefined) setValue('latitude', data.latitude);
          if (data.longitude !== null && data.longitude !== undefined) setValue('longitude', data.longitude);
          if (data.priorityLevel) setValue('priorityLevel', data.priorityLevel);
          if (data.safetyStatus) setValue('safetyStatus', data.safetyStatus);
          if (data.guestName) setValue('guestName', data.guestName);
          if (data.guestContact) setValue('guestContact', data.guestContact);
          
          // Show restore notification only once
          if (!restoreMessageShownRef.current) {
            showToast({
              type: 'info',
              title: 'Form Data Restored',
              message: 'Your previously saved form data has been restored.',
              durationMs: 3000
            });
            restoreMessageShownRef.current = true;
          }
        } else {
          // Clear old data
          localStorage.removeItem(STORAGE_KEY);
          restoreMessageShownRef.current = false;
        }
      } else {
        // No saved data, reset the flag
        restoreMessageShownRef.current = false;
      }
    } catch (error) {
      console.error('Failed to restore form data from localStorage:', error);
    }
  }, [setValue, showToast]);

  // Auto-save form data with debouncing
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Check if submission was successful
    const submissionSuccess = localStorage.getItem(SUBMISSION_SUCCESS_KEY);
    if (submissionSuccess) {
      // Submission was successful, but user might be starting a new form
      // Clear success flag if user is typing (form has data)
      const currentValues = getValues();
      if (currentValues.incidentType || currentValues.description || currentValues.location) {
        // User is starting a new form, clear success flag
        localStorage.removeItem(SUBMISSION_SUCCESS_KEY);
      } else {
        // No form data, don't auto-save yet
        return;
      }
    }

    // Set new timeout to save after 2 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(() => {
      const currentValues = getValues();
      // Only save if form has meaningful data
      if (currentValues.incidentType || currentValues.description || currentValues.location) {
        saveFormDataToStorage(currentValues, selectedFiles);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedFiles]);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast({
        type: 'success',
        title: 'Connection Restored',
        message: 'Your connection has been restored. Saved form data will be preserved.',
        durationMs: 3000
      });
      // Try to restore form if there's saved data
      restoreFormData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are offline. Your form data is being saved locally and will be preserved.',
        durationMs: 4000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [restoreFormData, showToast]);

  useEffect(() => {
    const authState = getAuthState();
    setIsAuthenticated(authState.isAuthenticated);
    setUserData(authState.userData);

    // Restore form data on mount
    restoreFormData();

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      setIsAuthenticated(newAuthState.isAuthenticated);
      setUserData(newAuthState.userData);
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [restoreFormData]);



  // Rosario, Batangas barangays with lat/lng
  const rosarioBarangays = [
    { name: 'Alupay', lat: 13.8404, lng: 121.2922 },
    { name: 'Antipolo', lat: 13.7080, lng: 121.3096 },
    { name: 'Bagong Pook', lat: 13.8402, lng: 121.2216 },
    { name: 'Balibago', lat: 13.8512, lng: 121.2855 },
    { name: 'Barangay A', lat: 13.8457, lng: 121.2104 },
    { name: 'Barangay B', lat: 13.8461, lng: 121.2065 },
    { name: 'Barangay C', lat: 13.8467, lng: 121.2032 },
    { name: 'Barangay D', lat: 13.8440, lng: 121.2035 },
    { name: 'Barangay E', lat: 13.8415, lng: 121.2047 },
    { name: 'Bayawang', lat: 13.7944, lng: 121.2798 },
    { name: 'Baybayin', lat: 13.8277, lng: 121.2589 },
    { name: 'Bulihan', lat: 13.7967, lng: 121.2351 },
    { name: 'Cahigam', lat: 13.8021, lng: 121.2501 },
    { name: 'Calantas', lat: 13.7340, lng: 121.3129 },
    { name: 'Colongan', lat: 13.8114, lng: 121.1762 },
    { name: 'Itlugan', lat: 13.8190, lng: 121.2036 },
    { name: 'Leviste', lat: 13.7694, lng: 121.2868 },
    { name: 'Lumbangan', lat: 13.8122, lng: 121.2649 },
    { name: 'Maalas-as', lat: 13.8112, lng: 121.2122 },
    { name: 'Mabato', lat: 13.8144, lng: 121.2913 },
    { name: 'Mabunga', lat: 13.7810, lng: 121.2924 },
    { name: 'Macalamcam A', lat: 13.8551, lng: 121.3046 },
    { name: 'Macalamcam B', lat: 13.8606, lng: 121.3265 },
    { name: 'Malaya', lat: 13.8535, lng: 121.1720 },
    { name: 'Maligaya', lat: 13.8182, lng: 121.2742 },
    { name: 'Marilag', lat: 13.8562, lng: 121.1764 },
    { name: 'Masaya', lat: 13.8383, lng: 121.1852 },
    { name: 'Matamis', lat: 13.7216, lng: 121.3305 },
    { name: 'Mavalor', lat: 13.8177, lng: 121.2315 },
    { name: 'Mayuro', lat: 13.7944, lng: 121.2623 },
    { name: 'Namuco', lat: 13.8382, lng: 121.2036 },
    { name: 'Namunga', lat: 13.8431, lng: 121.1978 },
    { name: 'Nasi', lat: 13.7699, lng: 121.3127 },
    { name: 'Natu', lat: 13.8420, lng: 121.2683 },
    { name: 'Palakpak', lat: 13.7079, lng: 121.3320 },
    { name: 'Pinagsibaan', lat: 13.8438, lng: 121.3141 },
    { name: 'Putingkahoy', lat: 13.8349, lng: 121.3227 },
    { name: 'Quilib', lat: 13.8603, lng: 121.2002 },
    { name: 'Salao', lat: 13.8578, lng: 121.3455 },
    { name: 'San Carlos', lat: 13.8478, lng: 121.2475 },
    { name: 'San Ignacio', lat: 13.8335, lng: 121.1764 },
    { name: 'San Isidro', lat: 13.8074, lng: 121.3152 },
    { name: 'San Jose', lat: 13.8419, lng: 121.2329 },
    { name: 'San Roque', lat: 13.8518, lng: 121.2039 },
    { name: 'Santa Cruz', lat: 13.8599, lng: 121.1853 },
    { name: 'Timbugan', lat: 13.8095, lng: 121.1869 },
    { name: 'Tiquiwan', lat: 13.8284, lng: 121.2399 },
    { name: 'Tulos', lat: 13.7231, lng: 121.2971 },
  ];

  // Boundary barangays - these are explicitly on the municipal boundary
  const boundaryBarangays = [
    { name: 'Antipolo', lat: 13.7080, lng: 121.3096 },
    { name: 'Palakpak', lat: 13.7079, lng: 121.3320 },
    { name: 'Salao', lat: 13.8578, lng: 121.3455 },
    { name: 'Santa Cruz', lat: 13.8599, lng: 121.1853 },
    { name: 'Malaya', lat: 13.8535, lng: 121.1720 },
    { name: 'Matamis', lat: 13.7216, lng: 121.3305 }, // Part of Rosario boundary area
  ];

  // Additional boundary reference points for more accurate boundary calculation
  const additionalBoundaryPoints = [
    { lat: 13.701325, lng: 121.319271 },
    { lat: 13.7032933079099, lng: 121.32814414565625 },
    { lat: 13.705690, lng: 121.339967 },
    { lat: 13.695825942378994, lng: 121.30536321612809 },
    { lat: 13.863121, lng: 121.166777 },
    { lat: 13.691527, lng: 121.294116 },
  ];

  // Combine boundary barangays, regular barangays, and additional boundary points for boundary calculation
  // Boundary barangays are included twice to emphasize their importance in the boundary calculation
  const allBoundaryPoints = [...rosarioBarangays, ...boundaryBarangays, ...additionalBoundaryPoints];

  // Calculate convex hull (boundary) from barangay coordinates using Graham scan algorithm
  const calculateRosarioBoundary = (): [number, number][] => {
    const points = allBoundaryPoints.map(b => [b.lng, b.lat] as [number, number]);
    
    if (points.length < 3) {
      // If less than 3 points, return bounding box
      const lngs = points.map(p => p[0]);
      const lats = points.map(p => p[1]);
      const minLng = Math.min(...lngs) - 0.005;
      const maxLng = Math.max(...lngs) + 0.005;
      const minLat = Math.min(...lats) - 0.005;
      const maxLat = Math.max(...lats) + 0.005;
      return [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ];
    }

    // Find the bottom-most point (or left-most in case of tie)
    let bottom = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i][1] < points[bottom][1] || 
          (points[i][1] === points[bottom][1] && points[i][0] < points[bottom][0])) {
        bottom = i;
      }
    }

    // Swap bottom point with first point
    [points[0], points[bottom]] = [points[bottom], points[0]];

    // Sort points by polar angle with respect to bottom point
    const p0 = points[0];
    const sortedPoints = [points[0], ...points.slice(1).sort((a, b) => {
      const angleA = Math.atan2(a[1] - p0[1], a[0] - p0[0]);
      const angleB = Math.atan2(b[1] - p0[1], b[0] - p0[0]);
      if (angleA !== angleB) return angleA - angleB;
      return Math.hypot(a[0] - p0[0], a[1] - p0[1]) - Math.hypot(b[0] - p0[0], b[1] - p0[1]);
    })];

    // Build convex hull
    const hull: [number, number][] = [sortedPoints[0], sortedPoints[1]];
    
    for (let i = 2; i < sortedPoints.length; i++) {
      while (hull.length > 1) {
        const p1 = hull[hull.length - 2];
        const p2 = hull[hull.length - 1];
        const p3 = sortedPoints[i];
        
        // Cross product to determine turn direction
        const cross = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
        
        if (cross <= 0) {
          hull.pop();
        } else {
          break;
        }
      }
      hull.push(sortedPoints[i]);
    }

    // Close the polygon
    if (hull.length > 0 && (hull[0][0] !== hull[hull.length - 1][0] || hull[0][1] !== hull[hull.length - 1][1])) {
      hull.push(hull[0]);
    }

    return hull.length > 0 ? hull : [
      [121.17, 13.70],
      [121.35, 13.70],
      [121.35, 13.87],
      [121.17, 13.87],
      [121.17, 13.70],
    ];
  };

  // Get Rosario boundary polygon
  const rosarioBoundary = useMemo(() => calculateRosarioBoundary(), []);

  // Calculate center of Rosario for map view
  const rosarioCenter: [number, number] = useMemo(() => {
    const avgLat = rosarioBarangays.reduce((sum, b) => sum + b.lat, 0) / rosarioBarangays.length;
    const avgLng = rosarioBarangays.reduce((sum, b) => sum + b.lng, 0) / rosarioBarangays.length;
    return [avgLat, avgLng];
  }, []);

  // Point-in-polygon test using ray casting algorithm
  const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
    const [lng, lat] = point;
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  // Check if coordinates are within Rosario boundaries
  const isWithinRosarioBoundary = (lat: number | null, lng: number | null): boolean => {
    if (lat === null || lng === null) return false;
    return isPointInPolygon([lng, lat], rosarioBoundary);
  };

  // Map component to fit bounds
  const MapBounds = ({ bounds }: { bounds: [[number, number], [number, number]] }) => {
    const map = useMap();
    useEffect(() => {
      map.fitBounds(bounds, { padding: [50, 50] });
    }, [map, bounds]);
    return null;
  };


  // Completely local location search function
  const searchLocation = async (query: string) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingLocation(true);

    // Add barangays to the local database for search
    const localDatabase = [
      ...rosarioBarangays.map(b => ({
        display_name: `Barangay ${b.name}, Rosario, Batangas`,
        lat: b.lat.toString(),
        lon: b.lng.toString(),
        address: { city: 'Rosario', province: 'Batangas' },
        category: 'Barangay'
      })),
      // ...existing code for other locations if needed...
    ];

    setTimeout(() => {
      const searchTerms = query.toLowerCase().split(' ');
      const filteredSuggestions = localDatabase.filter(location => {
        const locationText = location.display_name.toLowerCase();
        return searchTerms.some(term =>
          locationText.includes(term) ||
          location.category.toLowerCase().includes(term)
        );
      });
      const sortedSuggestions = filteredSuggestions.sort((a, b) => {
        const aExact = a.display_name.toLowerCase().includes(query.toLowerCase());
        const bExact = b.display_name.toLowerCase().includes(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
      const limitedSuggestions = sortedSuggestions.slice(0, 6);
      setLocationSuggestions(limitedSuggestions);
      setShowSuggestions(limitedSuggestions.length > 0);
      setIsSearchingLocation(false);
    }, 200);
  };

  // Handle location suggestion selection
  const handleLocationSelect = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    // Check if within Rosario boundary
    if (!isWithinRosarioBoundary(lat, lng)) {
      setBoundaryError('This location is outside Rosario, Batangas. Please select a location within the municipality.');
      showToast({
        type: 'error',
        title: 'Location Outside Boundary',
        message: 'Please select a location within Rosario, Batangas.',
        durationMs: 5000
      });
      return;
    }
    
    setValue('location', suggestion.display_name);
    setValue('latitude', lat);
    setValue('longitude', lng);
    setShowSuggestions(false);
    setLocationMethod('manual');
    setBoundaryError('');
  };


  // Auto-fill location when geolocation is available
  useEffect(() => {
    if (latitude && longitude && locationMethod === 'auto') {
      // Check if within Rosario boundary
      if (!isWithinRosarioBoundary(latitude, longitude)) {
        setBoundaryError('Your current location is outside Rosario, Batangas. Please select a location within the municipality or use manual entry.');
        showToast({
          type: 'error',
          title: 'Location Outside Boundary',
          message: 'Your GPS location is outside Rosario, Batangas. Please use manual location selection.',
          durationMs: 5000
        });
        setLocationMethod('manual');
        return;
      }
      
      setValue('latitude', latitude);
      setValue('longitude', longitude);
      setBoundaryError('');

      // Perform reverse geocoding using the external utility
      const getGeocodedLocation = async () => {
        try {
          const result = await reverseGeocode(latitude, longitude);
          if (typeof result === 'object' && 'success' in result && result.success) {
            setValue('location', result.locationName);
          } else {
            // Fallback to coordinates if geocoding fails
            setValue('location', `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Geocoding failed:', error);
          // Fallback to coordinates
          setValue('location', `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      };

      getGeocodedLocation();
    }
  }, [latitude, longitude, locationMethod, setValue, showToast, isWithinRosarioBoundary]);

  // Convert GPS coordinates in location field to location name
  useEffect(() => {
    const locationValue = fields.location.value;
    
    // Check if location starts with "GPS:" and contains coordinates
    if (locationValue && locationValue.startsWith('GPS:')) {
      const gpsMatch = locationValue.match(/GPS:\s*([\d.]+),\s*([\d.]+)/);
      if (gpsMatch) {
        const lat = parseFloat(gpsMatch[1]);
        const lng = parseFloat(gpsMatch[2]);
        
        // Only convert if we have valid coordinates
        if (!isNaN(lat) && !isNaN(lng)) {
          // Check if within Rosario boundary
          if (!isWithinRosarioBoundary(lat, lng)) {
            setBoundaryError('GPS coordinates are outside Rosario, Batangas. Please select a location within the municipality.');
            showToast({
              type: 'error',
              title: 'Location Outside Boundary',
              message: 'GPS coordinates are outside Rosario, Batangas. Please select a location within the municipality.',
              durationMs: 5000
            });
            return;
          }

          const convertToLocationName = async () => {
            try {
              const result = await reverseGeocode(lat, lng);
              if (typeof result === 'object' && 'success' in result && result.success) {
                setValue('location', result.locationName);
                // Also update the latitude and longitude fields if they're not set
                if (!fields.latitude.value || !fields.longitude.value) {
                  setValue('latitude', lat);
                  setValue('longitude', lng);
                }
                setBoundaryError('');
              }
            } catch (error) {
              console.error('Failed to convert GPS coordinates to location name:', error);
            }
          };
          
          convertToLocationName();
        }
      }
    }
  }, [fields.location.value, fields.latitude.value, fields.longitude.value, setValue, isWithinRosarioBoundary, showToast]);

  // Handle auto-location
  const handleAutoLocation = async () => {
    setLocationMethod('auto');
    setIsLoadingLocation(true);
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Failed to get location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Debounced location search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (fields.location.value && locationMethod === 'manual' && !fields.location.value.includes('Barangay')) {
        searchLocation(fields.location.value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fields.location.value, locationMethod]);

  // Retry logic with exponential backoff
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES,
    attempt = 0
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error: any) {
      // Check if it's a network error (not a validation/auth error)
      const isNetworkError = 
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network') ||
        !navigator.onLine;

      // Don't retry for validation or auth errors
      if (!isNetworkError || attempt >= retries) {
        throw error;
      }

      const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      setIsRetrying(true);
      setRetryCount(attempt + 1);

      showToast({
        type: 'warning',
        title: 'Retrying Submission',
        message: `Network error detected. Retrying in ${delay / 1000} seconds... (Attempt ${attempt + 1}/${retries})`,
        durationMs: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      
      return retryWithBackoff(fn, retries, attempt + 1);
    } finally {
      if (attempt >= retries - 1) {
        setIsRetrying(false);
        setRetryCount(0);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate reCAPTCHA only for guest users
    if (!isAuthenticated) {
      // Set agreedToTerms to true since we show the notice instead of checkbox
      setAgreedToTerms(true);

      if (!recaptchaValue) {
        setRecaptchaError('Please complete the reCAPTCHA.');
        return;
      }
    }

    console.log('Form submission started...');
    console.log('Current form values:', getValues());
    console.log('Authentication status:', isAuthenticated);

    // Validate all fields
    const isValid = validateAll();
    console.log('Form validation result:', isValid);

    if (!isValid) {
      console.log('Form validation failed. Field errors:', fields);
      const errorMessages = Object.entries(fields)
        .filter(([_, field]) => field.error)
        .map(([name, field]) => `${name}: ${field.error}`)
        .join('; ');
      
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: errorMessages || 'Please fill in all required fields correctly.',
        durationMs: 5000
      });
      return;
    }

    // Validate location is within Rosario boundary
    const raw = getValues();
    if (!isWithinRosarioBoundary(raw.latitude, raw.longitude)) {
      setBoundaryError('The selected location is outside Rosario, Batangas. Please select a location within the municipality.');
      showToast({
        type: 'error',
        title: 'Location Outside Boundary',
        message: 'The selected location is outside Rosario, Batangas. Please select a location within the municipality.',
        durationMs: 5000
      });
      return;
    }

    // Check if offline and save data for later
    if (!navigator.onLine) {
      const raw = getValues();
      saveFormDataToStorage(raw, selectedFiles);
      showToast({
        type: 'warning',
        title: 'Offline Mode',
        message: 'You are currently offline. Your form data has been saved locally. Please submit again when your connection is restored.',
        durationMs: 6000
      });
      return;
    }

    // Determine submission endpoint based on authentication status
    const endpoint = isAuthenticated ? '/incidents/report' : '/incidents/report-guest';

    setIsSubmitting(true);
    setBoundaryError(''); // Clear any previous boundary errors

    try {
      const raw = getValues();
      const formData = new FormData();

      // Add text fields
      formData.append('incidentType', (raw.incidentType || '').trim());
      // Send description - use empty string or default if backend requires non-empty
      const descriptionValue = (raw.description || '').trim();
      formData.append('description', descriptionValue || 'No description provided');
      formData.append('location', (raw.location || '').trim());
      formData.append('latitude', String(typeof raw.latitude === 'number' ? raw.latitude : (raw.latitude ? parseFloat(String(raw.latitude)) : null)));
      formData.append('longitude', String(typeof raw.longitude === 'number' ? raw.longitude : (raw.longitude ? parseFloat(String(raw.longitude)) : null)));
      formData.append('priorityLevel', (raw.priorityLevel || '').trim());
      formData.append('safetyStatus', (raw.safetyStatus || '').trim());
      formData.append('recaptchaToken', recaptchaValue || '');

      // Add guest information if not authenticated
      if (!isAuthenticated) {
        formData.append('guestName', ((raw as any).guestName || '').trim());
        formData.append('guestContact', ((raw as any).guestContact || '').trim());
      }

      // Add attachments
      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      // If location is empty but coordinates exist, synthesize a readable fallback
      const location = (raw.location || '').trim();
      if (!location && raw.latitude && raw.longitude) {
        formData.set('location', `GPS Location: ${Number(raw.latitude).toFixed(6)}, ${Number(raw.longitude).toFixed(6)} (Rosario, Batangas)`);
      }

      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('Raw form data:', raw);
      console.log('Selected files:', selectedFiles.length);
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      // Real API call with retry logic
      const responseData = await retryWithBackoff(() => 
        apiFormRequest(endpoint, formData, {
          ...(isAuthenticated && userData?.token ? { headers: { 'Authorization': `Bearer ${userData.token}` } } : {})
        })
      );

      console.log('SUCCESS: Incident report saved to database:', responseData);
      
      // Clear saved form data after successful submission
      clearSavedFormData();
      
      showToast({
        type: 'success',
        title: 'Report Submitted Successfully!',
        message: 'Emergency responders have been notified and will respond as soon as possible.',
        durationMs: 5000
      });
      // Redirect to home page after successful submission
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error: any) {
      console.error('Incident report submission failed:', error);
      
      // Save form data for recovery
      const raw = getValues();
      saveFormDataToStorage(raw, selectedFiles);
      
      // Handle different types of errors
      let errorMessage = 'Network error. Your form data has been saved locally. Please check your connection and try again.';
      let errorTitle = 'Submission Failed';
      
      if (error.message) {
        if (error.message.includes('Missing required fields')) {
          errorMessage = error.message;
          errorTitle = 'Validation Error';
        } else if (error.message.includes('Authentication failed')) {
          errorMessage = 'Authentication failed. Please log in again.';
          errorTitle = 'Authentication Error';
        } else if (error.message.includes('Daily submission limit reached')) {
          errorMessage = error.message;
          errorTitle = 'Daily Limit Reached';
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error after multiple retry attempts. Your form data has been saved locally. Please check your connection and try again.';
        } else {
          errorMessage = error.message + ' Your form data has been saved locally.';
        }
      }
      
      showToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        durationMs: 6000
      });
    } finally {
      setIsSubmitting(false);
      setIsRetrying(false);
      setRetryCount(0);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setRecaptchaValue(null);
    }
  };

  // Render incident form sections (shared between authenticated and guest users)
  const renderIncidentFormSections = () => (
    <>
      {/* Hidden Priority Level Field - Always Critical */}
      <input type="hidden" name="priorityLevel" value="critical" />
      
      {/* Incident Type Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-alert-line text-red-600"></i>
            </div>
            Incident Information
          </h3>
          <p className="text-gray-600 mt-2">Please provide details about the incident</p>
        </div>

        <div>
          <label htmlFor="incidentType" className="block text-sm font-semibold text-gray-700 mb-3">
            <i className="ri-error-warning-line mr-2 text-red-600"></i>
            Incident Type <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-alert-line text-gray-400"></i>
            </div>
            <select
              id="incidentType"
              name="incidentType"
              value={fields.incidentType.value}
              onChange={(e) => setValue('incidentType', e.target.value)}
              className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all appearance-none bg-white ${
                fields.incidentType.error ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select incident type...</option>
              <option value="fire">&#128293; Fire Emergency</option>
              <option value="medical">&#128657; Medical Emergency</option>
              <option value="security">&#128737; Security Incident</option>
              <option value="accident">&#128165; Transport Accident</option>
              <option value="other">&#9888; Other Emergency</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i className="ri-arrow-down-s-line text-gray-400"></i>
            </div>
          </div>
          {fields.incidentType.touched && fields.incidentType.error && (
            <p className="text-red-600 text-sm mt-2">{fields.incidentType.error}</p>
          )}
        </div>
      </div>

      {/* Location Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-map-pin-line text-red-600"></i>
            </div>
            Location Information
          </h3>
          <p className="text-gray-600 mt-2">Specify where the incident occurred</p>
        </div>

        <div className="space-y-4">
          {/* Location Method Toggle */}
          <div className="flex items-center space-x-4 mb-4">
            <label className="block text-sm font-semibold text-gray-700">
              Location Method:
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setLocationMethod('manual');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  locationMethod === 'manual'
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className="ri-edit-line mr-2"></i>
                Manual Entry
              </button>
              <button
                type="button"
                onClick={handleAutoLocation}
                disabled={isLoadingLocation || locationLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  locationMethod === 'auto'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${(isLoadingLocation || locationLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoadingLocation || locationLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Getting Location...
                  </>
                ) : (
                  <>
                    <i className="ri-gps-line mr-2"></i>
                    Auto-Detect
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Location Input with Search */}
          <div className="relative">
            {/* Rosario Barangays Dropdown */}
            <div className="mt-2 mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <i className="ri-map-pin-line mr-2 text-red-600"></i>
                Select Barangay (Rosario, Batangas)
              </label>
              <select
                className="w-full px-3 py-3 border border-red-200 rounded-lg text-sm text-red-800 font-medium bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all mb-1"
                value={rosarioBarangays.find(b => `Barangay ${b.name}, Rosario, Batangas` === fields.location.value) ? fields.location.value : ''}
                onChange={e => {
                  const selected = rosarioBarangays.find(b => `Barangay ${b.name}, Rosario, Batangas` === e.target.value);
                  if (selected) {
                    // Verify barangay is within boundary (should always be true, but check anyway)
                    if (!isWithinRosarioBoundary(selected.lat, selected.lng)) {
                      setBoundaryError('Selected barangay is outside Rosario, Batangas boundary.');
                      return;
                    }
                    
                    const locationText = `Barangay ${selected.name}, Rosario, Batangas`;
                    setValue('location', locationText);
                    setValue('latitude', selected.lat);
                    setValue('longitude', selected.lng);
                    setShowSuggestions(false);
                    setLocationMethod('manual');
                    setBoundaryError('');
                    console.log('Barangay selected:', locationText, 'Coordinates:', selected.lat, selected.lng);
                  } else {
                    setValue('location', '');
                    setValue('latitude', null);
                    setValue('longitude', null);
                    setBoundaryError('');
                  }
                }}
              >
                <option value="">-- Select Barangay --</option>
                {rosarioBarangays.map(b => (
                  <option key={b.name} value={`Barangay ${b.name}, Rosario, Batangas`}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-1">Choose a barangay to quickly fill location and coordinates.</p>
            </div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <i className="ri-map-pin-line mr-2 text-red-600"></i>
              Location Description <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="ri-map-pin-line text-gray-400"></i>
              </div>
              <input
                type="text"
                name="location"
                id="location"
                value={fields.location.value}
                onChange={(e) => {
                  // Don't allow editing if a barangay is selected
                  if (!fields.location.value.includes('Barangay')) {
                    setValue('location', e.target.value);
                    if (locationMethod === 'auto') {
                      setLocationMethod('manual');
                    }
                  }
                }}
                className="w-full pl-10 pr-10 py-3 border rounded-xl transition-all border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
                placeholder={
                  fields.location.value && fields.location.value.includes('Barangay')
                    ? 'Barangay selected - location is set'
                    : locationMethod === 'auto' 
                      ? 'Auto-detected location will appear here...' 
                      : 'Enter location description or select a barangay above'
                }
                disabled
                required
              />

              {/* Loading indicator for search */}
              {(isSearchingLocation || isReverseGeocoding) && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <i className="ri-loader-4-line animate-spin text-red-600"></i>
                </div>
              )}
            </div>


            {/* Error Messages */}
            {fields.location.touched && fields.location.error && (
              <p className="text-red-600 text-sm mt-2">
                <i className="ri-error-warning-line mr-1"></i>
                {fields.location.error}
              </p>
            )}

            {locationError && (
              <p className="text-red-600 text-sm mt-2">
                <i className="ri-error-warning-line mr-1"></i>
                {locationError}
              </p>
            )}

            {/* GPS Coordinates Display */}
            {latitude && longitude && locationMethod === 'auto' && (
              <div className="mt-3 p-3 border rounded-lg bg-gray-50 border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100">
                    <i className="ri-gps-line text-sm text-gray-600"></i>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">
                      GPS Location Detected
                    </p>
                    <p className="text-xs mt-1 text-gray-600">
                      Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Boundary Error */}
            {boundaryError && (
              <p className="text-red-600 text-sm mt-2">
                <i className="ri-error-warning-line mr-1"></i>
                {boundaryError}
              </p>
            )}

            {/* Show Map Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <i className={showMap ? 'ri-map-close-line' : 'ri-map-2-line'}></i>
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>

            {/* Map Component */}
            {showMap && (
              <div className="mt-4 rounded-xl overflow-hidden border border-gray-300 shadow-lg" style={{ height: '400px', zIndex: 1 }}>
                <MapContainer
                  center={fields.latitude.value && fields.longitude.value 
                    ? [fields.latitude.value, fields.longitude.value] 
                    : rosarioCenter}
                  zoom={fields.latitude.value && fields.longitude.value ? 14 : 12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Rosario Boundary Polygon */}
                  <Polygon
                    positions={rosarioBoundary.map(([lng, lat]) => [lat, lng])}
                    pathOptions={{
                      color: '#ef4444',
                      fillColor: '#fee2e2',
                      fillOpacity: 0.3,
                      weight: 2,
                      dashArray: '5, 5'
                    }}
                  />

                  {/* Location Marker */}
                  {fields.latitude.value && fields.longitude.value && (
                    <Marker
                      position={[fields.latitude.value, fields.longitude.value]}
                    >
                      <Popup>
                        <div>
                          <p className="font-semibold">Incident Location</p>
                          <p className="text-sm text-gray-600">{fields.location.value || 'Location'}</p>
                          <p className="text-xs text-gray-500">
                            {fields.latitude.value.toFixed(6)}, {fields.longitude.value.toFixed(6)}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Fit bounds to show boundary */}
                  <MapBounds bounds={[
                    [Math.min(...allBoundaryPoints.map(b => b.lat)), Math.min(...allBoundaryPoints.map(b => b.lng))],
                    [Math.max(...allBoundaryPoints.map(b => b.lat)), Math.max(...allBoundaryPoints.map(b => b.lng))]
                  ]} />
                </MapContainer>
                <div className="bg-red-50 border-t border-red-200 p-3">
                  <p className="text-xs text-red-700 flex items-center">
                    <i className="ri-map-pin-line mr-2"></i>
                    <span>The red dashed boundary shows the municipality of Rosario, Batangas. Incidents can only be reported within this area.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Safety Status Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-shield-check-line text-green-600"></i>
            </div>
            Your Safety Status
          </h3>
          <p className="text-gray-600 mt-2">Are you currently safe?</p>
        </div>

        <div>
          <label htmlFor="safetyStatus" className="block text-sm font-semibold text-gray-700 mb-3">
            <i className="ri-shield-check-line mr-2 text-green-600"></i>
            Your Safety Status <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-shield-check-line text-gray-400"></i>
            </div>
            <select
              id="safetyStatus"
              name="safetyStatus"
              value={fields.safetyStatus.value}
              onChange={(e) => setValue('safetyStatus', e.target.value)}
              className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all appearance-none bg-white ${
                fields.safetyStatus.error ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select your safety status...</option>
              <option value="safe">🟢 I am safe - Not in immediate danger</option>
              <option value="injured">🟡 I am injured - Need medical attention</option>
              <option value="danger">🔴 I am in danger - Need immediate help</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <i className="ri-arrow-down-s-line text-gray-400"></i>
            </div>
          </div>
          {fields.safetyStatus.touched && fields.safetyStatus.error && (
            <p className="text-red-600 text-sm mt-2">{fields.safetyStatus.error}</p>
          )}
        </div>
      </div>

      {/* Description Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-file-text-line text-purple-600"></i>
            </div>
            Incident Description
          </h3>
          <p className="text-gray-600 mt-2">Provide detailed information about what happened</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <i className="ri-file-text-line mr-2 text-purple-600"></i>
            Detailed Description <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <textarea
            value={fields.description.value}
            onChange={(e) => setValue('description', e.target.value)}
            className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
            rows={6}
            placeholder="Please provide a detailed description of the incident including:
• What happened?
• When did it occur?
• Who was involved?
• Any injuries or damages?
• Current situation status..."
          />
          {fields.description.touched && fields.description.error && (
            <p className="text-red-600 text-sm mt-2">{fields.description.error}</p>
          )}
         
        </div>
      </div>

      {/* Attachments Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-image-line text-green-600"></i>
            </div>
            Attachments
          </h3>
          <p className="text-gray-600 mt-2">Upload photos related to the incident (optional)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <i className="ri-image-line mr-2 text-green-600"></i>
            Upload Images
          </label>

          {/* File Input */}
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-camera-line text-2xl text-green-600"></i>
              </div>
              <p className="text-gray-600 font-medium">Click to upload images</p>
              <p className="text-gray-400 text-sm mt-1">PNG, JPG, GIF, WebP up to 10MB each (max 5 files)</p>
            </div>
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Selected files:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-image-line text-green-600"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <i className="ri-close-line text-lg"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Error */}
          {attachmentError && (
            <p className="text-red-600 text-sm mt-2">
              <i className="ri-error-warning-line mr-1"></i>
              {attachmentError}
            </p>
          )}

          <p className="text-gray-500 text-sm mt-2">
            Attachments help emergency responders better understand the situation. Only image files are accepted.
          </p>
        </div>
      </div>


    </>
  );

  // Guest form section - show form for unauthenticated users
  const renderGuestForm = () => (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100">
        <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section for Guests */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-orange-600/5"></div>
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.05) 2px, transparent 0)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          <div className="relative container mx-auto px-4 py-16">
            <div className="text-center max-w-4xl mx-auto">
              {/* Enhanced Icon */}
              <div className="relative inline-flex items-center justify-center mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
                <div className="relative w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <i className="ri-error-warning-line text-3xl text-white"></i>
                </div>
              </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-red-900 to-orange-900 bg-clip-text text-transparent mb-6 leading-tight">
              Report an Incident
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              <span className="block text-lg text-gray-500 mt-2">Submit incident reports as a guest or create an account for better tracking</span>
            </p>

            {/* Enhanced Info Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl p-6 max-w-3xl mx-auto shadow-lg backdrop-blur-sm mb-8">
              <div className="flex items-center justify-center text-red-800">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-information-line text-red-600"></i>
                  </div>
                  <p className="font-semibold text-lg">
                  Guest reporting available - No account required
                  </p>
                </div>
              <p className="text-red-600 text-sm mt-2 opacity-80">
                You can submit incident reports without creating an account. Creating an account helps us track your reports better.
                </p>
              </div>

              {/* Login Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link
                  to="/auth/login"
                  className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <i className="ri-login-box-line mr-2"></i>
                  Sign In
                </Link>
                <Link
                  to="/auth/signup"
                  className="px-8 py-4 border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <i className="ri-user-add-line mr-2"></i>
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>

      {/* Guest Form */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">


          {/* Guest Incident Report Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Information Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                        <i className="ri-user-line text-red-600"></i>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Your Information
                      </h3>
                    </div>
                    {hasFormData && (
                      <button
                        type="button"
                        onClick={clearFormData}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <i className="ri-delete-bin-line"></i>
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2">Please provide your contact details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="guestName" className="block text-sm font-semibold text-gray-700 mb-3">
                      <i className="ri-user-line mr-2 text-red-600"></i>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="ri-user-line text-gray-400"></i>
                      </div>
                      <input
                        type="text"
                        id="guestName"
                        name="guestName"
                        value={fields.guestName.value}
                        onChange={(e) => setValue('guestName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${
                          fields.guestName.error ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    {fields.guestName.touched && fields.guestName.error && (
                      <p className="text-red-600 text-sm mt-2">{fields.guestName.error}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="guestContact" className="block text-sm font-semibold text-gray-700 mb-3">
                      <i className="ri-phone-line mr-2 text-red-600"></i>
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="ri-phone-line text-gray-400"></i>
                      </div>
                      <PhoneInput
                        international
                        defaultCountry="PH"
                        value={fields.guestContact.value}
                        onChange={(value) => {
                          // Store the formatted value from PhoneInput
                          setValue('guestContact', value || '');
                        }}
                        className={`w-full pl-10 pr-4 py-4 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${
                          fields.guestContact.error ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      Enter a valid Philippine mobile number (e.g., +63 912 345 6789 or 0912 345 6789)
                    </p>
                    {fields.guestContact.touched && fields.guestContact.error && (
                      <p className="text-red-600 text-sm mt-2">{fields.guestContact.error}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Include the same form sections as authenticated users */}
              {renderIncidentFormSections()}

              {/* Terms of Service and Privacy Policy notice - Only for guest users */}
              <div className="mt-6">
                <p className="text-gray-700 text-sm">
                  By submitting, you agree to our{' '}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-red-600 underline hover:text-red-500 bg-transparent border-none p-0 font-medium transition-colors duration-200"
                  >
                    terms of service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-red-600 underline hover:text-red-500 bg-transparent border-none p-0 font-medium transition-colors duration-200"
                  >
                    privacy policy
                  </button>
                  <span className="text-red-600">*</span>
                </p>
                {termsError && <p className="text-red-600 text-sm mt-1">{termsError}</p>}
              </div>

              {/* reCAPTCHA widget - Only for guest users */}
              <div className="mt-6">
                <ReCAPTCHA
                  sitekey="6LfVgHUqAAAAAJtQJXShsLo2QbyGby2jquueTZYV"
                  onChange={onRecaptchaChange}
                  ref={recaptchaRef}
                />
                {recaptchaError && <p className="text-red-600 text-sm mt-1">{recaptchaError}</p>}
              </div>

              {/* Submit Section */}
              <div className="border-t border-gray-200 pt-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        {isRetrying ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Submitting Emergency Report...'}
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line mr-2"></i>
                        Submit Emergency Report
                      </>
                    )}
                  </Button>

                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TermsOfServiceModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyPolicyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      </div>
    );

  // Conditionally render based on authentication status
  if (!isAuthenticated) {
    return renderGuestForm();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-100">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-orange-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.05) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Enhanced Icon */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-error-warning-line text-3xl text-white"></i>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-red-900 to-orange-900 bg-clip-text text-transparent mb-6 leading-tight">
              Report an Incident
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Emergency Incident Reporting System
              <span className="block text-lg text-gray-500 mt-2">Please provide detailed information about the incident</span>
            </p>

            {/* Enhanced Info Banner */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/50 rounded-2xl p-6 max-w-3xl mx-auto shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-center text-red-800">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <i className="ri-information-line text-red-600"></i>
                </div>
                <p className="font-semibold text-lg">
                  Your report helps us respond quickly to emergencies
                </p>
              </div>
              <p className="text-red-600 text-sm mt-2 opacity-80">
                All reports are treated with urgency and confidentiality
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-4xl mx-auto">



          {/* Enhanced Incident Report Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Include the same form sections as authenticated users */}
              {renderIncidentFormSections()}

              {/* Clear Button - Show if form has data */}
              {hasFormData && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={clearFormData}
                    className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <i className="ri-delete-bin-line"></i>
                    Clear Form Data
                  </button>
                </div>
              )}

              {/* Submit Section */}
              <div className="border-t border-gray-200 pt-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2"></i>
                        {isRetrying ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Submitting Emergency Report...'}
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line mr-2"></i>
                        Submit Emergency Report
                      </>
                    )}
                  </Button>
                  <Link
                    to="/"
                    className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 font-semibold text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <i className="ri-arrow-left-line mr-2"></i>
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TermsOfServiceModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyPolicyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </div>
  );
}
