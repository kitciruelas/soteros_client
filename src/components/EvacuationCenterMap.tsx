import React, { useState, useEffect, useRef, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, ZoomControl, Polyline, Polygon } from 'react-leaflet';
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
    // Use invalidateSize on iOS to fix rendering issues
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      // Delay to ensure map container is fully rendered
      setTimeout(() => {
        map.invalidateSize();
        map.setView(center, zoom);
      }, 100);
    } else {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  
  return null;
};

// Component to handle iOS map initialization
const IOSMapInitializer: React.FC<{ onReady: () => void; mapRef: React.MutableRefObject<L.Map | null> }> = ({ onReady, mapRef }) => {
  const map = useMap();
  
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Store map reference
    mapRef.current = map;
    
    if (isIOS) {
      // Force map to recalculate size on iOS
      const timer = setTimeout(() => {
        map.invalidateSize();
        // Trigger a resize event
        window.dispatchEvent(new Event('resize'));
        onReady();
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      mapRef.current = map;
      onReady();
    }
  }, [map, onReady, mapRef]);
  
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
  const [isIOS, setIsIOS] = useState(false);
  const [rosarioPolygon, setRosarioPolygon] = useState<[number, number][] | null>(null);
  const [showPolygon, setShowPolygon] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

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

  // Detect iOS
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);
    
    // Add iOS-specific CSS fixes
    if (iOS) {
      const style = document.createElement('style');
      style.textContent = `
        .leaflet-container {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          touch-action: pan-x pan-y;
        }
        .leaflet-map-pane {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        .leaflet-tile-container {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Ensure Leaflet CSS is loaded
  useEffect(() => {
    ensureLeafletCSS();
  }, []);

  // Fetch Rosario, Batangas boundary polygon from OpenStreetMap
  const fetchRosarioPolygon = async (): Promise<[number, number][] | null> => {
    try {
      // Check cache first
      const cachedPolygon = localStorage.getItem('rosario_boundary_polygon');
      if (cachedPolygon) {
        try {
          const polygon = JSON.parse(cachedPolygon);
          if (Array.isArray(polygon) && polygon.length > 0) {
            // Convert to [lat, lng] format for Leaflet
            return polygon.map((coord: number[]) => [coord[0], coord[1]] as [number, number]);
          }
        } catch (error) {
          console.error('Error parsing cached polygon:', error);
        }
      }

      // Fetch from OpenStreetMap Overpass API
      const overpassQuery = `
        [out:json][timeout:25];
        (
          relation(11259957);
        );
        (._;>;);
        out geom;
      `;

      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch boundary data');
      }

      const data = await response.json();
      
      if (data.elements && data.elements.length > 0) {
        const relation = data.elements.find((e: any) => e.type === 'relation');
        if (relation && relation.members) {
          const outerWays = relation.members
            .filter((m: any) => m.role === 'outer' && m.type === 'way')
            .map((m: any) => {
              const way = data.elements.find((e: any) => e.type === 'way' && e.id === m.ref);
              return way;
            })
            .filter((way: any) => way && way.geometry);

          if (outerWays.length > 0) {
            console.log(`Found ${outerWays.length} outer ways in Rosario boundary relation`);
            
            // Combine all outer ways to form complete polygon
            // For multipolygons, we need to connect all ways in order
            const connectWays = (ways: any[]): [number, number][] => {
              if (ways.length === 0) return [];
              if (ways.length === 1) {
                // Single way, just return its coordinates
                return ways[0].geometry.map((point: any) => [point.lat, point.lon] as [number, number]);
              }
              
              const used = new Set<number>();
              const allPaths: [number, number][][] = [];
              
              // Try to build connected paths
              while (used.size < ways.length) {
                // Find first unused way
                let startIdx = -1;
                for (let i = 0; i < ways.length; i++) {
                  if (!used.has(i)) {
                    startIdx = i;
                    break;
                  }
                }
                
                if (startIdx === -1) break;
                
                // Start building a path from this way
                let currentPath: [number, number][] = ways[startIdx].geometry.map((point: any) => [point.lat, point.lon] as [number, number]);
                used.add(startIdx);
                let pathStartWayId = ways[startIdx].id;
                
                // Try to extend this path by connecting other ways
                let extended = true;
                let iterations = 0;
                const maxIterations = ways.length * 2; // Prevent infinite loops
                
                while (extended && used.size < ways.length && iterations < maxIterations) {
                  iterations++;
                  extended = false;
                  const lastPoint = currentPath[currentPath.length - 1];
                  const firstPoint = currentPath[0];
                  
                  // Try to find a way that connects to either end
                  for (let i = 0; i < ways.length; i++) {
                    if (used.has(i)) continue;
                    
                    const way = ways[i];
                    if (!way.geometry || way.geometry.length === 0) continue;
                    
                    const wayCoords = way.geometry.map((point: any) => [point.lat, point.lon] as [number, number]);
                    const wayFirst = wayCoords[0];
                    const wayLast = wayCoords[wayCoords.length - 1];
                    
                    const tolerance = 0.0001; // ~11 meters
                    
                    // Check if connects to end of current path
                    if (Math.abs(wayFirst[0] - lastPoint[0]) < tolerance && 
                        Math.abs(wayFirst[1] - lastPoint[1]) < tolerance) {
                      currentPath = [...currentPath, ...wayCoords.slice(1)];
                      used.add(i);
                      extended = true;
                      break;
                    } else if (Math.abs(wayLast[0] - lastPoint[0]) < tolerance && 
                               Math.abs(wayLast[1] - lastPoint[1]) < tolerance) {
                      currentPath = [...currentPath, ...wayCoords.reverse().slice(1)];
                      used.add(i);
                      extended = true;
                      break;
                    }
                    // Check if connects to start of current path (reverse order)
                    else if (Math.abs(wayLast[0] - firstPoint[0]) < tolerance && 
                             Math.abs(wayLast[1] - firstPoint[1]) < tolerance) {
                      currentPath = [...wayCoords.slice(0, -1).reverse(), ...currentPath];
                      used.add(i);
                      extended = true;
                      break;
                    } else if (Math.abs(wayFirst[0] - firstPoint[0]) < tolerance && 
                               Math.abs(wayFirst[1] - firstPoint[1]) < tolerance) {
                      currentPath = [...wayCoords.slice(0, -1), ...currentPath];
                      used.add(i);
                      extended = true;
                      break;
                    }
                  }
                }
                
                allPaths.push(currentPath);
                console.log(`Connected path ${allPaths.length}: ${currentPath.length} points, started from way ${pathStartWayId}, used ${used.size}/${ways.length} ways`);
              }
              
              // Return the longest path (main boundary) or combine all if needed
              if (allPaths.length === 0) {
                console.warn('No paths could be built from ways');
                return [];
              }
              
              // Find the longest path (likely the main boundary)
              const mainPath = allPaths.reduce((longest, path) => 
                path.length > longest.length ? path : longest
              );
              
              console.log(`Selected main boundary path with ${mainPath.length} points from ${allPaths.length} path(s)`);
              
              return mainPath;
            };
            
            const combinedCoordinates = connectWays(outerWays);
            
            if (combinedCoordinates.length > 0) {
              // Close the polygon if not already closed
              const first = combinedCoordinates[0];
              const last = combinedCoordinates[combinedCoordinates.length - 1];
              const distance = Math.sqrt(
                Math.pow(first[0] - last[0], 2) + Math.pow(first[1] - last[1], 2)
              );
              
              if (distance > 0.0001) {
                combinedCoordinates.push([first[0], first[1]]);
                console.log('Polygon closed (endpoints were', distance.toFixed(6), 'degrees apart)');
              } else {
                console.log('Polygon already closed');
              }
              
              // Cache the polygon
              try {
                localStorage.setItem('rosario_boundary_polygon', JSON.stringify(combinedCoordinates));
              } catch (error) {
                console.error('Error caching polygon:', error);
              }
              
              console.log('✅ Rosario boundary polygon loaded:', combinedCoordinates.length, 'points from', outerWays.length, 'ways');
              return combinedCoordinates;
            } else {
              console.error('Failed to combine ways into polygon');
            }
          } else {
            console.warn('No outer ways found in relation');
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Rosario boundary polygon:', error);
      return null;
    }
  };

  // Load Rosario boundary polygon
  useEffect(() => {
    const loadPolygon = async () => {
      const polygon = await fetchRosarioPolygon();
      if (polygon && polygon.length > 0) {
        setRosarioPolygon(polygon);
      }
    };

    loadPolygon();
  }, []);

  // Handle window resize for iOS (Safari address bar show/hide)
  useEffect(() => {
    if (!isIOS) return;
    
    const handleResize = () => {
      // Small delay to let iOS Safari finish resizing
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isIOS]);

  // Add timeout for map loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapLoading) {
        console.log('Map loading timeout - setting error state');
        setMapError(true);
        setMapLoading(false);
      }
    }, 15000); // Increased to 15 seconds for iOS

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

        {rosarioPolygon && (
          <button
            onClick={() => setShowPolygon(!showPolygon)}
            className={`group bg-white/90 backdrop-blur-sm hover:bg-white border border-white/20 rounded-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${
              showPolygon ? 'ring-2 ring-red-500' : ''
            }`}
            title={showPolygon ? "Hide Rosario Boundary" : "Show Rosario Boundary"}
          >
            <i className={`ri-map-2-${showPolygon ? 'fill' : 'line'} text-red-600 text-lg group-hover:text-red-700`}></i>
          </button>
        )}

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
          position: 'relative',
          WebkitTransform: isIOS ? 'translateZ(0)' : undefined,
          transform: isIOS ? 'translateZ(0)' : undefined,
          WebkitBackfaceVisibility: isIOS ? 'hidden' : undefined,
          backfaceVisibility: isIOS ? 'hidden' : undefined
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
            <div className="text-center px-4">
              <i className="ri-error-warning-line text-4xl text-red-400 mb-4"></i>
              <p className="text-gray-600 mb-2 font-semibold">Failed to load interactive map</p>
              {isIOS && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-left max-w-md mx-auto">
                  <p className="text-xs text-yellow-800 font-semibold mb-1">
                    <i className="ri-information-line mr-1"></i>
                    iOS Tips:
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Make sure you have a stable internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Check if Safari is blocking content</li>
                    <li>Try closing and reopening Safari</li>
                  </ul>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">Showing static map instead</p>
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={() => {
                    setMapError(false);
                    setMapLoading(true);
                    if (mapRef.current) {
                      mapRef.current.invalidateSize();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry Map
                </button>
                <button 
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
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
          style={{ 
            height: '100%', 
            width: '100%',
            WebkitTransform: isIOS ? 'translateZ(0)' : undefined,
            transform: isIOS ? 'translateZ(0)' : undefined
          }}
          className="z-0"
          zoomControl={false} // We'll add custom zoom controls
          whenReady={(map) => {
            console.log('Map is ready!');
            mapRef.current = map.target;
            const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            if (isIOSDevice) {
              // Force invalidateSize on iOS after a short delay
              setTimeout(() => {
                map.target.invalidateSize();
                setMapLoading(false);
              }, 200);
            } else {
              setMapLoading(false);
            }
          }}
        >
          <IOSMapInitializer 
            mapRef={mapRef}
            onReady={() => {
              if (mapLoading) {
                setMapLoading(false);
              }
            }} 
          />
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* Custom Zoom Control */}
          <ZoomControl position="bottomright" />

          {/* Primary OpenStreetMap tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            crossOrigin={true}
            eventHandlers={{
              loading: () => {
                console.log('Tiles loading...');
                // Don't set error on initial load
              },
              load: () => {
                console.log('Tiles loaded successfully');
                setMapError(false);
              },
              tileerror: (e) => {
                console.error('Tile loading error:', e);
                // Only set error after a delay to avoid false positives on iOS
                const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                if (!isIOSDevice) {
                  // On non-iOS, set error immediately
                  setMapError(true);
                } else {
                  // On iOS, wait a bit before setting error (might be temporary network issue)
                  setTimeout(() => {
                    if (mapRef.current) {
                      const tiles = mapRef.current.getContainer().querySelectorAll('.leaflet-tile-loaded');
                      if (tiles.length === 0) {
                        setMapError(true);
                      }
                    }
                  }, 3000);
                }
              }
            }}
          />

          {/* Rosario, Batangas Boundary Polygon */}
          {rosarioPolygon && showPolygon && (
            <Polygon
              positions={rosarioPolygon}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#fef2f2',
                fillOpacity: 0.2,
                weight: 2,
                opacity: 0.8
              }}
            >
              <Popup>
                <div className="text-center">
                  <strong className="text-red-600">Rosario, Batangas</strong>
                  <br />
                  <small className="text-gray-600">Municipality Boundary</small>
                </div>
              </Popup>
            </Polygon>
          )}

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
            {rosarioPolygon && (
              <div className="flex items-center text-sm border-t border-gray-200 pt-2 mt-2">
                <div className="w-4 h-4 border-2 border-red-600 bg-red-50 mr-3"></div>
                <span className="text-gray-700 font-medium">Rosario Boundary</span>
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
