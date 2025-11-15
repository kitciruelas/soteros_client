import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Incident {
  id: number;
  type: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  safetyStatus: 'safe' | 'at_risk' | 'injured' | 'unknown';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  validationStatus: 'unvalidated' | 'validated' | 'rejected';
  validationNotes?: string;
  reportedBy: string;
  reporterPhone?: string;
  assignedTo?: string;
  assignedTeamId?: number | null;
  assignedTeamName?: string;
  assignedStaffId?: number | null;
  assignedStaffName?: string;
  assignedTeamIds?: string;
  allAssignedTeams?: string;
  attachment?: string;
  dateReported: string;
  dateResolved?: string;
}

interface IncidentMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
}

// Custom marker icons based on priority and status
const createIncidentIcon = (priority: string, status: string) => {
  let color = '#6b7280'; // Default gray
  
  if (status === 'resolved' || status === 'closed') {
    color = '#059669'; // Green for resolved
  } else if (status === 'in_progress') {
    color = '#0891b2'; // Blue for in progress
  } else if (status === 'pending') {
    if (priority === 'critical') {
      color = '#be123c'; // Red for critical pending
    } else {
      color = '#f59e0b'; // Yellow for pending
    }
  }

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          color: white;
          font-weight: bold;
          font-size: 12px;
          transform: rotate(45deg);
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        ">!</div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Component to update map center when incident changes
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

const IncidentMapModal: React.FC<IncidentMapModalProps> = ({ isOpen, onClose, incident }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7565, 121.3851]); // Default to Rosario, Batangas
  const [mapZoom, setMapZoom] = useState(15);

  useEffect(() => {
    if (incident && incident.latitude && incident.longitude) {
      const center: [number, number] = [incident.latitude, incident.longitude];
      setMapCenter(center);
      setMapZoom(16); // Zoom in closer for individual incident
    }
  }, [incident]);

  if (!isOpen || !incident) {
    return null;
  }

  const getPriorityColor = (priority: Incident['priorityLevel']) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: Incident['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSafetyStatusColor = (status: Incident['safetyStatus']) => {
    switch (status) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'at_risk': return 'text-yellow-600 bg-yellow-100';
      case 'injured': return 'text-red-600 bg-red-100';
      case 'unknown': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Incident Location - #{incident.id}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {incident.type.toUpperCase()} • {incident.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Map Section */}
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              zoomControl={true}
            >
              <MapController center={mapCenter} zoom={mapZoom} />
              
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {/* Incident Marker */}
              <Marker
                position={[incident.latitude, incident.longitude]}
                icon={createIncidentIcon(incident.priorityLevel, incident.status)}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-gray-900">#{incident.id}</h4>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{incident.type.toUpperCase()}</p>
                    <p className="text-xs text-gray-600 mb-2">{incident.description}</p>
                    <div className="text-xs text-gray-500">
                      <div>Reported by: {incident.reportedBy}</div>
                      <div>Date: {new Date(incident.dateReported).toLocaleDateString()}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Map Controls Overlay */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-800">#{incident.id}</div>
                <div className="text-xs text-gray-600">Incident Location</div>
                <div className="text-xs text-gray-500 mt-1">
                  {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                </div>
              </div>
            </div>
          </div>

          {/* Incident Details Sidebar */}
          <div className="w-80 border-l border-gray-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Incident Overview */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Incident Details</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium text-gray-900">{incident.type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>
                      {incident.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Safety:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSafetyStatusColor(incident.safetyStatus)}`}>
                      {incident.safetyStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Location Information</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Address:</span>
                    <p className="text-sm text-gray-900 mt-1">{incident.location}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm text-gray-600">Latitude:</span>
                      <p className="text-sm font-mono text-gray-900">{incident.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Longitude:</span>
                      <p className="text-sm font-mono text-gray-900">{incident.longitude.toFixed(6)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Description</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {incident.description}
                </p>
              </div>

              {/* Reporter Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Reporter Information</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="text-sm text-gray-900">{incident.reportedBy}</p>
                  </div>
                  {incident.reporterPhone && (
                    <div>
                      <span className="text-sm text-gray-600">Phone:</span>
                      <p className="text-sm text-gray-900">{incident.reporterPhone}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-gray-600">Date Reported:</span>
                    <p className="text-sm text-gray-900">
                      {new Date(incident.dateReported).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assignment Information */}
              {(incident.assignedTeamName || incident.assignedStaffName || incident.allAssignedTeams) && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Assignment</h4>
                  <div className="space-y-2">
                    {incident.allAssignedTeams && (
                      <div>
                        <span className="text-sm text-gray-600">Teams:</span>
                        <p className="text-sm text-green-600 font-medium">{incident.allAssignedTeams}</p>
                      </div>
                    )}
                    {incident.assignedTeamName && !incident.allAssignedTeams && (
                      <div>
                        <span className="text-sm text-gray-600">Team:</span>
                        <p className="text-sm text-green-600 font-medium">{incident.assignedTeamName}</p>
                      </div>
                    )}
                    {incident.assignedStaffName && (
                      <div>
                        <span className="text-sm text-gray-600">Staff:</span>
                        <p className="text-sm text-purple-600 font-medium">{incident.assignedStaffName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Validation</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      incident.validationStatus === 'validated'
                        ? 'text-green-600 bg-green-100'
                        : incident.validationStatus === 'rejected'
                        ? 'text-red-600 bg-red-100'
                        : 'text-yellow-600 bg-yellow-100'
                    }`}>
                      {incident.validationStatus.charAt(0).toUpperCase() + incident.validationStatus.slice(1)}
                    </span>
                  </div>
                  {incident.validationNotes && (
                    <div>
                      <span className="text-sm text-gray-600">Notes:</span>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2 mt-1">
                        {incident.validationNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`;
                      window.open(url, '_blank');
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <i className="ri-external-link-line mr-2"></i>
                    Open in Google Maps
                  </button>
                  <button
                    onClick={() => {
                      const url = `https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}&zoom=16`;
                      window.open(url, '_blank');
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <i className="ri-map-line mr-2"></i>
                    Open in OpenStreetMap
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${incident.latitude}, ${incident.longitude}`);
                      // You could add a toast notification here
                    }}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    <i className="ri-clipboard-line mr-2"></i>
                    Copy Coordinates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentMapModal;
