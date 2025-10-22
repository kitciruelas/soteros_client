
import { getAuthState } from '../../../../utils/auth';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentsApi } from '../../../../utils/api';

import { optimizedGeocoding } from '../../../../utils/optimizedGeocoding';

import IncidentMap from '../../../../components/IncidentMapWithHeatmap';

interface Incident {
  incident_id: number;
  incident_type: string;
  description: string;
  location: string;
  latitude: number | string;
  longitude: number | string;
  priority_level: string;
  reporter_safe_status: string;
  status: string;
  reported_by: string | null;
  reporter_name: string;
  reporter_phone?: string;
  guest_name?: string;
  guest_id?: number;
  guest_contact?: string;
  reporter_type?: 'guest' | 'user';
  attachment?: string | null;
  assigned_team_id?: number | null;
  assigned_team_name?: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  date_reported: string;
  date_resolved?: string;
  assignment_type?: 'individual' | 'team' | 'unknown';
  resolvedLocation?: string;
}

const StaffIncidentsMapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [locationCache, setLocationCache] = useState<{[key: string]: string}>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authState = getAuthState();
  const currentStaffId = authState.userData?.id || authState.userData?.staff_id || authState.userData?.user_id;

  // Fetch incidents data when component mounts
  useEffect(() => {
    const fetchIncidents = async () => {
      if (!currentStaffId) {
        setError('No staff ID found. Please log in again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const staffId = Number(currentStaffId);
        const response = await incidentsApi.getStaffIncidents(staffId);

        if (response.success) {
          setIncidents(response.incidents || []);
        } else {
          setError('Failed to fetch incidents');
        }
      } catch (err) {
        console.error('Error fetching incidents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, [currentStaffId]);

  const fetchIncidents = async () => {
    try {
      console.log('🔍 Fetching incidents for staff ID:', currentStaffId);

      if (!currentStaffId) {
        console.error('❌ No staff ID available');
        return;
      }
      const response = await incidentsApi.getStaffIncidents(Number(currentStaffId));

      if (response.success && response.incidents) {
        console.log('📋 Staff incidents response:', response);

        // Geocode locations for each incident
        const incidentsWithLocations = await Promise.all(
          response.incidents.map(async (incident: any) => {
            try {
              const locationName = await getLocationName(incident.latitude, incident.longitude);
              return {
                ...incident,
                resolvedLocation: locationName
              };
            } catch (error) {
              console.error('Error geocoding incident location:', error);
              return {
                ...incident,
                resolvedLocation: `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`
              };
            }
          })
        );

        setIncidents(incidentsWithLocations);
      } else {
        console.error('Failed to fetch staff incidents: Unknown error');
        alert('Failed to load incidents: Unknown error');
      }
    } catch (error) {
      console.error('Error fetching staff incidents:', error);
      alert('An error occurred while loading incidents. Please try again later.');
    }
  };

  // Geocoding function to convert coordinates to location names
  const getLocationName = async (latitude: number | string, longitude: number | string): Promise<string> => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const cacheKey = `${lat},${lng}`;

    // Check cache first
    if (locationCache[cacheKey]) {
      return locationCache[cacheKey];
    }

    // Set geocoding in progress
    setGeocodingInProgress(prev => ({ ...prev, [cacheKey]: true }));

    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      );

      if (response.ok) {
        const data = await response.json();

        // Extract location name from response
        let locationName = '';

        if (data.display_name) {
          // Parse the display_name to get a more readable format
          const parts = data.display_name.split(', ');
          // Take the first 3 parts for a concise location name
          locationName = parts.slice(0, 3).join(', ');
        } else if (data.address) {
          // Fallback to address components
          const address = data.address;
          if (address.road && address.city) {
            locationName = `${address.road}, ${address.city}`;
          } else if (address.city) {
            locationName = address.city;
          } else if (address.town) {
            locationName = address.town;
          } else if (address.village) {
            locationName = address.village;
          } else {
            locationName = 'Unknown Location';
          }
        } else {
          locationName = 'Unknown Location';
        }

        // Cache the result
        setLocationCache(prev => ({
          ...prev,
          [cacheKey]: locationName
        }));

        return locationName;
      }
    } catch (error) {
      console.error('Error geocoding coordinates:', error);
    } finally {
      // Clear geocoding in progress
      setGeocodingInProgress(prev => ({ ...prev, [cacheKey]: false }));
    }

    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowIncidentModal(true);
  };

  const closeIncidentModal = () => {
    setShowIncidentModal(false);
    setSelectedIncident(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Incident Map
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                View incidents assigned to you or your team on the map
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/staff/incidents"
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <i className="ri-list-unordered mr-2"></i>
                List View
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="">
          <div className="p-6">
            <IncidentMap
              incidents={incidents}
              onIncidentClick={handleIncidentClick}
              height="calc(100vh - 220px)"
              showUserLocation={false}
            />
          </div>
        </div>

      </div>

      {/* Incident Detail Modal */}
      {showIncidentModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <i className="ri-alert-line text-xl"></i>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Incident #{selectedIncident.incident_id}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {selectedIncident.incident_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeIncidentModal}
                  className="text-white hover:text-blue-100 transition-colors p-2 rounded-lg hover:bg-white hover:bg-opacity-20"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Description */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-file-text-line text-blue-600"></i>
                      <h3 className="font-semibold text-gray-900">Description</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedIncident.description}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-map-pin-line text-red-600"></i>
                      <h3 className="font-semibold text-gray-900">Location</h3>
                    </div>
                    <p className="text-gray-700 mb-2">
                      {selectedIncident.resolvedLocation || selectedIncident.location}
                    </p>
                    {selectedIncident.resolvedLocation && selectedIncident.resolvedLocation !== selectedIncident.location && (
                      <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Coordinates: {Number(selectedIncident.latitude).toFixed(4)}, {Number(selectedIncident.longitude).toFixed(4)}
                      </p>
                    )}
                  </div>

                  {/* Assignment */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-team-line text-green-600"></i>
                      <h3 className="font-semibold text-gray-900">Assignment</h3>
                    </div>
                    <div className="flex items-center space-x-3">
                      {selectedIncident.assigned_team_name && (
                        <div className="flex items-center space-x-1">
                          <i className="ri-team-line text-gray-400"></i>
                          <span className="text-sm text-gray-700">{selectedIncident.assigned_team_name}</span>
                        </div>
                      )}
                      {selectedIncident.assigned_staff_name && (
                        <div className="flex items-center space-x-1">
                          <i className="ri-user-line text-gray-400"></i>
                          <span className="text-sm text-gray-700">{selectedIncident.assigned_staff_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Priority & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <i className="ri-flag-line text-orange-600"></i>
                        <h3 className="font-semibold text-gray-900">Priority</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${
                        selectedIncident.priority_level === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                        selectedIncident.priority_level === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                        selectedIncident.priority_level === 'moderate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {selectedIncident.priority_level.charAt(0).toUpperCase() + selectedIncident.priority_level.slice(1)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <i className="ri-time-line text-purple-600"></i>
                        <h3 className="font-semibold text-gray-900">Status</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${
                        selectedIncident.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        selectedIncident.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        selectedIncident.status === 'resolved' ? 'bg-green-100 text-green-800 border-green-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {selectedIncident.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-user-line text-indigo-600"></i>
                      <h3 className="font-semibold text-gray-900">Reporter</h3>
                    </div>
                    {selectedIncident.reporter_type === 'guest' ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <i className="ri-user-line text-indigo-600 text-sm"></i>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{selectedIncident.guest_name || 'Unknown Guest'}</div>
                            <div className="text-xs text-gray-500">Guest Reporter</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200">
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Guest ID</div>
                            <div className="text-sm text-gray-900">{selectedIncident.guest_id || 'N/A'}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</div>
                            <div className="text-sm text-gray-900">{selectedIncident.guest_contact || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <i className="ri-user-line text-indigo-600 text-sm"></i>
                          </div>
                          <div className="text-gray-700 font-medium">{selectedIncident.reporter_name}</div>
                        </div>
                        {selectedIncident.reporter_phone && (
                          <div className="text-sm text-gray-500 pl-10">📞 {selectedIncident.reporter_phone}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-calendar-line text-gray-600"></i>
                      <h3 className="font-semibold text-gray-900">Timeline</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Reported:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedIncident.date_reported).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Time:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(selectedIncident.date_reported).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      {selectedIncident.date_resolved && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-sm text-gray-600">Resolved:</span>
                          <span className="text-sm font-medium text-green-600">
                            {new Date(selectedIncident.date_resolved).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selectedIncident.attachment && (
                <div className="bg-gray-50 rounded-lg p-4 mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Attachments</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedIncident.attachment.split(',').map((filename, index) => {
                      const url = `/uploads/incidents/${filename.trim()}`;
                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border border-gray-300 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <img
                            src={url}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/images/placeholder-image.png';
                            }}
                          />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <Link
                  to={`/staff/incidents/${selectedIncident.incident_id}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <i className="ri-external-link-line mr-2"></i>
                  View Full Details
                </Link>
                <button
                  onClick={closeIncidentModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <i className="ri-close-line mr-2"></i>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffIncidentsMapPage;
