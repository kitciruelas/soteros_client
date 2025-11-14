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
          src={imageUrl}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar isAuthenticated={isAuthenticated} userData={userData || undefined} />

      {/* Enhanced Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5"></div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(156, 146, 172, 0.05) 2px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon with enhanced styling */}
            <div className="relative inline-flex items-center justify-center mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
              <div className="relative w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                <i className="ri-building-2-line text-3xl text-white"></i>
              </div>
            </div>

            {/* Enhanced Typography */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6 leading-tight">
              Evacuation Centers
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              Rosario, Batangas
              <span className="block text-base sm:text-lg text-gray-500 mt-2">Emergency Evacuation Facilities</span>
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{evacuationCenters.length}</div>
                <div className="text-xs md:text-sm text-gray-600">Total Centers</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  {evacuationCenters.filter(c => c.status === 'open').length}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Available</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{nearbyCenters.length}</div>
                <div className="text-xs md:text-sm text-gray-600">Closest</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-3 md:p-4 shadow-lg">
                <div className="text-xl md:text-2xl font-bold text-yellow-600">{evacuationCenters.filter(c => c.status === 'open').length}</div>
                <div className="text-xs md:text-sm text-gray-600">Open Now</div>
              </div>
            </div>

          
          </div>
        </div>
      </div>


      <div className="container mx-auto px-4 pb-8">

            {/* Enhanced View Mode Toggle */}
            <div className="flex justify-center mb-8">
              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-white/20">
                {/* Sliding background */}
                <div
                  className={`absolute top-1.5 bottom-1.5 w-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg transition-transform duration-300 ease-out ${
                    viewMode === 'map' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                ></div>

                <div className="relative flex">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 min-w-[120px] justify-center ${
                      viewMode === 'list'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className={`ri-list-unordered text-lg transition-transform duration-300 ${
                      viewMode === 'list' ? 'scale-110' : ''
                    }`}></i>
                    <span>List</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 min-w-[120px] justify-center ${
                      viewMode === 'map'
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className={`ri-map-2-line text-lg transition-transform duration-300 ${
                      viewMode === 'map' ? 'scale-110' : ''
                    }`}></i>
                    <span>Map</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search Input */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="ri-search-line mr-2"></i>
                      Search Centers
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by name or contact person..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="ri-filter-line mr-2"></i>
                      Filter by Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'full' | 'closed')}
                      className="w-full py-3 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    >
                      <option value="all">All Centers</option>
                      <option value="open">Open Only</option>
                      <option value="full">Full Only</option>
                      <option value="closed">Closed Only</option>
                    </select>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <div className="text-gray-600">
                    Showing <span className="font-semibold text-blue-600">{displayedCenters.length}</span> of{' '}
                    <span className="font-semibold">{evacuationCenters.length}</span> centers
                    {searchQuery && (
                      <span className="block sm:inline sm:ml-2 text-blue-600 mt-1 sm:mt-0">
                        for "{searchQuery}"
                      </span>
                    )}
                  </div>

                  {(searchQuery || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center sm:justify-start space-x-1 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors self-start sm:self-auto"
                    >
                      <i className="ri-refresh-line"></i>
                      <span>Clear Filters</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Location Status */}
            {viewMode === 'map' && (
              <div className="flex justify-center mb-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20 max-w-md w-full mx-4">
                  {locationLoading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="ri-loader-4-line animate-spin text-blue-600"></i>
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">Getting your location...</p>
                        <p className="text-gray-500 text-sm">This may take a few seconds</p>
                      </div>
                    </div>
                  ) : locationError ? (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="ri-error-warning-line text-red-600 text-xl"></i>
                      </div>
                      <p className="text-red-700 font-medium mb-2">Location Access Denied</p>
                      <p className="text-red-600 text-sm mb-3">{locationError}</p>
                      <button
                        onClick={getCurrentLocation}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors font-medium"
                      >
                        <i className="ri-refresh-line mr-2"></i>
                        Try Again
                      </button>
                    </div>
                  ) : userLocation ? (
                    <button
                      onClick={scrollToNearbyCenters}
                      className="w-full flex items-center space-x-3 hover:bg-green-50 rounded-xl p-3 transition-all duration-200 cursor-pointer group"
                      title="Click to scroll to nearby centers"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <i className="ri-map-pin-line text-green-600 text-lg"></i>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-green-700 font-medium group-hover:text-green-800">Location Found</p>
                        <p className="text-green-600 text-sm group-hover:text-green-700">
                          {nearbyCenters.length} closest centers found
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600 group-hover:text-green-700">{nearbyCenters.length}</div>
                        <div className="text-xs text-green-500 group-hover:text-green-600">closest</div>
                      </div>
                      <div className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="ri-arrow-down-line text-lg"></i>
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <i className="ri-map-pin-line text-gray-500 text-lg"></i>
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">Location not available</p>
                        <p className="text-gray-500 text-sm">Enable location for nearby centers</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {evacuationCenters.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-3xl blur-lg opacity-20 scale-110"></div>
                <div className="relative w-24 h-24 mx-auto bg-gradient-to-r from-gray-400 to-gray-500 rounded-3xl flex items-center justify-center shadow-xl">
                  <i className="ri-building-2-line text-3xl text-white"></i>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Evacuation Centers Found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We couldn't find any evacuation centers in your area. Please check back later or contact emergency services.
              </p>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <i className="ri-refresh-line"></i>
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => window.open('tel:911', '_self')}
                  className="border-2 border-red-600 text-red-600 px-6 py-3 rounded-xl font-semibold hover:bg-red-600 hover:text-white transition-colors flex items-center space-x-2"
                >
                  <i className="ri-phone-line"></i>
                  <span>Emergency Call</span>
                </button>
              </div>
            </div>
          ) : filteredCenters.length === 0 ? (
            /* No Results State */
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-3xl blur-lg opacity-20 scale-110"></div>
                <div className="relative w-24 h-24 mx-auto bg-gradient-to-r from-blue-400 to-indigo-400 rounded-3xl flex items-center justify-center shadow-xl">
                  <i className="ri-search-line text-3xl text-white"></i>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Centers Found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                No evacuation centers match your current search criteria. Try adjusting your filters or search terms.
              </p>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <i className="ri-refresh-line"></i>
                <span>Clear All Filters</span>
              </button>
            </div>
          ) : (
            <>
              {/* Map View */}
              {viewMode === 'map' ? (
                <div className="space-y-6">
                  {/* Enhanced Map Controls */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i className="ri-map-pin-line text-blue-600"></i>
                          </div>
                          <label className="text-sm font-semibold text-gray-700">
                            Closest Centers:
                          </label>
                        </div>
                        <div className="text-sm text-gray-600">
                          {maxNearbyCount} nearest by route
                        </div>
                        {userLocation && (
                          <button
                            onClick={getCurrentLocation}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                          >
                            <i className="ri-refresh-line"></i>
                            <span>Refresh Location</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

              {/* Map Component */}
              <EvacuationCenterMap
                evacuationCenters={filteredCenters}
                userLocation={userLocation}
                onCenterClick={handleCenterClick}
                height="32rem"
              />

              {/* Enhanced Nearby Centers List */}
              {nearbyCenters.length > 0 && (
                <div 
                  ref={nearbyCentersRef}
                  className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 backdrop-blur-sm rounded-3xl shadow-2xl border border-blue-200/50 p-8 mb-8"
                >
                  {/* Header Section */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-lg opacity-30 scale-110"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                          <i className="ri-map-pin-line text-white text-xl"></i>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                          Closest Centers
                        </h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {maxNearbyCount} nearest evacuation centers by driving route
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold shadow-md border border-blue-200">
                        <i className="ri-building-2-line mr-1"></i>
                        {nearbyCenters.length} found
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {nearbyCenters.map((center, index) => (
                      <div
                        key={center.center_id}
                        className="group relative bg-white/90 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-4 hover:shadow-2xl hover:border-blue-400/60 transition-all duration-500 hover:-translate-y-2 hover:scale-105"
                        style={{ animationDelay: `${index * 150}ms` }}
                      >
                        {/* Rank Badge */}
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          #{index + 1}
                        </div>

                        <div className="flex items-start justify-between mb-4 gap-2">
                          <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
                            <div className={`w-4 h-4 rounded-full shadow-md flex-shrink-0 ${
                              center.status === 'open' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              center.status === 'full' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                              'bg-gradient-to-r from-gray-400 to-gray-600'
                            }`}></div>
                            <h4 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors truncate min-w-0">
                              {center.name}
                            </h4>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm border flex-shrink-0 ${
                            center.status === 'open' ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200' :
                            center.status === 'full' ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-200' :
                            'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <i className="ri-map-pin-2-line text-blue-500 text-sm"></i>
                            <span className="text-sm font-medium text-blue-600">
                              {center.distance.toFixed(1)} km away
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <i className="ri-group-line text-gray-500 text-sm"></i>
                            <span className="text-sm text-gray-600">
                              {center.current_occupancy}/{center.capacity} capacity
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 min-w-0">
                            <i className="ri-phone-line text-gray-500 text-sm flex-shrink-0"></i>
                            <span className="text-sm text-gray-600 truncate">{getContactNumber(center.contact_number)}</span>
                          </div>

                          {/* Resources Summary */}
                          <div className="flex items-center space-x-2">
                            <i className="ri-tools-line text-purple-500 text-sm"></i>
                            <span className="text-sm text-gray-600">
                              {(() => {
                                const resources = getResourcesForCenter(center.center_id);
                                if (resources.length === 0) {
                                  return (
                                    <button
                                      onClick={() => loadEvacuationResources(center.center_id)}
                                      className="text-purple-600 hover:text-purple-700 text-xs"
                                    >
                                      Load Resources
                                    </button>
                                  );
                                }
                                return `${resources.length} resources available`;
                              })()}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 flex space-x-2">
                          <button
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(center.name + ' Rosario, Batangas')}`, '_blank')}
                            className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            <i className="ri-direction-line mr-1"></i>
                            Directions
                          </button>
                          <button
                            onClick={() => window.open(`tel:${getContactNumber(center.contact_number)}`, '_self')}
                            className="flex-1 border border-blue-600 text-blue-600 py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors"
                          >
                            <i className="ri-phone-line mr-1"></i>
                            Call
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evacuation Routes Information 
              {evacuationRoutes.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mt-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                        <i className="ri-route-line text-white text-lg"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Evacuation Routes</h3>
                        <p className="text-gray-600 text-sm">Available evacuation paths to safe zones</p>
                      </div>
                    </div>
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {evacuationRoutes.length} routes
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {evacuationRoutes.slice(0, 6).map((route, index) => (
                      <div
                        key={route.id}
                        className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-green-300 transition-all duration-300 hover:-translate-y-1"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${
                              route.priority === 'emergency' ? 'bg-red-500' :
                              route.priority === 'primary' ? 'bg-blue-500' :
                              'bg-green-500'
                            }`}></div>
                            <h4 className="font-semibold text-gray-900 text-sm group-hover:text-green-600 transition-colors">
                              {route.name}
                            </h4>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            route.priority === 'emergency' ? 'bg-red-100 text-red-700' :
                            route.priority === 'primary' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`} aria-label={`Priority: ${route.priority}`}>
                            {route.priority.charAt(0).toUpperCase() + route.priority.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center space-x-2 min-w-0">
                            <i className="ri-map-pin-2-line text-green-500 text-sm"></i>
                            <span
                              className="text-sm text-gray-600 truncate"
                              title={`${route.start_location} → ${route.end_location}`}
                            >
                              {route.start_location} → {route.end_location}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <i className="ri-road-map-line text-gray-500 text-sm"></i>
                            <span className="text-sm text-gray-600">
                              {(route.distance ?? '—')} km • {(route.estimated_time ?? '—')} min
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <i className="ri-time-line text-gray-500 text-sm"></i>
                            <span className="text-sm text-gray-600">
                              Status: {route.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleRouteClick(route)}
                            className="w-full bg-green-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300"
                            aria-label={`View details for ${route.name}`}
                          >
                            <i className="ri-information-line mr-1"></i>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {evacuationRoutes.length > 6 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        +{evacuationRoutes.length - 6} more routes available
                      </p>
                    </div>
                  )}
                </div>
              )}
*/}
            </div>
          ) : (
            <div>
              {/* Enhanced List View */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
                {displayedCenters.map((center, index) => {
                  const centerWithRoute = centersWithRoutes.find(c => c.center_id === center.center_id);
                  const distance = centerWithRoute?.distance || null;
                  const duration = centerWithRoute?.duration || null;
                  const isNearby = nearbyCenters.some(nearbyCenter => nearbyCenter.center_id === center.center_id);
                  const occupancyPercentage = (center.current_occupancy / center.capacity) * 100;

                  return (
                    <div
                      key={center.center_id}
                      className={`group relative bg-white/90 backdrop-blur-sm border rounded-xl shadow-lg px-3 py-4 md:px-1 md:py-3 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                        isNearby
                          ? 'border-blue-300 ring-1 ring-blue-100 bg-gradient-to-br from-blue-50/50 to-white'
                          : 'border-white/20 hover:border-blue-200'
                      }`}
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'fadeInUp 0.4s ease-out forwards'
                      }}
                    >
                      {/* Closest Center Badge */}
                      {isNearby && distance && (
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-medium shadow-md">
                          <i className="ri-route-line mr-0.5 text-xs"></i>
                          {distance.toFixed(1)}km
                          {duration && (
                            <span className="ml-1">• {Math.round(duration)}min</span>
                          )}
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-start justify-between mb-4 gap-2">
                        <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                            center.status === 'open' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            center.status === 'full' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                            'bg-gradient-to-r from-gray-500 to-slate-500'
                          }`}>
                            <i className="ri-building-2-line text-lg text-white"></i>
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {center.name}
                            </h3>
                            <p className="text-gray-500 text-sm truncate">Emergency Facility</p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                            center.status === 'open' ? 'bg-green-100 text-green-700' :
                            center.status === 'full' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              center.status === 'open' ? 'bg-green-500' :
                              center.status === 'full' ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}></div>
                            {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Simple Capacity & Status */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Capacity</span>
                          <span className="text-sm text-gray-600">
                            {center.current_occupancy}/{center.capacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-1000 ${
                              occupancyPercentage >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                              occupancyPercentage >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              'bg-gradient-to-r from-green-500 to-emerald-500'
                            }`}
                            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {occupancyPercentage.toFixed(0)}% occupied
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                            center.status === 'open' ? 'bg-green-100 text-green-700' :
                            center.status === 'full' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {center.status.charAt(0).toUpperCase() + center.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Simple Contact Information */}
                      <div className="mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                              <i className="ri-user-line text-blue-600 text-xs"></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate">{getContactPerson(center.contact_person)}</p>
                              <p className="text-xs text-gray-500">Contact Person</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                              <i className="ri-phone-line text-green-600 text-xs"></i>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate">{getContactNumber(center.contact_number)}</p>
                              <p className="text-xs text-gray-500">Phone Number</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Simple Resources Summary */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <i className="ri-tools-line text-purple-600 text-sm"></i>
                            <span className="text-sm font-medium text-gray-700">Resources</span>
                          </div>
                          <button
                            onClick={() => loadEvacuationResources(center.center_id)}
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {resourcesLoading[center.center_id] ? 'Loading...' : 'Refresh'}
                          </button>
                        </div>
                        
                        {resourcesLoading[center.center_id] ? (
                          <div className="flex items-center justify-center py-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                            <span className="ml-2 text-sm text-gray-500">Loading...</span>
                          </div>
                        ) : (
                          <div>
                            {(() => {
                              const resources = getResourcesForCenter(center.center_id);
                              const hasResources = resources.length > 0;
                              
                              if (!hasResources) {
                                return (
                                  <div className="text-center py-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">No resources available</p>
                                    <button
                                      onClick={() => loadEvacuationResources(center.center_id)}
                                      className="text-xs text-purple-600 hover:text-purple-700 mt-1"
                                    >
                                      Load Resources
                                    </button>
                                  </div>
                                );
                              }

                              const totalResources = resources.length;
                              const resourcesWithImages = resources.filter(r => r.picture).length;
                              
                              return (
                                <div 
                                  onClick={() => setSelectedGallery({ 
                                    center: center,
                                    resources: resources
                                  })}
                                  className="bg-purple-50 rounded-lg p-3 border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <i className="ri-tools-line text-purple-600"></i>
                                      <span className="text-sm font-medium text-gray-700">
                                        {totalResources} resources available
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      {resourcesWithImages > 0 && (
                                        <span className="flex items-center">
                                          <i className="ri-image-line mr-1"></i>
                                          {resourcesWithImages} with images
                                        </span>
                                      )}
                                      <i className="ri-arrow-right-line"></i>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(center.name + ' Rosario, Batangas')}`, '_blank')}
                          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                        >
                          <i className="ri-direction-line text-sm"></i>
                          <span>Directions</span>
                        </button>
                        <button
                          onClick={() => window.open(`tel:${getContactNumber(center.contact_number)}`, '_self')}
                          className="flex-1 border border-blue-600 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-600 hover:text-white transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                        >
                          <i className="ri-phone-line text-sm"></i>
                          <span>Call</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Show More / Show Less Button */}
              {filteredCenters.length > 8 && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setShowAllCenters(!showAllCenters)}
                    className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
                  >
                    <i className={`ri-arrow-${showAllCenters ? 'up' : 'down'}-line`}></i>
                    <span>{showAllCenters ? 'Show Less' : 'Show More'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
            </>
          )}

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
            src={selectedImage?.src}
            alt={selectedImage?.alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
            <p className="text-center font-medium">{selectedImage?.alt}</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Resources Modal */}
      {selectedGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-2xl max-w-7xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedGallery.center.name}</h2>
                  <p className="text-purple-100 mt-1 text-sm sm:text-base">All Available Resources ({selectedGallery.resources.length} items)</p>
                </div>
                <button
                  onClick={() => setSelectedGallery(null)}
                  className="text-white hover:text-gray-200 text-3xl font-bold transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Gallery Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
              {/* Resources Summary */}
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const groupedResources = groupResourcesByType(selectedGallery.resources);
                    const typeColors = {
                      facility: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'ri-building-line' },
                      feature: { bg: 'bg-green-100', text: 'text-green-700', icon: 'ri-star-line' },
                      water: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: 'ri-water-flash-line' },
                      supply: { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'ri-box-line' }
                    };
                    
                    return Object.entries(groupedResources).map(([type, typeResources]) => {
                      if (typeResources.length === 0) return null;
                      const colors = typeColors[type as keyof typeof typeColors];
                      
                      return (
                        <div key={type} className={`${colors.bg} rounded-lg p-3 text-center`}>
                          <i className={`${colors.icon} ${colors.text} text-2xl mb-2`}></i>
                          <div className={`text-lg font-bold ${colors.text}`}>{typeResources.length}</div>
                          <div className="text-xs text-gray-600 capitalize">{type}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Resources Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedGallery.resources.map((resource) => (
                  <div key={resource.resource_id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    {/* Resource Image */}
                    <div className="text-center mb-4">
                      <div className="relative inline-block">
                        {resource.picture ? (
                          <img
                            src={getImageUrl(resource.picture)}
                            alt={resource.name}
                            className="w-48 h-48 object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => setSelectedImage({ 
                              src: getImageUrl(resource.picture), 
                              alt: resource.name 
                            })}
                          />
                        ) : (
                          <div className="w-48 h-48 bg-gray-100 rounded-lg shadow-md flex items-center justify-center">
                            <i className="ri-image-line text-gray-400 text-4xl"></i>
                          </div>
                        )}
                        {resource.picture && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center pointer-events-none">
                            <i className="ri-zoom-in-line text-white opacity-0 hover:opacity-100 transition-opacity text-2xl"></i>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Resource Details */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.name}</h3>
                      
                      {/* Resource Type Badge */}
                      <div className="mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          resource.type === 'facility' ? 'bg-blue-100 text-blue-700' :
                          resource.type === 'feature' ? 'bg-green-100 text-green-700' :
                          resource.type === 'water' ? 'bg-cyan-100 text-cyan-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          <i className={`mr-1 ${
                            resource.type === 'facility' ? 'ri-building-line' :
                            resource.type === 'feature' ? 'ri-star-line' :
                            resource.type === 'water' ? 'ri-water-flash-line' :
                            'ri-box-line'
                          }`}></i>
                          {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                        </span>
                      </div>
                      
                      {/* Resource Info */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center justify-center space-x-4">
                          <span className="flex items-center">
                            <i className="ri-number-line mr-1"></i>
                            Quantity: {resource.quantity}
                          </span>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Click on any image to view full size</span>
                  <span>•</span>
                  <span>{selectedGallery.resources.filter(r => r.picture).length} resources with images</span>
                </div>
                <span>{selectedGallery.resources.length} total resources</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information Modal */}
      {selectedContactInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-2xl max-w-2xl w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedContactInfo.name}</h2>
                  <p className="text-blue-100 mt-1 text-sm sm:text-base">Contact Information</p>
                </div>
                <button
                  onClick={() => setSelectedContactInfo(null)}
                  className="text-white hover:text-gray-200 text-3xl font-bold transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Contact Person */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                      <i className="ri-user-line text-white text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Contact Person</h3>
                      <p className="text-gray-600">Primary contact for this center</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-xl font-bold text-gray-900 truncate">{getContactPerson(selectedContactInfo.contact_person)}</p>
                    <p className="text-sm text-gray-500 mt-1">Emergency Contact</p>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <i className="ri-phone-line text-white text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Phone Number</h3>
                      <p className="text-gray-600">Direct contact line</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-xl font-bold text-gray-900 truncate">{getContactNumber(selectedContactInfo.contact_number)}</p>
                        <p className="text-sm text-gray-500 mt-1">Available 24/7</p>
                      </div>
                      <button
                        onClick={() => window.open(`tel:${getContactNumber(selectedContactInfo.contact_number)}`, '_self')}
                        className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center space-x-2 flex-shrink-0"
                      >
                        <i className="ri-phone-line"></i>
                        <span>Call Now</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedContactInfo.name + ' Rosario, Batangas')}`, '_blank')}
                      className="bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                    >
                      <i className="ri-direction-line"></i>
                      <span>Get Directions</span>
                    </button>
                    <button
                      onClick={() => window.open(`tel:${getContactNumber(selectedContactInfo.contact_number)}`, '_self')}
                      className="bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                    >
                      <i className="ri-phone-line"></i>
                      <span>Emergency Call</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Center Details Modal */}
      {selectedCenterDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-2xl max-w-4xl w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedCenterDetails.name}</h2>
                  <p className="text-green-100 mt-1 text-sm sm:text-base">Center Information & Status</p>
                </div>
                <button
                  onClick={() => setSelectedCenterDetails(null)}
                  className="text-white hover:text-gray-200 text-3xl font-bold transition-colors flex-shrink-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Capacity Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200/50">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <i className="ri-group-line text-white text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Capacity Details</h3>
                      <p className="text-gray-600">Current occupancy status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Total Capacity</span>
                        <span className="text-lg font-bold text-green-600">{selectedCenterDetails.capacity}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Current Occupancy</span>
                        <span className="text-lg font-bold text-blue-600">{selectedCenterDetails.current_occupancy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Available Space</span>
                        <span className="text-lg font-bold text-purple-600">{selectedCenterDetails.capacity - selectedCenterDetails.current_occupancy}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Occupancy Rate</span>
                        <span className="text-sm text-gray-600">
                          {Math.round((selectedCenterDetails.current_occupancy / selectedCenterDetails.capacity) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-1000 ${
                            (selectedCenterDetails.current_occupancy / selectedCenterDetails.capacity) >= 0.9 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                            (selectedCenterDetails.current_occupancy / selectedCenterDetails.capacity) >= 0.7 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-green-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min((selectedCenterDetails.current_occupancy / selectedCenterDetails.capacity) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <i className="ri-information-line text-white text-xl"></i>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Center Status</h3>
                      <p className="text-gray-600">Current operational status</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Status</span>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold shadow-sm ${
                          selectedCenterDetails.status === 'open' ? 'bg-green-100 text-green-800 border border-green-200' :
                          selectedCenterDetails.status === 'full' ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            selectedCenterDetails.status === 'open' ? 'bg-green-500' :
                            selectedCenterDetails.status === 'full' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></div>
                          {selectedCenterDetails.status.charAt(0).toUpperCase() + selectedCenterDetails.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <i className="ri-time-line text-gray-500"></i>
                          <span>Last Updated: {new Date(selectedCenterDetails.last_updated).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="ri-map-pin-line text-gray-500"></i>
                          <span>Coordinates: {selectedCenterDetails.latitude.toFixed(4)}, {selectedCenterDetails.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedCenterDetails.name + ' Rosario, Batangas')}`, '_blank')}
                    className="bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    <i className="ri-direction-line"></i>
                    <span>Get Directions</span>
                  </button>
                  <button
                    onClick={() => window.open(`tel:${getContactNumber(selectedCenterDetails.contact_number)}`, '_self')}
                    className="bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    <i className="ri-phone-line"></i>
                    <span>Call Center</span>
                  </button>
                  <button
                    onClick={() => setSelectedGallery({ 
                      center: selectedCenterDetails,
                      resources: getResourcesForCenter(selectedCenterDetails.center_id)
                    })}
                    className="bg-purple-600 text-white py-3 px-4 rounded-xl hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                  >
                    <i className="ri-tools-line"></i>
                    <span>View Resources</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}  </div>


  );
};

export default EvacuationCenterPage;
