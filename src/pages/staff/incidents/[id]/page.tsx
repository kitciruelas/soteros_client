import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuthState } from '../../../../utils/auth';
import { incidentsApi } from '../../../../utils/api';

interface Incident {
  incident_id: number;
  incident_type: string;
  description: string;
  longitude: number;
  latitude: number;
  location?: string;
  date_reported: string;
  status: string;
  reporter_safe_status: string;
  validation_status: string;
  assigned_team_name?: string;
  assigned_staff_name?: string;
  assigned_team_ids?: string;
  all_assigned_teams?: string;
  reporter_name?: string;
  reporter_phone?: string;
  reporter_type?: 'guest' | 'user';
  guest_name?: string;
  guest_id?: number;
  guest_contact?: string;
  assignment_type?: 'individual' | 'team' | 'teams' | 'unknown';
  remarks?: string;
  attachment?: string;
  date_resolved?: string;
  resolvedLocation?: string;
}

const StaffIncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  const [locationCache, setLocationCache] = useState<{ [key: string]: string }>({});

  const authState = getAuthState();
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id;

  useEffect(() => {
    if (id && currentStaffId) {
      fetchIncident();
    }
  }, [id, currentStaffId]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching incident details for staff:', id);

      const response = await incidentsApi.getIncidentById(Number(id));

      if (response.success && response.incident) {
        const incidentData = response.incident;

        // Backend already handles permission checks, so we can trust the response
        // If we got here, the staff member has permission to view this incident
        
        // Geocode location
        if (incidentData.latitude && incidentData.longitude) {
          const locationName = await getLocationName(incidentData.latitude, incidentData.longitude);
          setIncident({
            ...incidentData,
            resolvedLocation: locationName
          });
        } else {
          setIncident(incidentData);
        }
      } else {
        setError(response.message || 'Incident not found');
      }
    } catch (err: any) {
      console.error('Error fetching incident:', err);
      // Handle permission errors from backend (403)
      if (err?.status === 403 || err?.message?.includes('permission')) {
        setError(err.message || 'You do not have permission to view this incident');
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('Failed to load incident details');
      }
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = async (latitude: number | string, longitude: number | string): Promise<string> => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const cacheKey = `${lat},${lng}`;

    if (!lat || !lng) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Check cache first
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }

    setGeocodingInProgress(true);

    try {
      // Use backend proxy for geocoding
      const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://soteros-backend-q2yihjhchq-et.a.run.app/api');
      const token = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo') || '{}').token : null;
      
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `${API_BASE_URL}/geocoding/reverse?lat=${lat}&lon=${lng}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const locationName = data.data;
          setLocationCache((prev) => ({ ...prev, [cacheKey]: locationName }));
          setLocationName(locationName);
          return locationName;
        }
      }
    } catch (error) {
      console.error('Error geocoding coordinates:', error);
    } finally {
      setGeocodingInProgress(false);
    }

    // Fallback to coordinates
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setLocationName(fallback);
    return fallback;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getIncidentTypeText = (incidentType: string) => {
    return incidentType.toUpperCase();
  };

  const getAssignmentBadge = (incident: Incident) => {
    const assignmentType = incident.assignment_type;
    if (assignmentType === 'individual') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
          Individual
        </span>
      );
    } else if (assignmentType === 'teams') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
          Multiple Teams
        </span>
      );
    } else if (assignmentType === 'team') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
          Team
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <i className="ri-error-warning-line mx-auto text-5xl text-red-500 mb-4"></i>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error || 'Incident not found'}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/staff/incidents')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Back to My Incidents
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/staff/incidents')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Back
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Incident Details</h1>
              <p className="text-sm text-gray-600 mt-1">View incident information and details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Incident Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4 sm:py-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-alert-line text-lg sm:text-xl"></i>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Incident #{incident.incident_id}</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1">{getIncidentTypeText(incident.incident_type)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getAssignmentBadge(incident)}
                <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-full border ${getStatusColor(incident.status)}`}>
                  {getStatusText(incident.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 md:p-8 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Left Column */}
              <div className="space-y-4 sm:space-y-5">
                {/* Description */}
                <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-file-text-line text-blue-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Description</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base pl-14">{incident.description}</p>
                </div>

                {/* Location */}
                <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-map-pin-line text-red-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Location</h3>
                  </div>
                  <div className="pl-14">
                    <p className="text-gray-800 mb-2 text-sm sm:text-base font-medium break-words">
                      {geocodingInProgress ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                          <span className="text-gray-500">Loading location...</span>
                        </div>
                      ) : (
                        incident.resolvedLocation || locationName || incident.location || `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`
                      )}
                    </p>
                    {(incident.resolvedLocation || locationName) && (
                      <div className="mt-2 p-2 bg-gray-100 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 font-mono break-all">
                          <span className="font-semibold">Coordinates:</span> {Number(incident.latitude).toFixed(4)}, {Number(incident.longitude).toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment */}
                <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-team-line text-green-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Assignment</h3>
                  </div>
                  <div className="pl-14 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getAssignmentBadge(incident)}
                    </div>
                    {incident.all_assigned_teams ? (
                      <div className="flex flex-col space-y-1 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Multiple Teams</span>
                        <span className="text-sm font-medium text-gray-800 break-words">
                          {incident.all_assigned_teams}
                        </span>
                      </div>
                    ) : incident.assigned_team_name ? (
                      <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <i className="ri-team-line text-blue-600"></i>
                        <span className="text-sm font-medium text-gray-800 break-words">
                          {incident.assigned_team_name}
                        </span>
                      </div>
                    ) : null}
                    {incident.assigned_staff_name && (
                      <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
                        <i className="ri-user-line text-purple-600"></i>
                        <span className="text-sm font-medium text-gray-800 break-words">
                          {incident.assigned_staff_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4 sm:space-y-5">
                {/* Status */}
                <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-time-line text-purple-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Status</h3>
                  </div>
                  <div className="pl-14">
                    <span className={`inline-flex px-3 py-1.5 text-sm font-bold rounded-full border ${getStatusColor(incident.status)}`}>
                      {getStatusText(incident.status)}
                    </span>
                  </div>
                </div>

                {/* Reporter */}
                <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-user-line text-indigo-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Reporter</h3>
                  </div>
                  <div className="pl-14">
                    {incident.reporter_type === "guest" ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="ri-user-line text-indigo-600"></i>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {incident.guest_name || "Unknown Guest"}
                            </div>
                            <div className="text-xs text-indigo-600 font-medium">Guest Reporter</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Guest ID</div>
                            <div className="text-sm font-medium text-gray-900">{incident.guest_id || "N/A"}</div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Incident ID</div>
                            <div className="text-sm font-medium text-gray-900">#{incident.incident_id}</div>
                          </div>
                          <div className="col-span-2 bg-gray-50 p-2 rounded-lg">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</div>
                            <div className="text-sm font-medium text-gray-900 break-all">
                              {incident.guest_contact || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="ri-user-line text-indigo-600"></i>
                          </div>
                          <div className="text-gray-800 font-bold text-base">
                            {incident.reporter_name || "Unknown Reporter"}
                          </div>
                        </div>
                        {incident.reporter_phone && (
                          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <i className="ri-phone-line text-gray-600"></i>
                            <span className="text-sm font-medium text-gray-700 break-all">
                              {incident.reporter_phone}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-calendar-line text-gray-600 text-lg"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg">Timeline</h3>
                  </div>
                  <div className="pl-14 space-y-3">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <span className="text-sm font-medium text-gray-600">Reported:</span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Date(incident.date_reported).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Time:</span>
                      <span className="text-sm font-bold text-gray-900">
                        {new Date(incident.date_reported).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {incident.date_resolved && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100 pt-3 border-t-2 border-green-200">
                        <span className="text-sm font-medium text-gray-600">Resolved:</span>
                        <span className="text-sm font-bold text-green-700">
                          {new Date(incident.date_resolved).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {incident.remarks && (
              <div className="bg-white rounded-xl p-4 md:p-5 mt-4 md:mt-6 shadow-sm border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-chat-1-line text-blue-600 text-lg"></i>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg">Staff Remarks</h3>
                </div>
                <div className="pl-14">
                  <p className="text-gray-800 leading-relaxed text-sm sm:text-base whitespace-pre-wrap bg-white p-3 rounded-lg border border-blue-100">
                    {incident.remarks}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffIncidentDetails;
