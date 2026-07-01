/**
 * GPS detection button — "📍 Rileva posizione"
 * Shows loading spinner during detection, error inline if GPS fails.
 * On success, calls onResult with coordinates, address, and calculated km.
 */

import { Loader2, MapPin } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSettingsStore } from '@/features/settings/stores/settingsStore';
import { estimateDistance } from '../utils/geolocation';

export interface GpsResult {
  latitude: number;
  longitude: number;
  address: string | null;
  kilometers: number | null;
}

interface GpsButtonProps {
  onResult: (result: GpsResult) => void;
}

export function GpsButton({ onResult }: GpsButtonProps) {
  const { getPosition, isLoading, error } = useGeolocation();
  const homeCoordinates = useSettingsStore((s) => s.homeCoordinates);
  const openRouteServiceApiKey = useSettingsStore((s) => s.openRouteServiceApiKey);
  const roadFactor = useSettingsStore((s) => s.roadFactor);

  const handleClick = async () => {
    const result = await getPosition();
    if (!result) return;

    let kilometers: number | null = null;

    // Calculate distance only if home coordinates are configured
    if (homeCoordinates) {
      try {
        const estimate = await estimateDistance(
          homeCoordinates,
          result.coordinates,
          {
            apiKey: openRouteServiceApiKey || undefined,
            roadFactor,
          },
        );
        kilometers = estimate.distanceKm;
      } catch {
        // Distance calculation failed — leave km as null
      }
    }

    onResult({
      latitude: result.coordinates.latitude,
      longitude: result.coordinates.longitude,
      address: result.address,
      kilometers,
    });
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        aria-label="Rileva posizione GPS"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        {isLoading ? 'Rilevamento…' : '📍 Rileva posizione'}
      </button>

      {error && (
        <p className="text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
