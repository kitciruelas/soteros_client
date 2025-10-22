import React, { useState, useEffect } from 'react';
import { evacuationCentersApi, evacuationRoutesApi } from '../../../../utils/api';

// Simple SVG icons
const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const RouteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
  </svg>
);

const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const FilterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
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

interface EvacuationCenter {
  center_id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  status: 'open' | 'full' | 'closed';
  contact_person?: string;
  contact_number?: string;
  email?: string;
  address?: string;
}

interface EvacuationRoute {
  id: number;
  center_id: number;
  name: string;
  description: string;
  start_location: string;
  end_location: string;
  waypoints: Array<{ lat: number; lng: number }>;
  distance: number;
  estimated_time: number;
  status: 'active' | 'inactive' | 'under_review';
  priority: 'primary' | 'secondary' | 'emergency';
}

const EvacuationMapPage: React.FC = () => {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState<EvacuationCenter | null>(null);
  const [showCenters, setShowCenters] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<EvacuationRoute | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [centersData, routesData] = await Promise.all([
        evacuationCentersApi.getCenters(),
        evacuationRoutesApi.getRoutes()
      ]);
      
      if (centersData.success) {
        setCenters(centersData.data || []);
      }
      
      if (routesData.success) {
        setRoutes(routesData.routes || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'full': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const getOccupancyPercentage = (center: EvacuationCenter) => {
    return Math.round((center.current_occupancy / center.capacity) * 100);
  };

  const handleViewRoute = (route: EvacuationRoute) => {
    setSelectedRoute(route);
    setShowRouteModal(true);
  };

  const filteredCenters = centers.filter(center => {
    const matchesSearch = center.name.toLowerCase().includes(search.toLowerCase()) ||
                         (center.address && center.address.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || center.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRoutes = routes.filter(route => {
    const center = centers.find(c => c.center_id === route.center_id);
    const matchesSearch = route.name.toLowerCase().includes(search.toLowerCase()) ||
                         route.description.toLowerCase().includes(search.toLowerCase()) ||
                         (center && center.name.toLowerCase().includes(search.toLowerCase()));
    const matchesPriority = priorityFilter === 'all' || route.priority === priorityFilter;
    return matchesSearch && matchesPriority;
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
          <h1 className="text-2xl font-bold text-gray-900">Evacuation Map</h1>
          <p className="text-gray-600 mt-1">Visualize evacuation centers and routes on an interactive map</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Centers</p>
              <p className="text-xl font-bold text-gray-900">{centers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <UsersIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Open Centers</p>
              <p className="text-xl font-bold text-gray-900">{centers.filter(c => c.status === 'open').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <RouteIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Routes</p>
              <p className="text-xl font-bold text-gray-900">{routes.length}</p>
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
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showCenters}
                onChange={(e) => setShowCenters(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show Centers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showRoutes}
                onChange={(e) => setShowRoutes(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Show Routes</span>
            </label>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FilterIcon className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <FilterIcon className="w-4 h-4 text-gray-500" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search centers and routes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900">Interactive Map</h2>
          <p className="text-sm text-gray-600">Map visualization will be implemented here</p>
        </div>
        
        {/* Placeholder for map */}
        <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPinIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Map Integration</h3>
            <p className="text-gray-600">
              This area will display an interactive map showing evacuation centers and routes.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Integration with mapping services like Google Maps or Leaflet will be implemented here.
            </p>
          </div>
        </div>
      </div>

      {/* Centers Table */}
      {showCenters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Evacuation Centers</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCenters.map((center) => (
                  <tr key={center.center_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{center.name}</div>
                      {center.address && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{center.address}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(center.status)}`}>
                        {center.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                        {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${getOccupancyPercentage(center) > 80 ? 'bg-red-500' : getOccupancyPercentage(center) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(getOccupancyPercentage(center), 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{getOccupancyPercentage(center)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <UsersIcon className="w-4 h-4 mr-1 text-gray-400" />
                        {center.current_occupancy} / {center.capacity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {center.contact_person && (
                        <div>{center.contact_person}</div>
                      )}
                      {center.contact_number && (
                        <div className="text-blue-600">{center.contact_number}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCenters.length === 0 && (
            <div className="text-center py-12">
              <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No centers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'No evacuation centers have been created yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Routes Table */}
      {showRoutes && (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.map((route) => {
                  const center = centers.find(c => c.center_id === route.center_id);
                  return (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{route.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{route.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(route.priority)}`}>
                          {route.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <MapPinIcon className="w-4 h-4 mr-1 text-gray-400" />
                          {center?.name || 'Unknown Center'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {route.start_location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {route.end_location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <RouteIcon className="w-4 h-4 mr-1 text-gray-400" />
                          {route.distance} km ({route.estimated_time} min)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewRoute(route)}
                          className="text-blue-600 hover:text-blue-900 flex items-center transition-colors"
                          title="View route details"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View
                        </button>
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
                {search || priorityFilter !== 'all' ? 'Try adjusting your search or filters.' : 'No evacuation routes have been created yet.'}
              </p>
            </div>
          )}
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
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Location Details</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div><strong>Start:</strong> {selectedRoute.start_location}</div>
                      <div><strong>End:</strong> {selectedRoute.end_location}</div>
                      <div><strong>Distance:</strong> {selectedRoute.distance} km</div>
                      <div><strong>Estimated Time:</strong> {selectedRoute.estimated_time} minutes</div>
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
                              {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}
                            </div>
                          </div>
                          {center.address && (
                            <div className="text-gray-600">{center.address}</div>
                          )}
                          <div className="flex items-center">
                            <UsersIcon className="w-4 h-4 mr-1" />
                            <span>Capacity: {center.current_occupancy} / {center.capacity}</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(center.status)}`}>
                              Status: {center.status}
                            </span>
                          </div>
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
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowRouteModal(false);
                    setSelectedRoute(null);
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
    </div>
  );
};

export default EvacuationMapPage;
