import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { incidentsApi } from '../../../../../utils/api';
import IncidentMapModal from '../../../../../components/IncidentMapModal';

interface Incident {
  id: number;
  incident_id?: number;
  incident_type: string;
  type?: string;
  description: string;
  longitude: number;
  latitude: number;
  location?: string;
  date_reported: string;
  dateReported?: string;
  status: string;
  priority_level: string;
  priorityLevel?: string;
  reporter_safe_status: string;
  safetyStatus?: string;
  validation_status: string;
  validationStatus?: string;
  validationNotes?: string;
  assigned_team_name?: string;
  assignedTeamName?: string;
  assigned_staff_name?: string;
  assignedStaffName?: string;
  assignedTeamIds?: string;
  allAssignedTeams?: string;
  reporter_name?: string;
  reportedBy?: string;
  reporterPhone?: string;
  reporter_type?: 'user' | 'guest';
  guest_name?: string;
  guest_contact?: string;
  guest_id?: string;
  attachment?: string;
}

const ViewIncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    const fetchIncident = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await incidentsApi.getIncidentById(Number(id));
        
        if (response.success && response.incident) {
          const foundIncident = response.incident;
          
          // Transform to unified format
          const transformedIncident: Incident = {
            id: foundIncident.incident_id || foundIncident.id,
            incident_id: foundIncident.incident_id || foundIncident.id,
            incident_type: foundIncident.incident_type || foundIncident.type || '',
            type: foundIncident.incident_type || foundIncident.type || '',
            description: foundIncident.description || '',
            longitude: Number(foundIncident.longitude || 0),
            latitude: Number(foundIncident.latitude || 0),
            location: foundIncident.location || extractLocationFromDescription(foundIncident.description || ''),
            date_reported: foundIncident.date_reported || foundIncident.dateReported || '',
            dateReported: foundIncident.date_reported || foundIncident.dateReported || '',
            status: foundIncident.status || 'pending',
            priority_level: foundIncident.priority_level || foundIncident.priorityLevel || 'medium',
            priorityLevel: foundIncident.priority_level || foundIncident.priorityLevel || 'medium' as any,
            reporter_safe_status: foundIncident.reporter_safe_status || foundIncident.safetyStatus || 'unknown',
            safetyStatus: foundIncident.reporter_safe_status || foundIncident.safetyStatus || 'unknown' as any,
            validation_status: foundIncident.validation_status || foundIncident.validationStatus || 'unvalidated',
            validationStatus: foundIncident.validation_status || foundIncident.validationStatus || 'unvalidated' as any,
            validationNotes: foundIncident.validation_notes || foundIncident.validationNotes,
            assigned_team_name: foundIncident.assigned_team_name || foundIncident.assignedTeamName,
            assignedTeamName: foundIncident.assigned_team_name || foundIncident.assignedTeamName,
            assigned_staff_name: foundIncident.assigned_staff_name || foundIncident.assignedStaffName,
            assignedStaffName: foundIncident.assigned_staff_name || foundIncident.assignedStaffName,
              assignedTeamIds: foundIncident.assigned_team_ids || foundIncident.assignedTeamIds,
              allAssignedTeams: foundIncident.all_assigned_teams || foundIncident.allAssignedTeams,
              reporter_name: foundIncident.reporter_name || foundIncident.reportedBy,
              reportedBy: foundIncident.reporter_name || foundIncident.reportedBy || 'Unknown',
              reporterPhone: foundIncident.reporter_phone || foundIncident.reporterPhone,
              reporter_type: foundIncident.reporter_type || (foundIncident.reported_by ? 'user' : 'guest'),
              guest_name: foundIncident.guest_name,
              guest_contact: foundIncident.guest_contact,
              guest_id: foundIncident.guest_id,
              attachment: foundIncident.attachment
          };
          
          setIncident(transformedIncident);
        } else {
          setError('Incident not found');
        }
      } catch (err) {
        console.error('Error fetching incident:', err);
        setError('Failed to load incident details');
      } finally {
        setLoading(false);
      }
    };

    fetchIncident();
  }, [id]);

  const extractLocationFromDescription = (text: string): string => {
    if (!text) return 'Location not specified';
    const match = /Location:\s*([^\n]+)/i.exec(text);
    return match ? match[1].trim() : 'Location not specified';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIncidentTypeText = (incidentType: string) => {
    return incidentType.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <i className="ri-error-warning-line mx-auto text-5xl text-red-500"></i>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
              <p className="mt-1 text-sm text-gray-500">{error || 'Incident not found'}</p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/admin/incidents/view')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Back to Incidents
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/incidents/view')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Incidents
          </button>
        </div>

        {/* Incident Details Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                Incident #{incident.incident_id}
              </h1>
              <div className="flex space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                  {incident.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(incident.priority_level)}`}>
                  {incident.priority_level.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {/* Prominent Location Banner - Shows where the reporter reported from */}
            {incident.latitude && incident.longitude && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-2 border-blue-400 rounded-xl shadow-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-600 rounded-full p-3">
                    <i className="ri-map-pin-3-fill text-white text-2xl"></i>
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="text-base font-bold text-blue-900 mb-2 flex items-center">
                      📍 Incident Report Location
                    </h4>
                    <p className="text-sm text-blue-800 mb-3 leading-relaxed">
                      This is where the reporter was located when they reported this incident. The exact coordinates are shown below.
                    </p>
                    {incident.location && incident.location !== 'Location not specified' ? (
                      <div className="bg-white rounded-lg p-3 border border-blue-300 mb-2">
                        <p className="text-xs font-medium text-blue-600 mb-1 flex items-center">
                          <i className="ri-community-line mr-1"></i>
                          Reported Address:
                        </p>
                        <p className="text-sm font-bold text-gray-900">{incident.location}</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-3 border border-blue-300 mb-2">
                        <p className="text-xs font-medium text-blue-600 mb-1">GPS Coordinates:</p>
                        <p className="text-sm font-mono font-semibold text-gray-900">
                          {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium text-sm shadow-md hover:shadow-lg"
                    >
                      <i className="ri-map-2-line mr-2"></i>
                      View on Interactive Map
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Incident Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Incident Information</h3>
                  <div className="space-y-2">
                    <p><strong>Type:</strong> {getIncidentTypeText(incident.incident_type)}</p>
                    <p><strong>Priority:</strong> {incident.priority_level}</p>
                    <p><strong>Status:</strong> {incident.status}</p>
                    <p><strong>Validation:</strong> {incident.validation_status}</p>
                    <p><strong>Reporter Safety:</strong> {incident.reporter_safe_status}</p>
                  </div>
                </div>

                {/* Incident Location - Where the reporter reported from */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <i className="ri-map-pin-line mr-2 text-blue-600"></i>
                    Incident Location
                    <span className="ml-2 text-xs text-gray-500 font-normal">(Where incident was reported)</span>
                  </h4>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 space-y-3 border-2 border-blue-300 shadow-sm">
                    {incident.location && incident.location !== 'Location not specified' && (
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                          <i className="ri-community-line mr-1"></i>
                          Reported Location:
                        </p>
                        <p className="text-sm font-semibold text-gray-900 leading-relaxed">{incident.location}</p>
                      </div>
                    )}
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                        <i className="ri-map-2-line mr-1"></i>
                        GPS Coordinates:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Latitude:</p>
                          <p className="text-sm font-mono text-gray-900 font-semibold">{incident.latitude.toFixed(6)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Longitude:</p>
                          <p className="text-sm font-mono text-gray-900 font-semibold">{incident.longitude.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center font-medium"
                    >
                      <i className="ri-map-pin-3-line mr-2 text-lg"></i>
                      View Location on Map
                    </button>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`;
                          window.open(url, '_blank');
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center border border-blue-300 shadow-sm hover:shadow"
                        title="Open in Google Maps"
                      >
                        <i className="ri-external-link-line mr-1"></i>
                        Google Maps
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${incident.latitude}, ${incident.longitude}`);
                          alert('Coordinates copied to clipboard!');
                        }}
                        className="flex-1 px-3 py-2 text-xs bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-center border border-blue-300 shadow-sm hover:shadow"
                        title="Copy coordinates"
                      >
                        <i className="ri-clipboard-line mr-1"></i>
                        Copy Coords
                      </button>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
                    <i className="ri-time-line mr-2"></i>
                    Reported
                  </h4>
                  <p className="text-sm text-gray-600">
                    {new Date(incident.date_reported).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Reporter Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <i className="ri-user-line mr-2 text-indigo-600"></i>
                    Reporter Information
                    <span className="ml-2 text-xs text-gray-500 font-normal">(Who reported this)</span>
                  </h3>
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                    {incident.reporter_type === 'guest' ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="ri-user-line text-indigo-600 text-xl"></i>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {incident.guest_name || 'Unknown Guest'}
                            </div>
                            <div className="text-xs text-indigo-600 font-medium mt-1">
                              <span className="px-2 py-1 bg-indigo-100 rounded-full">Guest Reporter</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 pt-3 border-t border-indigo-200">
                          {incident.guest_contact && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                                <i className="ri-phone-line mr-1"></i>
                                Contact Number
                              </p>
                              <p className="text-sm text-gray-900 font-medium">{incident.guest_contact}</p>
                            </div>
                          )}
                          {incident.guest_id && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                                <i className="ri-id-card-line mr-1"></i>
                                Guest ID
                              </p>
                              <p className="text-sm text-gray-900 font-mono">{incident.guest_id}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="ri-user-star-line text-blue-600 text-xl"></i>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {incident.reporter_name || incident.reportedBy || 'Unknown User'}
                            </div>
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              <span className="px-2 py-1 bg-blue-100 rounded-full">Registered User</span>
                            </div>
                          </div>
                        </div>
                        {incident.reporterPhone && (
                          <div className="pt-3 border-t border-blue-200">
                            <p className="text-xs font-medium text-gray-600 mb-1 flex items-center">
                              <i className="ri-phone-line mr-1"></i>
                              Contact Number
                            </p>
                            <p className="text-sm text-gray-900 font-medium">{incident.reporterPhone}</p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-indigo-200">
                      <p className="text-xs text-gray-500">
                        <i className="ri-time-line mr-1"></i>
                        Reported: {new Date(incident.date_reported || incident.dateReported || Date.now()).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                    <i className="ri-team-line mr-2 text-green-600"></i>
                    Assignment Information
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="space-y-2">
                      {incident.allAssignedTeams ? (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Assigned Teams:</p>
                          <p className="text-sm text-green-700 font-semibold">{incident.allAssignedTeams}</p>
                        </div>
                      ) : incident.assigned_team_name ? (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">Assigned Team:</p>
                          <p className="text-sm text-green-700 font-semibold">{incident.assigned_team_name}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No team assigned</p>
                      )}
                      {incident.assigned_staff_name && (
                        <div className="mt-2 pt-2 border-t border-green-200">
                          <p className="text-xs font-medium text-gray-600 mb-1">Assigned Staff:</p>
                          <p className="text-sm text-purple-700 font-semibold">{incident.assigned_staff_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                <i className="ri-file-text-line mr-2"></i>
                Description
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{incident.description}</p>
              </div>
            </div>

            {/* Additional Information Card */}
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <i className="ri-information-line mr-2 text-blue-600"></i>
                Additional Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Validation Status:</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    incident.validation_status === 'validated' || incident.validationStatus === 'validated'
                      ? 'bg-green-100 text-green-800'
                      : incident.validation_status === 'rejected' || incident.validationStatus === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {(incident.validation_status || incident.validationStatus || 'unvalidated').toUpperCase().replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Reporter Safety:</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    incident.reporter_safe_status === 'safe' || incident.safetyStatus === 'safe'
                      ? 'bg-green-100 text-green-800'
                      : incident.reporter_safe_status === 'injured' || incident.safetyStatus === 'injured'
                      ? 'bg-red-100 text-red-800'
                      : incident.reporter_safe_status === 'at_risk' || incident.safetyStatus === 'at_risk'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(incident.reporter_safe_status || incident.safetyStatus || 'unknown').toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>
              {incident.validationNotes && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Validation Notes:</p>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700">{incident.validationNotes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Modal */}
      {incident && (
        <IncidentMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          incident={{
            id: incident.id || incident.incident_id || 0,
            type: incident.type || incident.incident_type || '',
            description: incident.description,
            location: incident.location || 'Location not specified',
            latitude: incident.latitude,
            longitude: incident.longitude,
            priorityLevel: (incident.priorityLevel || incident.priority_level || 'medium') as any,
            safetyStatus: (incident.safetyStatus || incident.reporter_safe_status || 'unknown') as any,
            status: (incident.status || 'pending') as any,
            validationStatus: (incident.validationStatus || incident.validation_status || 'unvalidated') as any,
            validationNotes: incident.validationNotes,
            reportedBy: incident.reportedBy || incident.reporter_name || 'Unknown',
            reporterPhone: incident.reporterPhone,
            assignedTeamName: incident.assignedTeamName || incident.assigned_team_name,
            assignedStaffName: incident.assignedStaffName || incident.assigned_staff_name,
            assignedTeamIds: incident.assignedTeamIds,
            allAssignedTeams: incident.allAssignedTeams,
            dateReported: incident.dateReported || incident.date_reported
          }}
        />
      )}
    </div>
  );
};

export default ViewIncidentDetails;
