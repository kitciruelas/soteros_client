import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
}

const ViewIncidentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIncident = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await axios.get(`/api/incidents/${id}`);
        if (response.data.success) {
          setIncident(response.data.incident);
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

                {/* Location */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
                    <i className="ri-map-pin-line mr-2"></i>
                    Location
                  </h4>
                  <p className="text-sm text-gray-600">
                    Coordinates: {incident.latitude}, {incident.longitude}
                  </p>
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

export default ViewIncidentDetails;
