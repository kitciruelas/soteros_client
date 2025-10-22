import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Rosario, Batangas barangays with coordinates (complete list)
const rosarioBarangays = [
  { name: "Alupay", lat: 13.8404, lng: 121.2922, type: "residential" },
  { name: "Antipolo", lat: 13.7080, lng: 121.3096, type: "mountainous" },
  { name: "Bagong Pook", lat: 13.8402, lng: 121.2216, type: "residential" },
  { name: "Balibago", lat: 13.8512, lng: 121.2855, type: "residential" },
  { name: "Barangay A", lat: 13.8457, lng: 121.2104, type: "urban" },
  { name: "Barangay B", lat: 13.8461, lng: 121.2065, type: "urban" },
  { name: "Barangay C", lat: 13.8467, lng: 121.2032, type: "urban" },
  { name: "Barangay D", lat: 13.8440, lng: 121.2035, type: "urban" },
  { name: "Barangay E", lat: 13.8415, lng: 121.2047, type: "urban" },
  { name: "Bayawang", lat: 13.7944, lng: 121.2798, type: "agricultural" },
  { name: "Baybayin", lat: 13.8277, lng: 121.2589, type: "coastal" },
  { name: "Bulihan", lat: 13.7967, lng: 121.2351, type: "agricultural" },
  { name: "Cahigam", lat: 13.8021, lng: 121.2501, type: "agricultural" },
  { name: "Calantas", lat: 13.7340, lng: 121.3129, type: "mountainous" },
  { name: "Colongan", lat: 13.8114, lng: 121.1762, type: "agricultural" },
  { name: "Itlugan", lat: 13.8190, lng: 121.2036, type: "residential" },
  { name: "Leviste", lat: 13.7694, lng: 121.2868, type: "agricultural" },
  { name: "Lumbangan", lat: 13.8122, lng: 121.2649, type: "agricultural" },
  { name: "Maalas-as", lat: 13.8112, lng: 121.2122, type: "residential" },
  { name: "Mabato", lat: 13.8144, lng: 121.2913, type: "coastal" },
  { name: "Mabunga", lat: 13.7810, lng: 121.2924, type: "agricultural" },
  { name: "Macalamcam A", lat: 13.8551, lng: 121.3046, type: "coastal" },
  { name: "Macalamcam B", lat: 13.8606, lng: 121.3265, type: "coastal" },
  { name: "Malaya", lat: 13.8535, lng: 121.1720, type: "mountainous" },
  { name: "Maligaya", lat: 13.8182, lng: 121.2742, type: "agricultural" },
  { name: "Marilag", lat: 13.8562, lng: 121.1764, type: "mountainous" },
  { name: "Masaya", lat: 13.8383, lng: 121.1852, type: "residential" },
  { name: "Matamis", lat: 13.7216, lng: 121.3305, type: "mountainous" },
  { name: "Mavalor", lat: 13.8177, lng: 121.2315, type: "residential" },
  { name: "Mayuro", lat: 13.7944, lng: 121.2623, type: "agricultural" },
  { name: "Namuco", lat: 13.8382, lng: 121.2036, type: "commercial" },
  { name: "Namunga", lat: 13.8431, lng: 121.1978, type: "residential" },
  { name: "Nasi", lat: 13.7699, lng: 121.3127, type: "mountainous" },
  { name: "Natu", lat: 13.8420, lng: 121.2683, type: "agricultural" },
  { name: "Palakpak", lat: 13.7079, lng: 121.3320, type: "mountainous" },
  { name: "Pinagsibaan", lat: 13.8438, lng: 121.3141, type: "coastal" },
  { name: "Putingkahoy", lat: 13.8349, lng: 121.3227, type: "coastal" },
  { name: "Quilib", lat: 13.8603, lng: 121.2002, type: "mountainous" },
  { name: "Salao", lat: 13.8578, lng: 121.3455, type: "coastal" },
  { name: "San Carlos", lat: 13.8478, lng: 121.2475, type: "commercial" },
  { name: "San Ignacio", lat: 13.8335, lng: 121.1764, type: "mountainous" },
  { name: "San Isidro", lat: 13.8074, lng: 121.3152, type: "coastal" },
  { name: "San Jose", lat: 13.8419, lng: 121.2329, type: "commercial" },
  { name: "San Roque", lat: 13.8518, lng: 121.2039, type: "residential" },
  { name: "Santa Cruz", lat: 13.8599, lng: 121.1853, type: "mountainous" },
  { name: "Timbugan", lat: 13.8095, lng: 121.1869, type: "agricultural" },
  { name: "Tiquiwan", lat: 13.8284, lng: 121.2399, type: "residential" },
  { name: "Tulos", lat: 13.7231, lng: 121.2971, type: "mountainous" },
];

// Key landmarks and facilities
const keyLandmarks = [
  { name: "Municipal Hall", lat: 13.8454, lng: 121.2089, type: "government", description: "Rosario Municipal Government Center" },
  { name: "Rosario Central School", lat: 13.8442, lng: 121.2095, type: "education", description: "Primary Educational Institution" },
  { name: "Public Market", lat: 13.8448, lng: 121.2078, type: "commercial", description: "Main Commercial Center" },
  { name: "Health Center", lat: 13.8460, lng: 121.2085, type: "healthcare", description: "Municipal Health Facility" },
  { name: "Catholic Church", lat: 13.8445, lng: 121.2092, type: "religious", description: "St. Isidore Parish Church" },
];

// Define marker colors for different barangay types
const getBarangayColor = (type: string) => {
  const colors = {
    urban: '#3B82F6',      // Blue
    residential: '#10B981', // Green
    commercial: '#F59E0B',  // Yellow
    agricultural: '#8B5CF6', // Purple
    coastal: '#06B6D4',     // Cyan
    mountainous: '#84CC16', // Lime
  };
  return colors[type as keyof typeof colors] || '#6B7280';
};

// Define landmark colors
const getLandmarkColor = (type: string) => {
  const colors = {
    government: '#DC2626',  // Red
    education: '#7C3AED',   // Violet
    commercial: '#F59E0B',  // Amber
    healthcare: '#059669',  // Emerald
    religious: '#BE185D',   // Pink
  };
  return colors[type as keyof typeof colors] || '#6B7280';
};

// Custom marker icons
const createCustomIcon = (color: string, isLandmark: boolean = false) => {
  const size = isLandmark ? 35 : 25;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: ${isLandmark ? '16px' : '12px'};
    ">${isLandmark ? '★' : '●'}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map bounds for Rosario, Batangas (updated to include all barangays)
const rosarioBounds = {
  north: 13.87,
  south: 13.70,
  east: 121.35,
  west: 121.16,
};

// Map center (Municipal Hall area)
const MAP_CENTER: [number, number] = [13.8454, 121.2089];

interface MapControlsProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  showLandmarks: boolean;
  onToggleLandmarks: (show: boolean) => void;
}

const MapControls: React.FC<MapControlsProps> = ({ 
  activeFilter, 
  onFilterChange, 
  showLandmarks, 
  onToggleLandmarks 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const filterOptions = [
    { value: 'all', label: 'All Barangays', color: '#6B7280' },
    { value: 'urban', label: 'Urban', color: '#3B82F6' },
    { value: 'residential', label: 'Residential', color: '#10B981' },
    { value: 'commercial', label: 'Commercial', color: '#F59E0B' },
    { value: 'agricultural', label: 'Agricultural', color: '#8B5CF6' },
    { value: 'coastal', label: 'Coastal', color: '#06B6D4' },
    { value: 'mountainous', label: 'Mountainous', color: '#84CC16' },
  ];

  return (
    <>
      {/* Desktop Controls */}
      <div className="hidden md:block absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="font-bold text-lg mb-3 text-gray-800">Map Controls</h3>
        
        {/* Filter Options */}
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2 text-gray-700">Filter by Type:</h4>
          <div className="space-y-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onFilterChange(option.value)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition-colors ${
                  activeFilter === option.value 
                    ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: option.color }}
                ></div>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Landmarks Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showLandmarks}
              onChange={(e) => onToggleLandmarks(e.target.checked)}
              className="rounded"
            />
            Show Key Landmarks
          </label>
        </div>

        {/* Legend */}
        <div className="border-t pt-3">
          <h4 className="font-semibold text-sm mb-2 text-gray-700">Legend:</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>● Barangay</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">★</div>
              <span>★ Landmark</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="md:hidden">
        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3 flex items-center gap-2"
        >
          <i className="ri-settings-3-line text-lg text-gray-700"></i>
          <span className="text-sm font-medium text-gray-700">Controls</span>
          <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-gray-700 transition-transform`}></i>
        </button>

        {/* Mobile Expanded Controls */}
        {isExpanded && (
          <div className="absolute top-16 left-4 right-4 z-[1000] bg-white rounded-lg shadow-xl p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-800">Map Controls</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <i className="ri-close-line text-gray-500"></i>
              </button>
            </div>
            
            {/* Mobile Filter Options */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-3 text-gray-700">Filter by Type:</h4>
              <div className="grid grid-cols-2 gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onFilterChange(option.value);
                      // Don't close on mobile to allow multiple selections
                    }}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      activeFilter === option.value 
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: option.color }}
                    ></div>
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Landmarks Toggle */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showLandmarks}
                  onChange={(e) => onToggleLandmarks(e.target.checked)}
                  className="rounded w-4 h-4"
                />
                <span className="font-medium">Show Key Landmarks</span>
              </label>
            </div>

            {/* Mobile Legend */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3 text-gray-700">Legend:</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <span>Barangay</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">★</div>
                  <span>Landmark</span>
                </div>
              </div>
            </div>

            {/* Mobile Quick Actions */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onFilterChange('all');
                    onToggleLandmarks(true);
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Backdrop */}
        {isExpanded && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-[999]"
            onClick={() => setIsExpanded(false)}
          ></div>
        )}
      </div>
    </>
  );
};

const RosarioMap: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Filter barangays based on active filter
  const filteredBarangays = activeFilter === 'all' 
    ? rosarioBarangays 
    : rosarioBarangays.filter(b => b.type === activeFilter);

  // Ensure Leaflet CSS is loaded
  useEffect(() => {
    const link = document.querySelector('link[href*="leaflet"]');
    if (!link) {
      const newLink = document.createElement('link');
      newLink.rel = 'stylesheet';
      newLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      newLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      newLink.crossOrigin = '';
      document.head.appendChild(newLink);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <div className="bg-green-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            {/* Back Arrow */}
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200 group"
              aria-label="Go back"
            >
              <i className="ri-arrow-left-line text-xl text-white group-hover:text-green-100"></i>
            </button>
            
            {/* Title and Description */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Interactive Map of Rosario, Batangas</h1>
              <p className="text-green-100">
                Explore all {rosarioBarangays.length} barangays and key landmarks in our municipality
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[calc(100vh-200px)]">
        <MapContainer
          center={MAP_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          maxBounds={[
            [rosarioBounds.south - 0.01, rosarioBounds.west - 0.01],
            [rosarioBounds.north + 0.01, rosarioBounds.east + 0.01]
          ]}
          minZoom={11}
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Municipal Boundary Circle */}
          <Circle
            center={MAP_CENTER}
            radius={8000}
            fillColor="green"
            fillOpacity={0.1}
            color="green"
            weight={2}
            opacity={0.6}
          />

          {/* Barangay Markers */}
          {filteredBarangays.map((barangay) => (
            <Marker
              key={barangay.name}
              position={[barangay.lat, barangay.lng]}
              icon={createCustomIcon(getBarangayColor(barangay.type))}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg text-gray-800">Barangay {barangay.name}</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="font-semibold">Type:</span> {barangay.type.charAt(0).toUpperCase() + barangay.type.slice(1)}</p>
                    <p><span className="font-semibold">Coordinates:</span> {barangay.lat.toFixed(4)}, {barangay.lng.toFixed(4)}</p>
                    <p><span className="font-semibold">Municipality:</span> Rosario, Batangas</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => window.open(
                        `https://maps.google.com/?q=${barangay.lat},${barangay.lng}`,
                        '_blank'
                      )}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View in Google Maps →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Landmark Markers */}
          {showLandmarks && keyLandmarks.map((landmark) => (
            <Marker
              key={landmark.name}
              position={[landmark.lat, landmark.lng]}
              icon={createCustomIcon(getLandmarkColor(landmark.type), true)}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg text-gray-800">{landmark.name}</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p><span className="font-semibold">Type:</span> {landmark.type.charAt(0).toUpperCase() + landmark.type.slice(1)}</p>
                    <p><span className="font-semibold">Description:</span> {landmark.description}</p>
                    <p><span className="font-semibold">Coordinates:</span> {landmark.lat.toFixed(4)}, {landmark.lng.toFixed(4)}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => window.open(
                        `https://maps.google.com/?q=${landmark.lat},${landmark.lng}`,
                        '_blank'
                      )}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View in Google Maps →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map Controls */}
        <MapControls
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          showLandmarks={showLandmarks}
          onToggleLandmarks={setShowLandmarks}
        />
      </div>

      {/* Info Panel */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{rosarioBarangays.length}</div>
              <div className="text-sm text-gray-600">Total Barangays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{keyLandmarks.length}</div>
              <div className="text-sm text-gray-600">Key Landmarks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">~50 km²</div>
              <div className="text-sm text-gray-600">Total Area</div>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>© 2024 MDRRMO Rosario, Batangas. Interactive map for disaster risk reduction and emergency response.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RosarioMap;
