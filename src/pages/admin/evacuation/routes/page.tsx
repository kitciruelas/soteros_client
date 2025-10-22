import React, { useState, useEffect } from 'react';
import { ConfirmModal } from '../../../../components/base/Modal';
import { useToast } from '../../../../components/base/Toast';
import { evacuationCentersApi, evacuationRoutesApi, routingApi } from '../../../../utils/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Simple SVG icons
const RouteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
  </svg>
);

const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const NavigationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
  </svg>
);

interface EvacuationCenter {
  center_id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

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

interface EvacuationRoute {
  id: number;
  center_id: number;
  name: string;
  description: string;
  start_location: string;
  end_location: string;
  start_latitude?: number;
  start_longitude?: number;
  waypoints: Array<{ lat: number; lng: number }>;
  distance: number;
  estimated_time: number;
  status: 'active' | 'inactive' | 'under_review';
  priority: 'primary' | 'secondary' | 'emergency';
}

const EvacuationRoutesPage: React.FC = () => {
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<EvacuationRoute | null>(null);
  const [routeDirections, setRouteDirections] = useState<any | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [editingRoute, setEditingRoute] = useState<EvacuationRoute | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    center_id: '',
    start_location: '',
    end_location: '',
    priority: 'primary' as 'primary' | 'secondary' | 'emergency',
    status: 'active' as 'active' | 'inactive' | 'under_review'
  });
  const { showToast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [routeIdToDelete, setRouteIdToDelete] = useState<number | null>(null);


  // Auto-populate end location when center is selected
  const handleCenterChange = (centerId: string) => {
    const selectedCenter = centers.find(c => c.center_id.toString() === centerId);
    setFormData(prev => ({
      ...prev,
      center_id: centerId,
      end_location: selectedCenter ? `${selectedCenter.name}, Rosario, Batangas` : ''
    }));
  };

  // Fetch route directions - using direct route without external API
  const fetchRouteDirections = async (route: EvacuationRoute) => {
    setDirectionsLoading(true);
    try {
      const center = centers.find(c => c.center_id === route.center_id);
      if (!center) {
        setRouteDirections(null);
        return;
      }
      const startCoords = getBarangayCoordinates(route.start_location);
      if (!startCoords) {
        setRouteDirections(null);
        return;
      }

      // Create direct route points
      const routePoints: Array<[number, number]> = [
        [startCoords.lat, startCoords.lng],
        ...route.waypoints.map((wp): [number, number] => [wp.lat, wp.lng]),
        [Number(center.latitude), Number(center.longitude)]
      ];

      // Calculate approximate distance using Haversine formula
      let totalDistance = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        const lat1 = routePoints[i][0];
        const lng1 = routePoints[i][1];
        const lat2 = routePoints[i + 1][0];
        const lng2 = routePoints[i + 1][1];
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistance += R * c;
      }

      // Approximate duration at 30 km/h average speed
      const durationMinutes = Math.round((totalDistance / 30) * 60);

      // Create geometry for map display
      const geometry = {
        coordinates: routePoints.map(point => [point[1], point[0]]) // [lng, lat] format
      };

      // Create simple route summary
      const summary = {
        distance: totalDistance * 1000, // in meters
        duration: durationMinutes * 60, // in seconds
        distanceKm: Math.round(totalDistance * 100) / 100,
        durationMinutes: durationMinutes,
        geometry: geometry,
        steps: [] // No turn-by-turn for direct route
      };

      setRouteDirections(summary);
    } catch (error) {
      console.error('Error calculating direct route:', error);
      setRouteDirections(null);
    } finally {
      setDirectionsLoading(false);
    }
  };

  // Get barangay coordinates by name
  const getBarangayCoordinates = (barangayName: string) => {
    const barangay = rosarioBarangays.find(b => b.name === barangayName);
    return barangay ? { lat: barangay.lat, lng: barangay.lng } : null;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load centers first
      const centersData = await evacuationCentersApi.getCenters();
      let centersArray = [];
      
      if (centersData && typeof centersData === 'object') {
        if (centersData.success && centersData.data) {
          centersArray = centersData.data;
        } else if (Array.isArray(centersData)) {
          centersArray = centersData;
        } else if (centersData.data && Array.isArray(centersData.data)) {
          centersArray = centersData.data;
        }
      }
      
      setCenters(centersArray);
      
      // Load routes
      const routesData = await evacuationRoutesApi.getRoutes();
      let routesArray = [];
      
      if (routesData && typeof routesData === 'object') {
        if (routesData.success && routesData.routes) {
          routesArray = routesData.routes;
        } else if (routesData.success && routesData.data) {
          routesArray = routesData.data;
        } else if (Array.isArray(routesData)) {
          routesArray = routesData;
        }
      }
      
      // Filter out routes that don't have valid center_id
      const validRoutes = routesArray.filter((route: any) => {
        const hasValidCenter = centersArray.some((center: any) => center.center_id === route.center_id);
        if (!hasValidCenter) {
          console.warn(`Route ${route.id} has invalid center_id: ${route.center_id}`);
        }
        return hasValidCenter;
      });
      
      setRoutes(validRoutes);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load evacuation routes data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-800';
      case 'primary': return 'bg-blue-100 text-blue-800';
      case 'secondary': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddNew = () => {
    setEditingRoute(null);
    setFormData({
      name: '',
      description: '',
      center_id: '',
      start_location: '',
      end_location: '',
      priority: 'primary',
      status: 'active'
    });
    setError('');
    setShowModal(true);
  };

  const handleEdit = (route: EvacuationRoute) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description,
      center_id: route.center_id.toString(),
      start_location: route.start_location || '',
      end_location: route.end_location,
      priority: route.priority,
      status: route.status
    });
    setError('');
    setShowModal(true);
  };

  const handleViewRoute = (route: EvacuationRoute) => {
    setSelectedRoute(route);
    setRouteDirections(null);
    setDirectionsLoading(false);
    fetchRouteDirections(route);
    setShowRouteModal(true);
  };

  const requestDeleteRoute = (routeId: number) => {
    setRouteIdToDelete(routeId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRoute = async () => {
    if (routeIdToDelete == null) return;
    try {
      setError('');
      await evacuationRoutesApi.deleteRoute(routeIdToDelete);
      await loadData();
      showToast({ type: 'success', message: 'Route deleted successfully' });
    } catch (error) {
      console.error('Error deleting route:', error);
      setError('Failed to delete route. Please try again.');
      showToast({ type: 'error', message: 'Failed to delete route' });
    } finally {
      setShowDeleteConfirm(false);
      setRouteIdToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Route name is required.');
      return;
    }

    if (!formData.center_id) {
      setError('Please select a destination center.');
      return;
    }

    if (!formData.start_location.trim()) {
      setError('Start location is required.');
      return;
    }

    if (!formData.end_location.trim()) {
      setError('End location is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Get start location coordinates
      const startCoords = getBarangayCoordinates(formData.start_location);
      
      const routeData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        center_id: parseInt(formData.center_id),
        start_location: formData.start_location.trim(),
        end_location: formData.end_location.trim(),
        start_latitude: startCoords?.lat || 0,
        start_longitude: startCoords?.lng || 0,
        priority: formData.priority,
        status: formData.status,
        distance: routeDirections ? routeDirections.distanceKm : 0,
        estimated_time: routeDirections ? routeDirections.durationMinutes : 0
      };

      if (editingRoute) {
        await evacuationRoutesApi.updateRoute(editingRoute.id, routeData);
        showToast({ type: 'success', message: 'Route updated successfully' });
      } else {
        await evacuationRoutesApi.createRoute(routeData);
        showToast({ type: 'success', message: 'Route created successfully' });
      }

      setShowModal(false);
      setEditingRoute(null);
      await loadData();
    } catch (error: any) {
      console.error('Error saving route:', error);
      const errorMessage = error.message || 'Failed to save route. Please try again.';
      setError(errorMessage);
      showToast({ type: 'error', message: 'Failed to save route' });
    } finally {
      setSubmitting(false);
    }
  };

  const openInGoogleMaps = (route: EvacuationRoute) => {
    const center = centers.find(c => c.center_id === route.center_id);
    if (center) {
      const destination = `${center.latitude},${center.longitude}`;
      const origin = route.start_location;
      const url = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`;
      window.open(url, '_blank');
    }
  };

  const filteredRoutes = routes.filter(route => {
    const center = centers.find(c => c.center_id === route.center_id);
    const matchesSearch = route.name.toLowerCase().includes(search.toLowerCase()) ||
                         route.description.toLowerCase().includes(search.toLowerCase()) ||
                         route.start_location.toLowerCase().includes(search.toLowerCase()) ||
                         route.end_location.toLowerCase().includes(search.toLowerCase()) ||
                         (center && center.name.toLowerCase().includes(search.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || route.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evacuation Routes</h1>
          <p className="text-gray-600 mt-1">Manage evacuation routes and driving directions</p>
        </div>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add New Route
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError('')}
                className="inline-flex text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <RouteIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Routes</p>
              <p className="text-xl font-bold text-gray-900">{routes.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <RouteIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Routes</p>
              <p className="text-xl font-bold text-gray-900">{routes.filter(r => r.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <RouteIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Emergency Routes</p>
              <p className="text-xl font-bold text-gray-900">{routes.filter(r => r.priority === 'emergency').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <MapPinIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Centers Connected</p>
              <p className="text-xl font-bold text-gray-900">{new Set(routes.map(r => r.center_id)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search routes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="emergency">Emergency</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="under_review">Under Review</option>
          </select>
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Evacuation Routes</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRoutes.map((route) => {
                const center = centers.find(c => c.center_id === route.center_id);
                return (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{route.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{route.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(route.priority)}`}>
                        {route.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                        {route.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                          {center ? center.name : (
                            <span className="text-red-500 text-xs">Center ID: {route.center_id} (Not Found)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {route.start_location} → {route.end_location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewRoute(route)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View route details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleEdit(route)}
                          className="text-yellow-600 hover:text-yellow-900 transition-colors"
                          title="Edit route"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestDeleteRoute(route.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete route"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12">
            <RouteIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No routes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || priorityFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Get started by adding a new evacuation route.'}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Route Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h2>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Route Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="Enter route name"
                      disabled={submitting}
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination Center *</label>
                    <select
                      value={formData.center_id}
                      onChange={(e) => handleCenterChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={submitting}
                    >
                      <option value="">Select a center</option>
                      {centers.map((center) => (
                        <option key={center.center_id} value={center.center_id}>
                          {center.name}
                        </option>
                      ))}
                    </select>
                    {formData.center_id && (
                      <p className="text-xs text-gray-500 mt-1">
                        End location will be auto-filled when center is selected
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter route description"
                    disabled={submitting}
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Location (Barangay) *</label>
                    <select
                      value={formData.start_location}
                      onChange={(e) => setFormData({...formData, start_location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={submitting}
                    >
                      <option value="">Select a barangay</option>
                      {rosarioBarangays.map((barangay) => (
                        <option key={barangay.name} value={barangay.name}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the barangay where the evacuation route starts
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Location *</label>
                    <input
                      type="text"
                      value={formData.end_location}
                      onChange={(e) => setFormData({...formData, end_location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      placeholder="e.g., Evacuation Center Name, Rosario, Batangas"
                      disabled={submitting}
                      maxLength={255}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Destination evacuation center
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={submitting}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="under_review">Under Review</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingRoute(null);
                      setError('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingRoute ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        {editingRoute ? 'Update Route' : 'Create Route'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Route Details Modal */}
      {showRouteModal && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Route Details</h2>
                <button
                  onClick={() => {
                    setShowRouteModal(false);
                    setSelectedRoute(null);
                    setRouteDirections(null);
                    setDirectionsLoading(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Route Information</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div><strong>Name:</strong> {selectedRoute.name}</div>
                        <div><strong>Description:</strong> {selectedRoute.description}</div>
                        <div><strong>Status:</strong> 
                          <span className={`ml-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRoute.status)}`}>
                            {selectedRoute.status}
                          </span>
                        </div>
                        <div><strong>Priority:</strong> 
                          <span className={`ml-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedRoute.priority)}`}>
                            {selectedRoute.priority}
                          </span>
                        </div>
                        <div><strong>Distance:</strong> {routeDirections ? `${routeDirections.distanceKm} km` : `${selectedRoute.distance} km`}</div>
                        <div><strong>Estimated Time:</strong> {routeDirections ? `${routeDirections.durationMinutes} minutes` : `${selectedRoute.estimated_time} minutes`}</div>
                      </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Location Details</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div><strong>Start:</strong> {selectedRoute.start_location}</div>
                      <div><strong>End:</strong> {selectedRoute.end_location}</div>
                      <div><strong>Distance:</strong> {routeDirections ? `${routeDirections.distanceKm} km` : `${selectedRoute.distance} km`}</div>
                      <div><strong>Estimated Time:</strong> {routeDirections ? `${routeDirections.durationMinutes} minutes` : `${selectedRoute.estimated_time} minutes`}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Destination Center</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {(() => {
                      const center = centers.find(c => c.center_id === selectedRoute.center_id);
                      return center ? (
                        <div className="space-y-1 text-sm">
                          <div className="font-medium text-gray-900">{center.name}</div>
                          <div className="text-gray-600">
                            <div className="flex items-center">
                              <MapPinIcon className="w-4 h-4 mr-1" />
                              {Number(center.latitude).toFixed(4)}, {Number(center.longitude).toFixed(4)}
                            </div>
                          </div>
                          {center.address && (
                            <div className="text-gray-600">{center.address}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-500">Center information not available</div>
                      );
                    })()}
                  </div>
                </div>
                
                {selectedRoute.waypoints && selectedRoute.waypoints.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Waypoints</h3>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="space-y-1 text-sm">
                        {selectedRoute.waypoints.map((waypoint, index) => (
                          <div key={index} className="flex items-center">
                            <RouteIcon className="w-4 h-4 mr-2 text-gray-400" />
                            <span>Point {index + 1}: {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Map */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Route Map</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {(() => {
                      const center = centers.find(c => c.center_id === selectedRoute.center_id);
                      const startCoords = getBarangayCoordinates(selectedRoute.start_location);

                      if (!center || !startCoords) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <MapPinIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>Map data not available for this route</p>
                          </div>
                        );
                      }

                      // Create route points for polyline
                      let routePoints: [number, number][] = [
                        [startCoords.lat, startCoords.lng],
                        ...selectedRoute.waypoints.map(wp => [wp.lat, wp.lng] as [number, number]),
                        [Number(center.latitude), Number(center.longitude)]
                      ];

                      // If we have actual route directions, use the geometry from OpenRouteService
                      if (routeDirections && routeDirections.geometry && routeDirections.geometry.coordinates) {
                        try {
                          // Convert GeoJSON coordinates to Leaflet format [lat, lng]
                          const geometryCoords = routeDirections.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
                          routePoints = geometryCoords;
                        } catch (error) {
                          console.error('Error processing route geometry:', error);
                          // Fall back to basic route points
                        }
                      }

                      // Calculate bounds to fit all points
                      const bounds = L.latLngBounds(routePoints.map(point => [point[0], point[1]]));

                      return (
                        <div className="space-y-4">
                          {/* Route status indicator */}
                          {routeDirections && routeDirections.success ? (
                            <div className="flex items-center text-sm text-green-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              Route calculated using OpenRouteService
                            </div>
                          ) : (
                            <div className="flex items-center text-sm text-amber-600">
                              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                              Showing direct route (routing service unavailable)
                            </div>
                          )}

                          <div className="h-96 rounded-lg overflow-hidden">
                            <MapContainer
                              bounds={bounds}
                              scrollWheelZoom={true}
                              className="h-full w-full"
                            >
                              <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              />

                              {/* Start location marker */}
                              <Marker position={[startCoords.lat, startCoords.lng]}>
                                <Popup>
                                  <div className="text-sm">
                                    <strong>Start Location</strong><br />
                                    {selectedRoute.start_location}
                                  </div>
                                </Popup>
                              </Marker>

                              {/* Center marker */}
                              <Marker position={[Number(center.latitude), Number(center.longitude)]}>
                                <Popup>
                                  <div className="text-sm">
                                    <strong>Evacuation Center</strong><br />
                                    {center.name}<br />
                                    {center.address}
                                  </div>
                                </Popup>
                              </Marker>

                              {/* Waypoints markers */}
                              {selectedRoute.waypoints.map((waypoint, index) => (
                                <Marker key={index} position={[waypoint.lat, waypoint.lng]}>
                                  <Popup>
                                    <div className="text-sm">
                                      <strong>Waypoint {index + 1}</strong><br />
                                      {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                                    </div>
                                  </Popup>
                                </Marker>
                              ))}

                              {/* Route polyline */}
                              <Polyline
                                positions={routePoints}
                                color={routeDirections && routeDirections.success ? "blue" : "orange"}
                                weight={4}
                                opacity={0.7}
                              />
                            </MapContainer>
                          </div>

                          {/* Turn-by-turn directions */}
                          {routeDirections && routeDirections.steps && routeDirections.steps.length > 0 && (
                            <div className="p-3 bg-gray-100 rounded-lg max-h-64 overflow-y-auto text-sm text-gray-700">
                              <h4 className="font-semibold mb-2">Turn-by-Turn Directions</h4>
                              <ol className="list-decimal list-inside space-y-1">
                                {routeDirections.steps.map((step: any, idx: number) => (
                                  <li key={idx}>
                                    {step.instruction} ({(step.distance / 1000).toFixed(2)} km, {(step.duration / 60).toFixed(1)} min)
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => openInGoogleMaps(selectedRoute)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <NavigationIcon className="w-4 h-4 mr-2" />
                  Open in Google Maps
                </button>
                <button
                  onClick={() => {
                    setShowRouteModal(false);
                    setSelectedRoute(null);
                    setRouteDirections(null);
                    setDirectionsLoading(false);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setRouteIdToDelete(null); }}
        onConfirm={confirmDeleteRoute}
        title="Delete Route"
        message="Are you sure you want to delete this route? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="secondary"
        icon="ri-delete-bin-line"
        iconColor="text-red-600"
      />
    </div>
  );
};

export default EvacuationRoutesPage;
