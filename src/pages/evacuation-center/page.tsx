import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import EvacuationCenterMap from '../../components/EvacuationCenterMap';
import useGeolocation from '../../hooks/useGeolocation';
import { getAuthState, type UserData } from '../../utils/auth';
import { evacuationCentersApi } from '../../utils/api';


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


interface EvacuationResource {
  resource_id: number;
  center_id: number;
  type: 'facility' | 'feature' | 'water' | 'supply';
  name: string;
  quantity: number;
  picture: string | null;
  created_at: string;
  updated_at: string;
}

const EvacuationCenterPage: React.FC = () => {
  const [evacuationCenters, setEvacuationCenters] = useState<EvacuationCenter[]>([]);
  const [evacuationResources, setEvacuationResources] = useState<{ [centerId: number]: EvacuationResource[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState<{ [centerId: number]: boolean }>({});
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [maxNearbyCount] = useState(3); // Show only the 3 closest centers
  const [selectedCenter, setSelectedCenter] = useState<EvacuationCenter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'full' | 'closed'>('all');
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<{ center: EvacuationCenter; resources: EvacuationResource[] } | null>(null);
  const [selectedContactInfo, setSelectedContactInfo] = useState<EvacuationCenter | null>(null);
  const [selectedCenterDetails, setSelectedCenterDetails] = useState<EvacuationCenter | null>(null);
  const [showAllCenters, setShowAllCenters] = useState(false);
  const [centersWithRoutes, setCentersWithRoutes] = useState<Array<EvacuationCenter & {distance: number, duration: number}>>([]);
  const nearbyCentersRef = useRef<HTMLDivElement>(null);

  // Get user location
  const { latitude, longitude, error: locationError, loading: locationLoading, getCurrentLocation } = useGeolocation();


  // Load evacuation resources for a specific center
  const loadEvacuationResources = async (centerId: number) => {
    console.log(`Starting to load resources for center ${centerId}`);
    try {
      setResourcesLoading(prev => ({ ...prev, [centerId]: true }));
      console.log(`Calling API for center ${centerId}...`);
      const data = await evacuationCentersApi.getResources(centerId);
      console.log(`Resources data for center ${centerId}:`, data);
      if (data.success) {
        console.log(`Setting resources for center ${centerId}:`, data.data);
        setEvacuationResources(prev => {
          const newState = {
            ...prev,
            [centerId]: data.data || []
          };
          console.log(`New resources state:`, newState);
          return newState;
        });
      } else {
        console.log(`API returned success: false for center ${centerId}`);
      }
    } catch (error) {
      console.error(`Failed to load resources for center ${centerId}:`, error);
      setEvacuationResources(prev => ({
        ...prev,
        [centerId]: []
      }));
    } finally {
      setResourcesLoading(prev => ({ ...prev, [centerId]: false }));
    }
  };

  useEffect(() => {
    const authState = getAuthState();
    // Only allow user type to access this page
    if (authState.isAuthenticated && authState.userType !== 'user') {
      // Redirect admin/staff users to their respective dashboards
      if (authState.userType === 'admin') {
        window.location.href = '/admin';
        return;
      } else if (authState.userType === 'staff') {
        window.location.href = '/staff';
        return;
      }
    }
    
    const isUserAuth = authState.isAuthenticated && authState.userType === 'user';
    setIsAuthenticated(isUserAuth);
    setUserData(isUserAuth ? authState.userData : null);

    // Listen for authentication state changes
    const handleAuthStateChange = () => {
      const newAuthState = getAuthState();
      // Only allow user type to access this page
      if (newAuthState.isAuthenticated && newAuthState.userType !== 'user') {
        // Redirect admin/staff users to their respective dashboards
        if (newAuthState.userType === 'admin') {
          window.location.href = '/admin';
          return;
        } else if (newAuthState.userType === 'staff') {
          window.location.href = '/staff';
          return;
        }
      }
      
      const isNewUserAuth = newAuthState.isAuthenticated && newAuthState.userType === 'user';
      setIsAuthenticated(isNewUserAuth);
      setUserData(isNewUserAuth ? newAuthState.userData : null);
    };

    window.addEventListener('storage', handleAuthStateChange);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    // Fetch evacuation centers data
    evacuationCentersApi.getCenters()
      .then(data => {
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setEvacuationCenters(data);
          // Load resources for all centers after centers are loaded
          data.forEach(center => {
            loadEvacuationResources(center.center_id);
          });
        } else {
          console.error('Expected array but got:', data);
          setEvacuationCenters([]);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching evacuation centers:', error);
        setEvacuationCenters([]);
        setIsLoading(false);
      });


    return () => {
      window.removeEventListener('storage', handleAuthStateChange);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    window.location.href = '/';
  };

  // Calculate straight-line distance between two points (fallback)
  const calculateStraightLineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  // Calculate route-based distance using Google Maps-like calculation
  const calculateRouteDistance = async (lat1: number, lon1: number, lat2: number, lon2: number): Promise<{distance: number, duration: number}> => {
    try {
      // For real implementation, you would use Google Maps Directions API:
      // const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lon1}&destination=${lat2},${lon2}&key=YOUR_API_KEY`);
      
      // For now, we'll use a more realistic approximation based on actual road networks
      const straightDistance = calculateStraightLineDistance(lat1, lon1, lat2, lon2);
      
      // More realistic road distance calculation based on terrain and road network
      let routeDistance;
      if (straightDistance < 5) {
        // Short distances: roads are usually more direct
        routeDistance = straightDistance * 1.2;
      } else if (straightDistance < 15) {
        // Medium distances: more winding roads
        routeDistance = straightDistance * 1.4;
      } else {
        // Longer distances: may need to use highways, more indirect routes
        routeDistance = straightDistance * 1.6;
      }
      
      // More realistic travel time calculation
      let averageSpeed;
      if (routeDistance < 5) {
        averageSpeed = 25; // Local roads, traffic lights
      } else if (routeDistance < 15) {
        averageSpeed = 35; // Mix of local and main roads
      } else {
        averageSpeed = 45; // Highways and main roads
      }
      
      const estimatedDuration = (routeDistance / averageSpeed) * 60; // Convert to minutes
      
      return {
        distance: routeDistance,
        duration: estimatedDuration
      };
    } catch (error) {
      console.error('Error calculating route distance:', error);
      // Fallback to straight-line distance
      const fallbackDistance = calculateStraightLineDistance(lat1, lon1, lat2, lon2);
      return {
        distance: fallbackDistance,
        duration: (fallbackDistance / 30) * 60
      };
    }
  };

  // Calculate route distances for all centers when location changes
  useEffect(() => {
    if (latitude && longitude && evacuationCenters.length > 0) {
      const calculateAllRoutes = async () => {
        const centersWithRouteData = await Promise.all(
          evacuationCenters.map(async (center) => {
            const routeData = await calculateRouteDistance(
              latitude, 
              longitude, 
              center.latitude, 
              center.longitude
            );
            return {
              ...center,
              distance: routeData.distance,
              duration: routeData.duration
            };
          })
        );
        
        setCentersWithRoutes(centersWithRouteData);
      };
      
      calculateAllRoutes();
    } else {
      setCentersWithRoutes([]);
    }
  }, [latitude, longitude, evacuationCenters]);

  // Get nearby centers (closest centers only) - now using route-based distances
  const nearbyCenters = centersWithRoutes
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxNearbyCount);


  const handleCenterClick = (center: EvacuationCenter) => {
    setSelectedCenter(center);
  };

  // Scroll to nearby centers section
  const scrollToNearbyCenters = () => {
    if (nearbyCentersRef.current) {
      nearbyCentersRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // Get resources for a specific center
  const getResourcesForCenter = (centerId: number): EvacuationResource[] => {
    const resources = evacuationResources[centerId] || [];
    console.log(`Getting resources for center ${centerId}:`, resources);
    return resources;
  };

  // Helper function to get image URL
  const getImageUrl = (picture: string | null): string => {
    if (!picture) return '';
    if (picture.startsWith('http')) return picture;
    
    // Clean the picture path - remove any leading slashes and 'uploads/' prefix
    let cleanPicture = picture;
    if (cleanPicture.startsWith('/')) {
      cleanPicture = cleanPicture.slice(1);
    }
    if (cleanPicture.startsWith('uploads/')) {
      cleanPicture = cleanPicture.slice(8); // Remove 'uploads/' prefix
    }
    
    const imageUrl = `/uploads/${cleanPicture}`;
    console.log(`Image URL generated: ${imageUrl} (from: ${picture})`);
    return imageUrl;
  };

  // Helper function to get contact person with fallback
  const getContactPerson = (contactPerson: string | null | undefined): string => {
    return contactPerson && contactPerson.trim() ? contactPerson : 'MSWDO';
  };

  // Helper function to get contact number with fallback
  const getContactNumber = (contactNumber: string | null | undefined): string => {
    return contactNumber && contactNumber.trim() ? contactNumber : '0939 038 0295';
  };

  // Check if image exists and is accessible
  const checkImageExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.log(`Image check failed for ${url}:`, error);
      return false;
    }
  };

  // Enhanced image component with better error handling
  const ResourceImage: React.FC<{ 
    resource: EvacuationResource; 
    size: 'small' | 'large';
    onClick?: () => void;
  }> = ({ resource, size, onClick }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    
    const imageUrl = getImageUrl(resource.picture);
    const sizeClasses = size === 'small' ? 'w-16 h-16' : 'w-20 h-20';
    
    if (!resource.picture) {
      return (
        <div className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}>
          <i className="ri-image-line text-gray-400 text-lg"></i>
        </div>
      );
    }

    if (imageError) {
      return (
        <div className={`${sizeClasses} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center`}>
          <i className="ri-image-line text-gray-400 text-lg"></i>
        </div>
      );
    }

    return (
      <div className={`${sizeClasses} rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center relative`}>
        {imageLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          </div>
        )}
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={resource.name}
          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
          onClick={onClick}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
            console.log(`Failed to load image: ${imageUrl}`);
          }}
        />
      </div>
    );
  };

  // Group resources by type
  const groupResourcesByType = (resources: EvacuationResource[]) => {
    const grouped = {
      facility: [] as EvacuationResource[],
      feature: [] as EvacuationResource[],
      water: [] as EvacuationResource[],
      supply: [] as EvacuationResource[]
    };
    
    resources.forEach(resource => {
      if (grouped[resource.type]) {
        grouped[resource.type].push(resource);
      }
    });
    
    return grouped;
  };

  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  // Debug useEffect to monitor resources state
  useEffect(() => {
    console.log('EvacuationResources state changed:', evacuationResources);
  }, [evacuationResources]);

  // Filter evacuation centers based on search and status
  const filteredCenters = evacuationCenters.filter(center => {
    const matchesSearch = searchQuery === '' ||
      center.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContactPerson(center.contact_person).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || center.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Limit displayed centers to 8 initially, with option to show more
  const displayedCenters = showAllCenters ? filteredCenters : filteredCenters.slice(0, 8);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* Enhanced Loading Animation */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-lg opacity-30 scale-110 animate-pulse"></div>
            <div className="relative w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <i className="ri-building-2-line text-3xl text-white animate-bounce"></i>
            </div>
          </div>

          {/* Loading Text */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading Evacuation Centers</h2>

          {/* Loading Progress */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>

        </div>
      </div>
    );
  }

  // Remove all gradient backgrounds and complex styling, replace with clean borders and whitespace

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Professional Hero Section */}
      <div className="relative bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            {/* Minimal Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-lg mb-6">
              <i className="ri-building-2-line text-2xl text-slate-700"></i>
            </div>

            {/* Clean Typography */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 leading-tight">
              Evacuation Centers
            </h1>
            <p className="text-xl text-slate-600 mb-2">Rosario, Batangas</p>
            <p className="text-base text-slate-500">Emergency Evacuation Facilities Directory</p>
          </div>
        </div>
      </div>

      {/* Key Stats - Minimal Design */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm text-slate-600 mb-2">Total Centers</div>
            <div className="text-3xl font-bold text-slate-900">{evacuationCenters.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm text-slate-600 mb-2">Available</div>
            <div className="text-3xl font-bold text-emerald-600">
              {evacuationCenters.filter(c => c.status === 'open').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm text-slate-600 mb-2">Closest</div>
            <div className="text-3xl font-bold text-blue-600">{nearbyCenters.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm text-slate-600 mb-2">Open Now</div>
            <div className="text-3xl font-bold text-slate-900">
              {evacuationCenters.filter(c => c.status === 'open').length}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* View Mode Toggle - Minimal */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="ri-list-unordered mr-2"></i>
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="ri-map-2-line mr-2"></i>
              Map
            </button>
          </div>
        </div>

        {/* Search & Filter - Professional */}
        <div className="max-w-4xl mx-auto mb-12 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Search Centers
              </label>
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="By name or contact person..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'full' | 'closed')}
                className="w-full py-2.5 px-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Centers</option>
                <option value="open">Open Only</option>
                <option value="full">Full Only</option>
                <option value="closed">Closed Only</option>
              </select>
            </div>
          </div>

          {/* Results Info */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-slate-600">
              Showing <span className="font-semibold text-slate-900">{displayedCenters.length}</span> of{' '}
              <span className="font-semibold">{evacuationCenters.length}</span> centers
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Empty States */}
        {evacuationCenters.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-lg mb-6">
              <i className="ri-building-2-line text-2xl text-slate-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Centers Found</h3>
            <p className="text-slate-600 mb-6">Please check back later or contact emergency services.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <i className="ri-refresh-line mr-2"></i>
              Refresh
            </button>
          </div>
        ) : filteredCenters.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-lg mb-6">
              <i className="ri-search-line text-2xl text-slate-400"></i>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Results</h3>
            <p className="text-slate-600 mb-6">Adjust your filters to see more centers.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <i className="ri-refresh-line mr-2"></i>
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'map' ? (
          <>
            {/* Map View */}
            <EvacuationCenterMap
              evacuationCenters={filteredCenters}
              userLocation={userLocation}
              onCenterClick={handleCenterClick}
              height="32rem"
            />

            {/* Nearby Centers List */}
            {nearbyCenters.length > 0 && (
              <div ref={nearbyCentersRef} className="mt-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Closest Centers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {nearbyCenters.map((center, index) => (
                    <div
                      key={center.center_id}
                      className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4 gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 mb-2">
                            <div className={`w-3 h-3 rounded-full ${
                              center.status === 'open' ? 'bg-emerald-500' :
                              center.status === 'full' ? 'bg-rose-500' :
                              'bg-slate-400'
                            }`}></div>
                            <span className="text-sm font-medium text-slate-600">#{index + 1} Closest</span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900">{center.name}</h4>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium flex-shrink-0 ${
                          center.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                          center.status === 'full' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                        </span>
                      </div>

                      <div className="space-y-3 mb-6 text-sm">
                        <div className="flex items-center text-slate-600">
                          <i className="ri-map-pin-2-line mr-3 text-slate-400 w-4"></i>
                          {center.distance.toFixed(1)} km away
                        </div>
                        <div className="flex items-center text-slate-600">
                          <i className="ri-group-line mr-3 text-slate-400 w-4"></i>
                          {center.current_occupancy}/{center.capacity} capacity
                        </div>
                        <div className="flex items-center text-slate-600 truncate">
                          <i className="ri-phone-line mr-3 text-slate-400 w-4 flex-shrink-0"></i>
                          <span className="truncate">{getContactNumber(center.contact_number)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(center.name + ' Rosario, Batangas')}`, '_blank')}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Directions
                        </button>
                        <button
                          onClick={() => window.open(`tel:${getContactNumber(center.contact_number)}`, '_self')}
                          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Call
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* List View - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCenters.map((center) => {
                const centerWithRoute = centersWithRoutes.find(c => c.center_id === center.center_id);
                const distance = centerWithRoute?.distance || null;
                const occupancyPercentage = (center.current_occupancy / center.capacity) * 100;

                return (
                  <div
                    key={center.center_id}
                    className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all overflow-hidden flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{center.name}</h3>
                          <p className="text-sm text-slate-500">Emergency Facility</p>
                        </div>
                        <span className={`px-3 py-1.5 rounded text-xs font-bold flex-shrink-0 ${
                          center.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                          center.status === 'full' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {center.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 flex-1">
                      {/* Capacity */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">Capacity</span>
                          <span className="text-sm font-bold text-slate-900">
                            {center.current_occupancy}/{center.capacity}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              occupancyPercentage >= 90 ? 'bg-rose-500' :
                              occupancyPercentage >= 70 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {occupancyPercentage.toFixed(0)}% occupied
                        </p>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Contact Person</p>
                          <p className="font-medium text-slate-900">{getContactPerson(center.contact_person)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Phone</p>
                          <p className="font-medium text-slate-900">{getContactNumber(center.contact_number)}</p>
                        </div>
                      </div>

                      {/* Distance Info */}
                      {distance && (
                        <div>
                          <p className="text-xs text-slate-600 mb-1">Distance</p>
                          <p className="font-medium text-blue-600">{distance.toFixed(1)} km away</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(center.name + ' Rosario, Batangas')}`, '_blank')}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <i className="ri-direction-line mr-1.5"></i>
                        Directions
                      </button>
                      <button
                        onClick={() => window.open(`tel:${getContactNumber(center.contact_number)}`, '_self')}
                        className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <i className="ri-phone-line mr-1.5"></i>
                        Call
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More Button */}
            {filteredCenters.length > 8 && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowAllCenters(!showAllCenters)}
                  className="inline-flex items-center px-6 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <i className={`ri-arrow-${showAllCenters ? 'up' : 'down'}-line mr-2`}></i>
                  {showAllCenters ? 'Show Less' : 'Show More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 text-2xl font-bold z-10"
            >
              ×
            </button>
            <img
              src={selectedImage?.src || "/placeholder.svg"}
              alt={selectedImage?.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {selectedGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedGallery.center.name}</h2>
                  <p className="text-slate-300 text-sm mt-1">{selectedGallery.resources.length} Resources</p>
                </div>
                <button
                  onClick={() => setSelectedGallery(null)}
                  className="text-white hover:text-slate-300 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedGallery.resources.map((resource) => (
                    <div key={resource.resource_id} className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                      <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                        {resource.picture ? (
                          <img
                            src={getImageUrl(resource.picture) || "/placeholder.svg"}
                            alt={resource.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                            onClick={() => setSelectedImage({ 
                              src: getImageUrl(resource.picture), 
                              alt: resource.name 
                            })}
                          />
                        ) : (
                          <i className="ri-image-line text-2xl text-slate-400"></i>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-slate-900 mb-2">{resource.name}</h4>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{resource.type}</span>
                          <span className="font-medium text-slate-900">Qty: {resource.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvacuationCenterPage;
