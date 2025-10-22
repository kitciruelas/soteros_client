interface GeocodeResult {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
    hamlet?: string;
    locality?: string;
  };
}

interface DetailedLocationInfo {
  barangay?: string;
  municipality: string;
  province: string;
  region?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface ReverseGeocodeResponse {
  success: boolean;
  locationName: string;
  detailedInfo?: DetailedLocationInfo;
  error?: string;
}

/**
 * Reverse geocodes coordinates to get location name using OpenStreetMap Nominatim API
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Promise with location name or error
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
  try {
    // Use backend proxy to avoid CORS issues
    const url = `/api/public/geocode?lat=${latitude}&lon=${longitude}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.display_name) {
      return {
        success: false,
        locationName: 'Unknown Location',
        error: data.message || 'No location data found'
      };
    }

    // The backend proxy already processes the location name
    const locationName = data.display_name;
    const detailedInfo: DetailedLocationInfo | undefined = data.detailed_info ? {
      barangay: data.detailed_info.barangay,
      municipality: data.detailed_info.municipality,
      province: data.detailed_info.province,
      region: data.detailed_info.region,
      coordinates: {
        latitude: data.detailed_info.coordinates.latitude,
        longitude: data.detailed_info.coordinates.longitude
      }
    } : undefined;

    return {
      success: true,
      locationName,
      detailedInfo
    };

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      locationName: 'Location Unavailable',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Hook to get location name from coordinates with loading state
 */
export function useReverseGeocode(latitude: number | null, longitude: number | null) {
  const [locationName, setLocationName] = React.useState<string>('Loading location...');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (latitude === null || longitude === null) {
      setLocationName('Location not available');
      return;
    }

    const fetchLocation = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await reverseGeocode(latitude, longitude);
        if (result.success) {
          setLocationName(result.locationName);
        } else {
          setLocationName('Location not found');
          setError(result.error || 'Failed to get location');
        }
      } catch (err) {
        setLocationName('Location error');
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [latitude, longitude]);

  return { locationName, loading, error };
}

// Import React for the hook
import React from 'react';
