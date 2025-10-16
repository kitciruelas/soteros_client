import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon for coordinate selection
const coordinateMarkerIcon = L.divIcon({
  html: `
    <div style="
      background-color: #3b82f6;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  className: 'coordinate-picker-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface CoordinatePickerProps {
  latitude: number | null;
  longitude: number | null;
  onCoordinateChange: (lat: number, lng: number) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

// Map click handler component
const MapClickHandler: React.FC<{ onCoordinateChange: (lat: number, lng: number) => void }> = ({ onCoordinateChange }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onCoordinateChange(lat, lng);
    },
  });
  return null;
};

const CoordinatePicker: React.FC<CoordinatePickerProps> = ({
  latitude,
  longitude,
  onCoordinateChange,
  height = '300px',
  center = [13.7565, 121.3851], // Default to San Juan, Batangas
  zoom = 13
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  // Update map center when coordinates change
  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  // Safe coordinate formatting function
  const formatCoordinate = (coord: number | null): string => {
    if (coord === null || coord === undefined || isNaN(coord)) {
      return 'N/A';
    }
    return coord.toFixed(6);
  };

  return (
    <div className="w-full">
      <div
        className="w-full rounded-lg overflow-hidden border border-gray-300"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapClickHandler onCoordinateChange={onCoordinateChange} />

          {/* Selected coordinate marker */}
          {latitude && longitude && (
            <Marker
              position={[latitude, longitude]}
              icon={coordinateMarkerIcon}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Click on the map to select coordinates. Selected: {formatCoordinate(latitude)}, {formatCoordinate(longitude)}
      </div>
    </div>
  );
};

export default CoordinatePicker;
