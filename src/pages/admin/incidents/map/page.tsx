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
  am_name?: string;
  assigned_staff_id?: number | null;
  assigned_staff_name?: string;
  assigned_team_id?: number | null;
  assigned_team_name?: string;
  date_reported: string;
  date_resolved?: string;
  assignment_type?: 'individual' | 'team' | 'unknown';
  resolvedLocation?: string;
  validation_status?: 'validated' | 'rejected' | 'unvalidated';
}

const AdminIncidentsMapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [locationCache, setLocationCache] = useState<{[key: string]: string}>({});
  const [geocodingInProgress, setGeocodingInProgress] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      setError(null);
      console.log('🔍 Fetching all incidents for admin');

      const response = await incidentsApi.getIncidents();

      if (response.success && response.incidents) {
        console.log('📋 Admin incidents response:', response);
        console.log('📊 Total incidents received:', response.incidents.length);

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

        console.log('✅ Incidents with locations:', incidentsWithLocations);
        setIncidents(incidentsWithLocations);
      } else {
        console.warn('❌ No incidents received or response not successful:', response);
        setIncidents([]);
      }
    } catch (error) {
      console.error('❌ Error fetching admin incidents:', error);
      setError('An error occurred while loading incidents. Please try again later.');
      setIncidents([]);
    }
  };

  // Geocoding function to convert coordinates to location names using optimized service
  const getLocationName = async (latitude: number | string, longitude: number | string): Promise<string> => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    try {
      const locationName = await optimizedGeocoding.getLocationName(lat, lng);
      return locationName;
    } catch (error) {
      console.error('Error geocoding coordinates:', error);
      // Fallback to coordinates if geocoding fails
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident);
    setShowIncidentModal(true);
  };

  const closeIncidentModal = () => {
    setShowIncidentModal(false);
    setSelectedIncident(null);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'unvalidated': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 text-red-800 p-4 rounded-lg max-w-md">
            <i className="ri-error-warning-line text-2xl mb-2"></i>
            <p className="font-semibold">Error Loading Incidents</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchIncidents}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-refresh-line mr-2"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      

            {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Map</h1>
          <p className="text-gray-600 mt-1">View all incidents across the system on the interactive map
</p>
        </div>
        <div className="flex items-center space-x-3">
          
          
        </div>
      </div>

      {/* Map Container */}
      <div className="">
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
                      {!selectedIncident.assigned_team_name && !selectedIncident.assigned_staff_name && (
                        <span className="text-sm text-gray-500 italic">Not assigned</span>
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
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(selectedIncident.priority_level)}`}>
                        {selectedIncident.priority_level.charAt(0).toUpperCase() + selectedIncident.priority_level.slice(1)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <i className="ri-time-line text-purple-600"></i>
                        <h3 className="font-semibold text-gray-900">Status</h3>
                      </div>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(selectedIncident.status)}`}>
                        {selectedIncident.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>

                  {/* Validation Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <i className="ri-shield-check-line text-indigo-600"></i>
                      <h3 className="font-semibold text-gray-900">Validation</h3>
                    </div>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getValidationStatusColor(selectedIncident.validation_status || 'unvalidated')}`}>
                      {(selectedIncident.validation_status || 'unvalidated').charAt(0).toUpperCase() + (selectedIncident.validation_status || 'unvalidated').slice(1)}
                    </span>
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
                  to={`/admin/incidents/view/${selectedIncident.incident_id}`}
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

export default AdminIncidentsMapPage;
