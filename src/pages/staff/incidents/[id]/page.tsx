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
  date_reported: string;
  status: string;
  priority_level: string;
  reporter_safe_status: string;
  validation_status: string;
  assigned_team_name?: string;
  assigned_staff_name?: string;
  reporter_name?: string;
  assignment_type?: 'individual' | 'team' | 'unknown';
}

const StaffIncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);

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
      console.log('🔍 Fetching incident details for staff:', id);

      const response = await incidentsApi.getIncidentById(Number(id));

      if (response.success && response.incident) {
        const incidentData = response.incident;

        // Check if this incident is assigned to the current staff member
        const isAssignedToStaff = incidentData.assigned_staff_id === currentStaffId;
        const currentTeamId = authState.userData?.assigned_team_id;
        
        // Check both single and multiple team assignments
        let isAssignedToTeam = false;
        if (currentTeamId) {
          // Check single team assignment
          if (incidentData.assigned_team_id === currentTeamId) {
            isAssignedToTeam = true;
          }
          // Check multiple team assignments
          if (incidentData.assigned_team_ids) {
            const teamIds = incidentData.assigned_team_ids.split(',').map(id => Number(id.trim()));
            if (teamIds.includes(currentTeamId)) {
              isAssignedToTeam = true;
            }
          }
        }

        if (!isAssignedToStaff && !isAssignedToTeam) {
          setError('You do not have permission to view this incident');
          return;
        }

        setIncident(incidentData);

        // Geocode location
        if (incidentData.latitude && incidentData.longitude) {
          getLocationName(incidentData.latitude, incidentData.longitude);
        }
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

  const getLocationName = async (latitude: number | string, longitude: number | string): Promise<void> => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!lat || !lng) return;

    setGeocodingInProgress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.display_name) {
          const parts = data.display_name.split(', ');
          const locationName = parts.slice(0, 3).join(', ');
          setLocationName(locationName);
        }
      }
    } catch (error) {
      console.error('Error geocoding coordinates:', error);
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setGeocodingInProgress(false);
    }
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

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAssignmentBadge = (incident: Incident) => {
    if (incident.assignment_type === 'individual') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Individual</span>;
    } else if (incident.assignment_type === 'team') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Team</span>;
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/staff/incidents')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Back to My Incidents
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
                {getAssignmentBadge(incident)}
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Incident Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Incident Information</h3>
                  <div className="space-y-2">
                    <p><strong>Type:</strong> {incident.incident_type}</p>
                    <p><strong>Priority:</strong> {incident.priority_level}</p>
                    <p><strong>Status:</strong> {incident.status}</p>
                    <p><strong>Validation:</strong> {incident.validation_status}</p>
                    <p><strong>Reporter Safety:</strong> {incident.reporter_safe_status}</p>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
                    <i className="ri-map-pin-line mr-2"></i>
                    Location
                  </h4>
                  <div className="text-sm text-gray-600">
                    {geocodingInProgress ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                        <span>Loading location...</span>
                      </div>
                    ) : (
                      <p>{locationName || `${Number(incident.latitude).toFixed(4)}, ${Number(incident.longitude).toFixed(4)}`}</p>
                    )}
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

              {/* Assignment Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Information</h3>
                  <div className="space-y-2">
                    {incident.assigned_team_name && (
                      <p><strong>Assigned Team:</strong> {incident.assigned_team_name}</p>
                    )}
                    {incident.assigned_staff_name && (
                      <p><strong>Assigned Staff:</strong> {incident.assigned_staff_name}</p>
                    )}
                    {incident.reporter_name && (
                      <p><strong>Reported By:</strong> {incident.reporter_name}</p>
                    )}
                  </div>
                </div>

                {/* Assignment Type */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Assignment Type</h4>
                  <div className="flex items-center space-x-2">
                    {getAssignmentBadge(incident)}
                    <span className="text-sm text-gray-600">
                      {incident.assignment_type === 'individual' ? 'Directly assigned to you' :
                       incident.assignment_type === 'team' ? 'Assigned to your team' :
                       'Assignment type unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffIncidentDetails;
