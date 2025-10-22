interface GeocodingCache {
  [key: string]: {
    locationName: string;
    timestamp: number;
    expiresAt: number;
  };
}

interface GeocodingRequest {
  lat: number;
  lng: number;
  resolve: (locationName: string) => void;
  reject: (error: Error) => void;
}

class OptimizedGeocodingService {
  private cache: GeocodingCache = {};
  private pendingRequests: { [key: string]: GeocodingRequest[] } = {};
  private rateLimitDelay = 100; // 100ms between requests
  private lastRequestTime = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_BATCH_SIZE = 5; // Process max 5 requests per batch
  private readonly BATCH_DELAY = 200; // 200ms delay between batches

  constructor() {
    this.loadCacheFromStorage();
  }

  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem('geocoding_cache');
      if (cached) {
        this.cache = JSON.parse(cached);
        // Clean expired entries
        this.cleanExpiredCache();
      }
    } catch (error) {
      console.warn('Failed to load geocoding cache from localStorage:', error);
      this.cache = {};
    }
  }

  private saveCacheToStorage(): void {
    try {
      localStorage.setItem('geocoding_cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save geocoding cache to localStorage:', error);
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    let hasChanges = false;

    Object.keys(this.cache).forEach(key => {
      if (this.cache[key].expiresAt < now) {
        delete this.cache[key];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.saveCacheToStorage();
    }
  }

  private generateCacheKey(lat: number, lng: number): string {
    // Round to 4 decimal places for better cache hit rate
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }

  private async makeGeocodingRequest(lat: number, lng: number): Promise<string> {
    const now = Date.now();

    // Rate limiting
    if (now - this.lastRequestTime < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - (now - this.lastRequestTime)));
    }

    this.lastRequestTime = Date.now();

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PROTEQ-MDRRMO/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract location name from response
      let locationName = '';

      if (data.display_name) {
        // Parse the display_name to get a more readable format
        const parts = data.display_name.split(', ');
        // Take the first 3 parts for a concise location name
        locationName = parts.slice(0, 3).join(', ');
      } else if (data.address) {
        // Fallback to address components
        const address = data.address;
        if (address.road && address.city) {
          locationName = `${address.road}, ${address.city}`;
        } else if (address.city) {
          locationName = address.city;
        } else if (address.town) {
          locationName = address.town;
        } else if (address.village) {
          locationName = address.village;
        } else {
          locationName = 'Unknown Location';
        }
      } else {
        locationName = 'Unknown Location';
      }

      return locationName;
    } catch (error) {
      console.error('Geocoding request failed:', error);
      throw error;
    }
  }

  private async processBatch(requests: GeocodingRequest[]): Promise<void> {
    const promises = requests.map(async (request) => {
      try {
        const locationName = await this.makeGeocodingRequest(request.lat, request.lng);
        request.resolve(locationName);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error('Geocoding failed'));
      }
    });

    await Promise.allSettled(promises);

    // Wait before processing next batch
    if (Object.keys(this.pendingRequests).length > 0) {
      await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
    }
  }

  async getLocationName(lat: number, lng: number): Promise<string> {
    const cacheKey = this.generateCacheKey(lat, lng);
    const now = Date.now();

    // Check cache first
    const cached = this.cache[cacheKey];
    if (cached && cached.expiresAt > now) {
      return cached.locationName;
    }

    // Check if request is already pending
    if (this.pendingRequests[cacheKey]) {
      return new Promise((resolve, reject) => {
        this.pendingRequests[cacheKey].push({ lat, lng, resolve, reject });
      });
    }

    // Create new request
    return new Promise(async (resolve, reject) => {
      this.pendingRequests[cacheKey] = [{ lat, lng, resolve, reject }];

      try {
        const locationName = await this.makeGeocodingRequest(lat, lng);

        // Cache the result
        this.cache[cacheKey] = {
          locationName,
          timestamp: now,
          expiresAt: now + this.CACHE_DURATION
        };
        this.saveCacheToStorage();

        // Resolve all pending requests for this location
        const pending = this.pendingRequests[cacheKey];
        delete this.pendingRequests[cacheKey];

        pending.forEach(req => req.resolve(locationName));

      } catch (error) {
        // Reject all pending requests for this location
        const pending = this.pendingRequests[cacheKey];
        delete this.pendingRequests[cacheKey];

        pending.forEach(req => req.reject(error instanceof Error ? error : new Error('Geocoding failed')));

        // Fallback to coordinates
        const fallbackLocation = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        resolve(fallbackLocation);
      }
    });
  }

  async getLocationNamesBatch(coordinates: Array<{lat: number, lng: number}>): Promise<string[]> {
    const results: string[] = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < coordinates.length; i += this.MAX_BATCH_SIZE) {
      const batch = coordinates.slice(i, i + this.MAX_BATCH_SIZE);
      const batchPromises = batch.map(coord => this.getLocationName(coord.lat, coord.lng));

      const batchResults = await Promise.allSettled(batchPromises);
      const batchLocations = batchResults.map(result =>
        result.status === 'fulfilled' ? result.value : 'Unknown Location'
      );

      results.push(...batchLocations);

      // Add delay between batches
      if (i + this.MAX_BATCH_SIZE < coordinates.length) {
        await new Promise(resolve => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    return results;
  }

  clearCache(): void {
    this.cache = {};
    localStorage.removeItem('geocoding_cache');
  }

  getCacheStats(): { total: number; expired: number; valid: number } {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    Object.values(this.cache).forEach(entry => {
      if (entry.expiresAt < now) {
        expired++;
      } else {
        valid++;
      }
    });

    return {
      total: expired + valid,
      expired,
      valid
    };
  }
}

// Export singleton instance
export const optimizedGeocoding = new OptimizedGeocodingService();

// Export class for testing purposes
export { OptimizedGeocodingService };
