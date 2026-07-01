/**
 * Shared geolocation hook — GPS position detection with Nominatim reverse geocoding.
 * Uses navigator.geolocation.getCurrentPosition with 15s timeout.
 */

import { useCallback, useState } from 'react';
import type { Coordinates } from '@/types';

export interface GeolocationResult {
  coordinates: Coordinates;
  address: string | null;
}

export interface UseGeolocationReturn {
  getPosition: () => Promise<GeolocationResult | null>;
  isLoading: boolean;
  error: string | null;
  position: GeolocationResult | null;
}

/** Italian error messages */
const ERROR_PERMISSION_DENIED = 'Permesso GPS negato. Inserisci i km manualmente.';
const ERROR_TIMEOUT = 'Impossibile ottenere la posizione. Riprova o inserisci manualmente.';
const ERROR_GENERIC = 'Errore GPS. Riprova.';
const ERROR_NOT_SUPPORTED = 'Geolocalizzazione non supportata dal browser.';

/**
 * Reverse geocode coordinates via Nominatim (OpenStreetMap).
 * Returns a human-readable address or null on failure.
 */
async function reverseGeocode(coords: Coordinates): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'it' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.display_name || null;
  } catch {
    // Nominatim failure is non-blocking
    return null;
  }
}

/**
 * Hook for getting current GPS position with reverse geocoding.
 */
export function useGeolocation(): UseGeolocationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationResult | null>(null);

  const getPosition = useCallback(async (): Promise<GeolocationResult | null> => {
    if (!navigator.geolocation) {
      setError(ERROR_NOT_SUPPORTED);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const coordinates: Coordinates = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      // Reverse geocode (non-blocking — if it fails we still have coordinates)
      const address = await reverseGeocode(coordinates);

      const result: GeolocationResult = { coordinates, address };
      setPosition(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      let message = ERROR_GENERIC;

      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = ERROR_PERMISSION_DENIED;
            break;
          case err.TIMEOUT:
            message = ERROR_TIMEOUT;
            break;
          default:
            message = ERROR_GENERIC;
        }
      }

      setError(message);
      setIsLoading(false);
      return null;
    }
  }, []);

  return { getPosition, isLoading, error, position };
}
