import React, { useState, useEffect } from 'react';
import { alertsApi } from '../../../utils/api';
import { MapContainer, Marker, Circle, useMapEvents, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Alert } from '../../../types/alert';
import { ConfirmModal } from '../../../components/base/Modal';
import { useToast } from '../../../components/base/Toast';
import ExportUtils, { type ExportColumn } from '../../../utils/exportUtils';
import type { ExportOptions } from '../../../utils/exportUtils';
import ExportPreviewModal from '../../../components/base/ExportPreviewModal';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom alert marker icon
const alertMarkerIcon = L.divIcon({
  html: `
    <div style="
      background-color: #ef4444;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <i class="ri-alert-line" style="color: white; font-size: 10px;"></i>
    </div>
  `,
  className: 'alert-location-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

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

const AlertsManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<Alert>>({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    status: 'draft',
    recipients: [],
    latitude: null,
    longitude: null,
    radius_km: 5,
    location_text: ''
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editAlert, setEditAlert] = useState<Partial<Alert> | null>(null);
  const [barangaySearch, setBarangaySearch] = useState('');
  const [showBarangayDropdown, setShowBarangayDropdown] = useState(false);
  const [editBarangaySearch, setEditBarangaySearch] = useState('');
  const [showEditBarangayDropdown, setShowEditBarangayDropdown] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sendingAlertId, setSendingAlertId] = useState<number | null>(null);

  // Map-related state
  const [mapCenter] = useState<[number, number]>([13.845420, 121.206189

]); 
  const [mapZoom] = useState(13);

  const { showToast } = useToast();

  // Export functionality
  const exportColumns: ExportColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'type', label: 'Type' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    {
      key: 'created_at',
      label: 'Created Date',
      format: (value) => ExportUtils.formatDateTime(value)
    },
   
    {
      key: 'radius_km',
      label: 'Radius (km)',
      format: (value) => value ? `${value} km` : 'N/A'
    }
  ];

  const handleExport = (format: 'csv' | 'pdf' | 'json' | 'excel') => {
    if (!alerts.length) {
      showToast({ type: 'warning', message: 'No data to export' });
      return;
    }

    try {
      const options: ExportOptions = {
        filename: 'alerts_export',
        title: 'Alerts Management Report',
        includeTimestamp: true
      };

      switch (format) {
        case 'csv':
          ExportUtils.exportToCSV(alerts, exportColumns, options);
          break;
        case 'pdf':
          ExportUtils.exportToPDF(alerts, exportColumns, options);
          break;
        case 'json':
          ExportUtils.exportToJSON(alerts, options);
          break;
        case 'excel':
          ExportUtils.exportToExcel(alerts, exportColumns, options);
          break;
      }

      showToast({ type: 'success', message: `Data exported to ${format.toUpperCase()} successfully` });
    } catch (error) {
      console.error('Export failed:', error);
      showToast({ type: 'error', message: 'Export failed' });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Map click handler component for create modal
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        setNewAlert(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          location_text: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        }));
      },
    });
    return null;
  };

  // Map click handler component for edit modal
  const EditMapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        const latNum = Number(lat);
        const lngNum = Number(lng);
        setEditAlert(prev => prev ? ({
          ...prev,
          latitude: latNum,
          longitude: lngNum,
          location_text: `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`
        }) : null);
      },
    });
    return null;
  };

  // No need for reverse geocoding in this version

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await alertsApi.getAlerts();

      if (data.success) {
        // Transform backend data to match frontend interface
        const transformedAlerts = data.alerts.map((alert: any) => ({
          ...alert,
          // Map database fields to frontend interface
          title: alert.title || 'Untitled Alert',
          message: alert.message || alert.description || 'No description',
          type: alert.type || alert.alert_severity || 'info',
          status: alert.status || 'active',
          recipients: typeof alert.recipients === 'string'
            ? JSON.parse(alert.recipients)
            : alert.recipients || [],
          priority: alert.priority || 'medium',
        }));
        setAlerts(transformedAlerts);
      } else {
        console.error('Failed to fetch alerts:', data.message);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      if (!newAlert.title || !newAlert.message) {
        showToast({ type: 'warning', message: 'Please fill in all required fields' });
        return;
      }

      // Validate location if geographic alert
      if (newAlert.latitude && newAlert.longitude && !newAlert.radius_km) {
        showToast({ type: 'warning', message: 'Please specify alert radius' });
        return;
      }

      const alertData = {
        title: newAlert.title,
        message: newAlert.message,
        type: newAlert.type,
        priority: newAlert.priority,
        recipients: newAlert.recipients,
        send_immediately: false,
        // Geographic data
        latitude: newAlert.latitude,
        longitude: newAlert.longitude,
        radius_km: newAlert.radius_km,
        location_text: newAlert.location_text
      };

      const data = await alertsApi.createAlert(alertData);

      if (data.success) {
        // Refresh alerts list
        await fetchAlerts();
        setNewAlert({
          title: '',
          message: '',
          type: 'info',
          priority: 'medium',
          recipients: [],
          latitude: null,
          longitude: null,
          radius_km: 5,
          location_text: ''
        });
        setShowCreateModal(false);
        showToast({ type: 'success', message: 'Alert created successfully' });
      } else {
        showToast({ type: 'error', message: 'Failed to create alert' });
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      showToast({ type: 'error', message: 'Error creating alert' });
    }
  };

  const handleEditAlert = async () => {
    try {
      if (!editAlert || !editAlert.title || !editAlert.message) {
        showToast({ type: 'warning', message: 'Please fill in all required fields' });
        return;
      }

      // Validate location if geographic alert
      if (editAlert.latitude && editAlert.longitude && !editAlert.radius_km) {
        showToast({ type: 'warning', message: 'Please specify alert radius' });
        return;
      }

      const alertData = {
        title: editAlert.title,
        message: editAlert.message,
        type: editAlert.type,
        priority: editAlert.priority,
        recipients: editAlert.recipients,
        // Geographic data
        latitude: editAlert.latitude,
        longitude: editAlert.longitude,
        radius_km: editAlert.radius_km,
        location_text: editAlert.location_text
      };

      const data = await alertsApi.updateAlert(editAlert.id!, alertData);

      if (data.success) {
        // Refresh alerts list
        await fetchAlerts();
        setEditAlert(null);
        setShowEditModal(false);
        showToast({ type: 'success', message: 'Alert updated successfully' });
      } else {
        showToast({ type: 'error', message: 'Failed to update alert' });
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      showToast({ type: 'error', message: 'Error updating alert' });
    }
  };

  const handleSendAlert = async (alertId: number) => {
    try {
      setSendingAlertId(alertId);
      const data = await alertsApi.sendAlert(alertId);

      if (data.success) {
        // Refresh alerts list to get updated status
        await fetchAlerts();
        showToast({ type: 'success', message: 'Alert sent successfully' });
      } else {
        showToast({ type: 'error', message: 'Failed to send alert' });
      }
    } catch (error) {
      console.error('Error sending alert:', error);
      showToast({ type: 'error', message: 'Error sending alert' });
    } finally {
      setSendingAlertId(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertIdToDelete, setAlertIdToDelete] = useState<number | null>(null);

  const requestDeleteAlert = (alertId: number) => {
    setAlertIdToDelete(alertId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAlert = async () => {
    if (alertIdToDelete == null) return;
    try {
      const data = await alertsApi.deleteAlert(alertIdToDelete);
      if (data.success) {
        await fetchAlerts();
        showToast({ type: 'success', message: 'Alert deleted successfully' });
      } else {
        showToast({ type: 'error', message: 'Failed to delete alert' });
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      showToast({ type: 'error', message: 'Error deleting alert' });
    } finally {
      setShowDeleteConfirm(false);
      setAlertIdToDelete(null);
    }
  };

  const getAlertTypeColor = (type: Alert['type']) => {
    switch (type) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: Alert['status']) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter barangays based on search term
  const filteredBarangays = rosarioBarangays.filter(barangay =>
    barangay.name.toLowerCase().includes(barangaySearch.toLowerCase())
  );

  // Handle barangay selection
  const handleBarangayToggle = (barangayName: string) => {
    const currentRecipients = newAlert?.recipients || [];
    if (currentRecipients.includes(barangayName)) {
      setNewAlert(prev => ({
        ...prev,
        recipients: currentRecipients.filter(r => r !== barangayName)
      }));
    } else {
      setNewAlert(prev => ({
        ...prev,
        recipients: Array.from(new Set([...currentRecipients, barangayName]))
      }));
    }
  };

  // Get selected barangays count
  const selectedBarangaysCount = (newAlert?.recipients || []).filter(recipient =>
    rosarioBarangays.some(barangay => barangay.name === recipient)
  ).length;

  // Filter barangays for edit modal
  const filteredEditBarangays = rosarioBarangays.filter(barangay =>
    barangay.name.toLowerCase().includes(editBarangaySearch.toLowerCase())
  );

  // Handle barangay selection for edit modal
  const handleEditBarangayToggle = (barangayName: string) => {
    const currentRecipients = editAlert?.recipients || [];
    if (currentRecipients.includes(barangayName)) {
      setEditAlert(prev => prev ? ({
        ...prev,
        recipients: currentRecipients.filter(r => r !== barangayName)
      }) : null);
    } else {
      setEditAlert(prev => prev ? ({
        ...prev,
        recipients: Array.from(new Set([...currentRecipients, barangayName]))
      }) : null);
    }
  };

  // Get selected barangays count for edit modal
  const selectedEditBarangaysCount = (editAlert?.recipients || []).filter(recipient =>
    rosarioBarangays.some(barangay => barangay.name === recipient)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts Management</h1>
          <p className="text-gray-600 mt-1">Send emergency alerts and notifications via email</p>
        </div>
        <div className="flex items-center space-x-3">


          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="ri-add-line mr-2"></i>
            Create Alert
          </button>
                    <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            title="Export alerts data"
            disabled={!alerts.length}
          >
            <i className="ri-download-line mr-2"></i>
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-alarm-warning-line text-red-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Emergency Alerts</p>
              <p className="text-xl font-bold text-gray-900">
                {alerts.filter(a => a.type === 'emergency').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-error-warning-line text-yellow-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Warnings</p>
              <p className="text-xl font-bold text-gray-900">
                {alerts.filter(a => a.type === 'warning').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <i className="ri-mail-send-line text-green-600"></i>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sent Today</p>
              <p className="text-xl font-bold text-gray-900">
                {alerts.filter(a => a.sent_at && new Date(a.sent_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {alerts.map((alert) => (
            <div key={alert.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{alert.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getAlertTypeColor(alert.type)}`}>
                      {(alert.type || 'info').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}>
                      {(alert.status || 'active').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{alert.message}</p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>
                      <i className="ri-time-line mr-1"></i>
                      Created: {new Date(alert.created_at).toLocaleString()}
                    </span>
                    {alert.sent_at && (
                      <span>
                        <i className="ri-mail-send-line mr-1"></i>
                        Sent: {new Date(alert.sent_at).toLocaleString()}
                      </span>
                    )}
                
                    <span>
                      <i className="ri-flag-line mr-1"></i>
                      Priority: {alert.priority || 'medium'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {alert.status !== 'sent' && (
                    <button
                      onClick={() => handleSendAlert(alert.id)}
                      disabled={sendingAlertId === alert.id}
                      className={`px-3 py-1 text-white text-sm rounded-lg transition-colors flex items-center ${
                        sendingAlertId === alert.id 
                          ? 'bg-green-500 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {sendingAlertId === alert.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="ri-mail-send-line mr-1"></i>
                          Send
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!alert) return;
                      setEditAlert({
                        id: alert.id,
                        title: alert.title,
                        message: alert.message,
                        type: alert.type,
                        priority: alert.priority,
                        status: alert.status,
                        recipients: alert.recipients,
                        latitude: alert.latitude,
                        longitude: alert.longitude,
                        radius_km: alert.radius_km,
                        location_text: alert.location_text || ''
                      });
                      setShowEditModal(true);
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <i className="ri-edit-line mr-1"></i>
                    Edit
                  </button>
                  <button
                    onClick={() => requestDeleteAlert(alert.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <i className="ri-delete-bin-line mr-1"></i>
                  
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-alarm-warning-line text-blue-600 text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Create New Alert</h3>
                  <p className="text-sm text-gray-600">Send emergency notifications to targeted recipients</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                title="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  {/* Alert Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-text mr-1"></i>Alert Title *
                    </label>
                    <input
                      type="text"
                      value={newAlert.title}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter alert title"
                      required
                    />
                  </div>
                  {/* Alert Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-alert-line mr-1"></i>Alert Type *
                    </label>
                    <select
                      value={newAlert.type}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, type: e.target.value as Alert['type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  {/* Alert Severity (same as type for now) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-error-warning-line mr-1"></i>Alert Severity
                    </label>
                    <select
                      value={newAlert.type}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, type: e.target.value as Alert['type'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="info">Low - Information</option>
                      <option value="warning">Medium - Warning</option>
                      <option value="emergency">High - Emergency</option>
                    </select>
                  </div>
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-file-text-line mr-1"></i>Description *
                    </label>
                    <textarea
                      value={newAlert.message}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter detailed alert description"
                      required
                    />
                  </div>
                  {/* Location Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-map-pin-line mr-1"></i>Location
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newAlert.location_text}
                        onChange={(e) => setNewAlert(prev => ({ ...prev, location_text: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter location or click on map"
                      />
                      <div className="text-xs text-gray-500">
                        Click on the map to select a location, or enter coordinates manually
                      </div>
                    </div>
                  </div>
                  {/* Alert Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-focus-3-line mr-1"></i>Alert Radius (km)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={newAlert.radius_km}
                        onChange={(e) => setNewAlert(prev => ({ ...prev, radius_km: parseFloat(e.target.value) || 5 }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="5.0"
                      />
                      <span className="text-sm text-gray-500">kilometers</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Radius for geographic alert coverage (0.1 - 50 km)
                    </div>
                  </div>
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-flag-line mr-1"></i>Priority
                    </label>
                    <select
                      value={newAlert.priority || 'medium'}
                      onChange={(e) => setNewAlert(prev => ({ ...prev, priority: e.target.value as Alert['priority'] }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Right Column - Map */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-map-2-line mr-1"></i>Location Selection
                    </label>
                    <div className="text-xs text-gray-500 mb-3">
                      Click on the map below to select the alert location
                    </div>

                    {/* Map Container */}
                    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                      <MapContainer
                        center={newAlert?.latitude && newAlert?.longitude ? [newAlert.latitude, newAlert.longitude] : mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapClickHandler />

                        {/* Alert location marker */}
                        {newAlert?.latitude && newAlert?.longitude && (
                          <>
                            <Marker
                              position={[newAlert.latitude, newAlert.longitude]}
                              icon={alertMarkerIcon}
                            />
                            {/* Alert radius circle */}
                            <Circle
                              center={[newAlert.latitude, newAlert.longitude]}
                              radius={(newAlert.radius_km || 5) * 1000} // Convert km to meters
                              pathOptions={{
                                color: '#ef4444',
                                fillColor: '#ef4444',
                                fillOpacity: 0.1,
                                weight: 2,
                                dashArray: '5, 5'
                              }}
                            />
                          </>
                        )}
                      </MapContainer>
                    </div>

                    {/* Location Info */}
                    {newAlert?.latitude && newAlert?.longitude && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Selected Location:</strong>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Latitude: {newAlert.latitude.toFixed(6)}<br />
                          Longitude: {newAlert.longitude.toFixed(6)}<br />
                          Radius: {newAlert.radius_km || 5} km
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recipients Section */}
              <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 -mb-6 rounded-b-xl">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    <i className="ri-group-line mr-2 text-blue-600"></i>Target Recipients
                  </h4>
                  <p className="text-sm text-gray-600">Select the groups who should receive this alert</p>
                </div>

                {/* General Recipients */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(newAlert?.recipients || []).includes('all_users')}
                      onChange={(e) => {
                        const currentRecipients = newAlert?.recipients || [];
                        if (e.target.checked) {
                          setNewAlert(prev => ({ ...prev, recipients: Array.from(new Set([...currentRecipients, 'all_users'])) }));
                        } else {
                          setNewAlert(prev => ({ ...prev, recipients: currentRecipients.filter(r => r !== 'all_users') }));
                        }
                      }}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">All Registered Users</div>
                      <div className="text-sm text-gray-500">Send to all users in the system</div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(newAlert?.recipients || []).includes('emergency_responders')}
                      onChange={(e) => {
                        const currentRecipients = newAlert?.recipients || [];
                        if (e.target.checked) {
                          setNewAlert(prev => ({ ...prev, recipients: Array.from(new Set([...currentRecipients, 'emergency_responders'])) }));
                        } else {
                          setNewAlert(prev => ({ ...prev, recipients: currentRecipients.filter(r => r !== 'emergency_responders') }));
                        }
                      }}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Emergency Responders</div>
                      <div className="text-sm text-gray-500">Send to emergency response teams</div>
                    </div>
                  </label>

                  {/* Removed Nearby Users recipient option as per request */}
                </div>

                {/* Barangay Selection Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="ri-map-pin-line mr-1"></i>Select Barangays
                  </label>

                  {/* Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowBarangayDropdown(!showBarangayDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                    >
                      <span className="text-gray-700">
                        {selectedBarangaysCount > 0
                          ? `${selectedBarangaysCount} barangay${selectedBarangaysCount > 1 ? 's' : ''} selected`
                          : 'Select barangays...'
                        }
                      </span>
                      <i className={`ri-arrow-${showBarangayDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
                    </button>

                    {/* Dropdown Menu */}
                    {showBarangayDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input
                              type="text"
                              placeholder="Search barangays..."
                              value={barangaySearch}
                              onChange={(e) => setBarangaySearch(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        {/* Barangay Options */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredBarangays.length > 0 ? (
                            filteredBarangays.map((barangay, index) => (
                              <label
                                key={index}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={(newAlert?.recipients || []).includes(barangay.name)}
                                  onChange={() => handleBarangayToggle(barangay.name)}
                                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">{barangay.name}</div>
                                </div>
                              </label>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                              No barangays found
                            </div>
                          )}
                        </div>

                        {/* Footer with select all/clear all */}
                        <div className="border-t border-gray-200 p-2 flex justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              const allBarangayNames = rosarioBarangays.map(b => b.name);
                              setNewAlert(prev => ({
                                ...prev,
                                recipients: Array.from(new Set([...(prev?.recipients || []), ...allBarangayNames]))
                              }));
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const currentRecipients = newAlert?.recipients || [];
                              const barangayNames = rosarioBarangays.map(b => b.name);
                              setNewAlert(prev => ({
                                ...prev,
                                recipients: currentRecipients.filter(r => !barangayNames.includes(r))
                              }));
                            }}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Barangays Display */}
                  {selectedBarangaysCount > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(newAlert?.recipients || [])
                        .filter(recipient => rosarioBarangays.some(barangay => barangay.name === recipient))
                        .slice(0, 5)
                        .map((barangayName, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {barangayName}
                            <button
                              type="button"
                              onClick={() => handleBarangayToggle(barangayName)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))}
                      {selectedBarangaysCount > 5 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{selectedBarangaysCount - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {(newAlert?.recipients || []).length > 0 && (
                  <span>
                    <i className="ri-mail-line mr-1"></i>
                    {(newAlert?.recipients || []).length} recipient group(s) selected
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={!newAlert.title || !newAlert.message}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <i className="ri-add-line mr-2"></i>
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Alert Modal */}
      {showEditModal && editAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-edit-line text-blue-600 text-lg"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Alert</h3>
                  <p className="text-sm text-gray-600">Modify the alert details and settings</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                title="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  {/* Alert Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-text mr-1"></i>Alert Title *
                    </label>
                    <input
                      type="text"
                      value={editAlert?.title || ''}
                      onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter alert title"
                      required
                    />
                  </div>
                  {/* Alert Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-alert-line mr-1"></i>Alert Type *
                    </label>
                    <select
                      value={editAlert?.type || 'info'}
                      onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, type: e.target.value as Alert['type'] }) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  {/* Alert Severity (same as type for now) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-error-warning-line mr-1"></i>Alert Severity
                    </label>
                    <select
                      value={editAlert?.type || 'info'}
                      onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, type: e.target.value as Alert['type'] }) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="info">Low - Information</option>
                      <option value="warning">Medium - Warning</option>
                      <option value="emergency">High - Emergency</option>
                    </select>
                  </div>
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-file-text-line mr-1"></i>Description *
                    </label>
                    <textarea
                      value={editAlert?.message || ''}
                      onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, message: e.target.value }) : null)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter detailed alert description"
                      required
                    />
                  </div>
                  {/* Location Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-map-pin-line mr-1"></i>Location
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editAlert.location_text}
                        onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, location_text: e.target.value }) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter location or click on map"
                      />
                      <div className="text-xs text-gray-500">
                        Click on the map to select a location, or enter coordinates manually
                      </div>
                    </div>
                  </div>
                  {/* Alert Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-focus-3-line mr-1"></i>Alert Radius (km)
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={editAlert.radius_km}
                        onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, radius_km: parseFloat(e.target.value) || 5 }) : null)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="5.0"
                      />
                      <span className="text-sm text-gray-500">kilometers</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Radius for geographic alert coverage (0.1 - 50 km)
                    </div>
                  </div>
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-flag-line mr-1"></i>Priority
                    </label>
                    <select
                      value={editAlert.priority || 'medium'}
                      onChange={(e) => setEditAlert(prev => prev ? ({ ...prev, priority: e.target.value as Alert['priority'] }) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Right Column - Map */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <i className="ri-map-2-line mr-1"></i>Location Selection
                    </label>
                    <div className="text-xs text-gray-500 mb-3">
                      Click on the map below to select the alert location
                    </div>

                    {/* Map Container */}
                    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                      <MapContainer
                        center={editAlert?.latitude && editAlert?.longitude && typeof editAlert.latitude === 'number' && typeof editAlert.longitude === 'number' ? [editAlert.latitude, editAlert.longitude] : mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <EditMapClickHandler />

                        {/* Alert location marker */}
                        {editAlert?.latitude && editAlert?.longitude && typeof editAlert.latitude === 'number' && typeof editAlert.longitude === 'number' && (
                          <>
                            <Marker
                              position={[editAlert.latitude, editAlert.longitude]}
                              icon={alertMarkerIcon}
                            />
                            {/* Alert radius circle */}
                            <Circle
                              center={[editAlert.latitude, editAlert.longitude]}
                              radius={(editAlert.radius_km || 5) * 1000} // Convert km to meters
                              pathOptions={{
                                color: '#ef4444',
                                fillColor: '#ef4444',
                                fillOpacity: 0.1,
                                weight: 2,
                                dashArray: '5, 5'
                              }}
                            />
                          </>
                        )}
                      </MapContainer>
                    </div>

                    {/* Location Info */}
                    {editAlert?.latitude && editAlert?.longitude && typeof editAlert.latitude === 'number' && typeof editAlert.longitude === 'number' && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-800">
                          <strong>Selected Location:</strong>
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Latitude: {editAlert.latitude.toFixed(6)}<br />
                          Longitude: {editAlert.longitude.toFixed(6)}<br />
                          Radius: {editAlert.radius_km || 5} km
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recipients Section */}
              <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 -mb-6 rounded-b-xl">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    <i className="ri-group-line mr-2 text-blue-600"></i>Target Recipients
                  </h4>
                  <p className="text-sm text-gray-600">Select the groups who should receive this alert</p>
                </div>

                {/* General Recipients */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editAlert?.recipients || []).includes('all_users')}
                      onChange={(e) => {
                        const currentRecipients = editAlert?.recipients || [];
                        if (e.target.checked) {
                          setEditAlert(prev => prev ? ({ ...prev, recipients: Array.from(new Set([...currentRecipients, 'all_users'])) }) : null);
                        } else {
                          setEditAlert(prev => prev ? ({ ...prev, recipients: currentRecipients.filter(r => r !== 'all_users') }) : null);
                        }
                      }}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">All Registered Users</div>
                      <div className="text-sm text-gray-500">Send to all users in the system</div>
                    </div>
                  </label>

                  <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editAlert?.recipients || []).includes('emergency_responders')}
                      onChange={(e) => {
                        const currentRecipients = editAlert?.recipients || [];
                        if (e.target.checked) {
                          setEditAlert(prev => prev ? ({ ...prev, recipients: Array.from(new Set([...currentRecipients, 'emergency_responders'])) }) : null);
                        } else {
                          setEditAlert(prev => prev ? ({ ...prev, recipients: currentRecipients.filter(r => r !== 'emergency_responders') }) : null);
                        }
                      }}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Emergency Responders</div>
                      <div className="text-sm text-gray-500">Send to emergency response teams</div>
                    </div>
                  </label>

                  {/* Removed Nearby Users recipient option as per request */}
                </div>

                {/* Barangay Selection Dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <i className="ri-map-pin-line mr-1"></i>Select Barangays
                  </label>

                  {/* Dropdown Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEditBarangayDropdown(!showEditBarangayDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                    >
                      <span className="text-gray-700">
                        {selectedEditBarangaysCount > 0
                          ? `${selectedEditBarangaysCount} barangay${selectedEditBarangaysCount > 1 ? 's' : ''} selected`
                          : 'Select barangays...'
                        }
                      </span>
                      <i className={`ri-arrow-${showEditBarangayDropdown ? 'up' : 'down'}-s-line text-gray-400`}></i>
                    </button>

                    {/* Dropdown Menu */}
                    {showEditBarangayDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200">
                          <div className="relative">
                            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input
                              type="text"
                              placeholder="Search barangays..."
                              value={editBarangaySearch}
                              onChange={(e) => setEditBarangaySearch(e.target.value)}
                              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                          </div>
                        </div>

                        {/* Barangay Options */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredEditBarangays.length > 0 ? (
                            filteredEditBarangays.map((barangay, index) => (
                              <label
                                key={index}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={(editAlert?.recipients || []).includes(barangay.name)}
                                  onChange={() => handleEditBarangayToggle(barangay.name)}
                                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 text-sm">{barangay.name}</div>
                                </div>
                              </label>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-gray-500 text-sm">
                              No barangays found
                            </div>
                          )}
                        </div>

                        {/* Footer with select all/clear all */}
                        <div className="border-t border-gray-200 p-2 flex justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              const allBarangayNames = rosarioBarangays.map(b => b.name);
                              setEditAlert(prev => prev ? ({
                                ...prev,
                                recipients: Array.from(new Set([...(prev?.recipients || []), ...allBarangayNames]))
                              }) : null);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const currentRecipients = editAlert?.recipients || [];
                              const barangayNames = rosarioBarangays.map(b => b.name);
                              setEditAlert(prev => prev ? ({
                                ...prev,
                                recipients: currentRecipients.filter(r => !barangayNames.includes(r))
                              }) : null);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Barangays Display */}
                  {selectedEditBarangaysCount > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(editAlert?.recipients || [])
                        .filter(recipient => rosarioBarangays.some(barangay => barangay.name === recipient))
                        .slice(0, 5)
                        .map((barangayName, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                          >
                            {barangayName}
                            <button
                              type="button"
                              onClick={() => handleEditBarangayToggle(barangayName)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <i className="ri-close-line text-xs"></i>
                            </button>
                          </span>
                        ))}
                      {selectedEditBarangaysCount > 5 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{selectedEditBarangaysCount - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {(editAlert?.recipients || []).length > 0 && (
                  <span>
                    <i className="ri-mail-line mr-1"></i>
                    {(editAlert?.recipients || []).length} recipient group(s) selected
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditAlert}
                  disabled={!editAlert.title || !editAlert.message}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <i className="ri-save-line mr-2"></i>
                  Update Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setAlertIdToDelete(null); }}
        onConfirm={confirmDeleteAlert}
        title="Delete Alert"
        message="Are you sure you want to delete this alert? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
      />

      <ExportPreviewModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportPDF={() => {
          handleExport('pdf');
          setShowExportModal(false);
        }}
        onExportCSV={() => {
          handleExport('csv');
          setShowExportModal(false);
        }}
        onExportExcel={() => {
          handleExport('excel');
          setShowExportModal(false);
        }}
        data={alerts}
        columns={exportColumns}
        title="Export Alerts Data"
      />
    </div>
  );
};

export default AlertsManagement;
