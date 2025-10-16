import React, { useState, useEffect, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, ZoomControl, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure Leaflet CSS is loaded
const ensureLeafletCSS = () => {
  const link = document.querySelector('link[href*="leaflet"]');
  if (!link) {
    const newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    newLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    newLink.crossOrigin = '';
    document.head.appendChild(newLink);
  }
};

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different evacuation center statuses
const createCustomIcon = (status: 'open' | 'full' | 'closed') => {
  const color = status === 'open' ? '#10b981' : status === 'full' ? '#ef4444' : '#6b7280';
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <i class="ri-building-2-line" style="color: white; font-size: 12px;"></i>
      </div>
    `,
    className: 'custom-evacuation-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// User location icon
const userLocationIcon = L.divIcon({
  html: `
    <div style="
      background-color: #3b82f6;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    "></div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  `,
  className: 'user-location-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface EvacuationCenter {
  center_id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current_occupancy: number;
  status: 'open' | 'full' | 'closed';
  contact_person: string;
  contact_number: string;
  last_updated: string;
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

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface EvacuationCenterMapProps {
  evacuationCenters: EvacuationCenter[];
  userLocation?: UserLocation | null;
  onCenterClick?: (center: EvacuationCenter) => void;
  height?: string;
}

// Component to handle map centering
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const EvacuationCenterMap: React.FC<EvacuationCenterMapProps> = ({
  evacuationCenters,
  userLocation,
  onCenterClick,
  height = '24rem' // Default height
}) => {
  // Debug logging
  console.log('EvacuationCenterMap props:', {
    centersCount: evacuationCenters.length
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>([16.4567890, 120.5678901]); // Default to San Juan, Batangas
  const [mapZoom, setMapZoom] = useState(13);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [legendVisible, setLegendVisible] = useState(true);

  // Update map center when user location is available
  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.latitude, userLocation.longitude]);
      setMapZoom(14);
    } else if (evacuationCenters.length > 0) {
      // Center on first evacuation center if no user location
      const firstCenter = evacuationCenters[0];
      setMapCenter([firstCenter.latitude, firstCenter.longitude]);
    }
  }, [userLocation, evacuationCenters]);

  // Ensure Leaflet CSS is loaded
  useEffect(() => {
    ensureLeafletCSS();
  }, []);

  // Add timeout for map loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapLoading) {
        console.log('Map loading timeout - setting error state');
        setMapError(true);
        setMapLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [mapLoading]);

  // Filter nearby centers if user location is available (for drive-in nearby)
  const nearbyCenters = userLocation 
    ? evacuationCenters.filter(center => 
        calculateDistance(
          userLocation.latitude, 
          userLocation.longitude, 
          center.latitude, 
          center.longitude
        ) <= 20 // 20km max for drive-in nearby
      )
    : [];

  const formatLastUpdated = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600';
      case 'full': return 'text-red-600';
      case 'closed': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const handleGetDirections = (center: EvacuationCenter) => {
    const query = encodeURIComponent(`${center.name}, San Juan, Batangas`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  const handleContact = (contactNumber: string) => {
    window.open(`tel:${contactNumber}`, '_self');
  };

  console.log('Rendering EvacuationCenterMap with:', {
    mapCenter,
    mapZoom,
    mapLoading,
    mapError,
    centersCount: evacuationCenters.length
  });

  return (
    <div className="relative">
      {/* Enhanced Map Controls */}
      <div className="absolute top-4 right-4 z-10 space-y-3">
        {userLocation && (
          <button
            onClick={() => {
              setMapCenter([userLocation.latitude, userLocation.longitude]);
              setMapZoom(15);
            }}
            className="group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            title="Center on my location"
          >
            <i className="ri-focus-3-line text-blue-600 text-lg group-hover:text-blue-700"></i>
          </button>
        )}

        <button
          onClick={() => {
            if (evacuationCenters.length > 0) {
              const bounds = L.latLngBounds(
                evacuationCenters.map(center => [center.latitude, center.longitude])
              );
              // This would need to be handled by the map instance
            }
          }}
          className="group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          title="Show all centers"
        >
          <i className="ri-fullscreen-line text-blue-600 text-lg group-hover:text-blue-700"></i>
        </button>

        <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-xl p-3 shadow-xl">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{evacuationCenters.length}</div>
            <div className="text-xs text-gray-600">Centers</div>
          </div>
        </div>
      </div>

      <div 
        className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 relative" 
        style={{ 
          height,
          minHeight: '300px',
          position: 'relative'
        }}
      >
        {/* Loading overlay */}
        {mapLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
            <div className="text-center">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-4"></i>
              <p className="text-gray-600 mb-2">Failed to load interactive map</p>
              <p className="text-sm text-gray-500 mb-4">Showing static map instead</p>
              <button 
                onClick={() => {
                  setMapError(false);
                  setMapLoading(true);
                  // Force re-render
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Interactive Map
              </button>
            </div>
          </div>
        )}
        
        {/* Static map fallback */}
        {mapError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center p-4">
              <i className="ri-map-2-line text-6xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Evacuation Centers Map</h3>
              <p className="text-sm text-gray-500 mb-4">
                {evacuationCenters.length} centers available
              </p>
              <div className="space-y-2 text-left max-w-md mx-auto">
                {evacuationCenters.slice(0, 5).map((center) => (
                  <div key={center.center_id} className="bg-white p-3 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{center.name}</h4>
                        <p className="text-sm text-gray-600">Capacity: {center.current_occupancy}/{center.capacity}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        center.status === 'open' ? 'bg-green-100 text-green-800' :
                        center.status === 'full' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {center.status}
                      </span>
                    </div>
                  </div>
                ))}
                {evacuationCenters.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{evacuationCenters.length - 5} more centers
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          zoomControl={false} // We'll add custom zoom controls
          whenReady={() => {
            console.log('Map is ready!');
            setMapLoading(false);
          }}
        >
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* Custom Zoom Control */}
          <ZoomControl position="bottomright" />

          {/* Primary OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            eventHandlers={{
              loading: () => console.log('Tiles loading...'),
              load: () => console.log('Tiles loaded successfully'),
              tileerror: (e) => {
                console.error('Tile loading error:', e);
                setMapError(true);
              }
            }}
          />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>Your Location</strong>
                <br />
                <small className="text-gray-600">
                  Lat: {userLocation.latitude.toFixed(6)}<br />
                  Lng: {userLocation.longitude.toFixed(6)}
                </small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Evacuation center markers */}
        {evacuationCenters.map((center) => {
          const isNearby = nearbyCenters.some(nc => nc.center_id === center.center_id);
          
          return (
            <Marker
              key={center.center_id}
              position={[center.latitude, center.longitude]}
              icon={createCustomIcon(center.status)}
              eventHandlers={{
                click: () => onCenterClick?.(center)
              }}
            >
              <Popup maxWidth={300} className="evacuation-center-popup">
                <div className="p-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-gray-900">{center.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      center.status === 'open' ? 'bg-green-100 text-green-800' :
                      center.status === 'full' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Capacity:</span> {center.current_occupancy}/{center.capacity}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Contact:</span> {center.contact_person}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {center.contact_number}
                    </p>
                    {isNearby && (
                      <p className="text-sm text-blue-600 font-medium">
                        <i className="ri-car-line mr-1"></i>
                        Drive-in Nearby ({calculateDistance(
                          userLocation!.latitude,
                          userLocation!.longitude,
                          center.latitude,
                          center.longitude
                        ).toFixed(1)} km)
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGetDirections(center)}
                      className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Directions
                    </button>
                    <button
                      onClick={() => handleContact(center.contact_number)}
                      className="flex-1 border border-blue-600 text-blue-600 py-1 px-3 rounded text-sm hover:bg-blue-50 transition-colors"
                    >
                      Call
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    Updated: {formatLastUpdated(center.last_updated)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>
      </div>

      {/* Enhanced Map Legend with Toggle */}
      <div className="absolute bottom-4 left-4 z-10">
        {/* Legend Toggle Button */}
        <button
          onClick={() => setLegendVisible(!legendVisible)}
          className="mb-2 bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          title={legendVisible ? "Hide Legend" : "Show Legend"}
        >
          <i className={`ri-${legendVisible ? 'arrow-down-s' : 'arrow-up-s'}-line text-blue-600 text-lg transition-transform duration-300`}></i>
        </button>

        {/* Legend Content */}
        <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 transition-all duration-300 ${
          legendVisible 
            ? 'opacity-100 translate-y-0 max-h-96' 
            : 'opacity-0 -translate-y-4 max-h-0 overflow-hidden'
        }`}>
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
            <i className="ri-information-line mr-2 text-blue-600"></i>
            Legend
          </h4>
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mr-3 shadow-sm"></div>
              <span className="text-gray-700 font-medium">Open Centers</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-rose-500 rounded-full mr-3 shadow-sm"></div>
              <span className="text-gray-700 font-medium">Full Centers</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-4 h-4 bg-gradient-to-r from-gray-500 to-slate-500 rounded-full mr-3 shadow-sm"></div>
              <span className="text-gray-700 font-medium">Closed Centers</span>
            </div>
            {userLocation && (
              <div className="flex items-center text-sm border-t border-gray-200 pt-2 mt-2">
                <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mr-3 shadow-sm animate-pulse"></div>
                <span className="text-gray-700 font-medium">Your Location</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Error Boundary Component
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Map Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <i className="ri-error-warning-line text-4xl text-red-400 mb-4"></i>
            <p className="text-gray-600">Map failed to load</p>
            <p className="text-sm text-gray-500 mt-2">
              Please refresh the page to try again
            </p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapped component with error boundary
const EvacuationCenterMapWithErrorBoundary: React.FC<EvacuationCenterMapProps> = (props) => {
  return (
    <MapErrorBoundary>
      <EvacuationCenterMap {...props} />
    </MapErrorBoundary>
  );
};

export default EvacuationCenterMapWithErrorBoundary;
