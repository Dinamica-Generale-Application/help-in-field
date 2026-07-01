/**
 * Geolocation distance calculation utilities.
 * Ported from old/src/domain/geolocation.ts — adapted for web SPA.
 *
 * All distances are round-trip and rounded to integer km.
 */

import type { Coordinates } from '@/types';

export interface TravelEstimate {
  /** Distance in km (round-trip), rounded to integer */
  distanceKm: number;
  /** Source of the estimate */
  source: 'routing_api' | 'offline_estimate';
}

// --- Constants ---

/** Earth's mean radius in km */
const EARTH_RADIUS_KM = 6371;

/** Default road correction factor (straight-line → road distance) */
const DEFAULT_ROAD_FACTOR = 1.3;

// --- Haversine formula ---

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate straight-line distance between two points using Haversine formula.
 * Returns distance in km.
 */
export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// --- Offline estimate ---

/**
 * Estimate round-trip distance offline using Haversine × roadFactor × 2.
 * Result is rounded to integer km.
 */
export function estimateOfflineDistance(
  from: Coordinates,
  to: Coordinates,
  roadFactor: number = DEFAULT_ROAD_FACTOR,
): TravelEstimate {
  const straightLineKm = haversineDistance(from, to);
  const estimatedRoadKm = straightLineKm * roadFactor;
  const roundTripKm = Math.round(estimatedRoadKm * 2);

  return {
    distanceKm: roundTripKm,
    source: 'offline_estimate',
  };
}

// --- OpenRouteService API ---

/**
 * Calculate round-trip distance via OpenRouteService directions API.
 * Result is rounded to integer km.
 *
 * @throws Error if the request fails
 */
export async function estimateWithRouting(
  from: Coordinates,
  to: Coordinates,
  apiKey: string,
): Promise<TravelEstimate> {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // GeoJSON response: features[0].properties.summary
  const properties = data?.features?.[0]?.properties?.summary;
  if (!properties) {
    throw new Error('OpenRouteService: risposta non valida');
  }

  // distance is in meters (one way)
  const oneWayDistanceKm = properties.distance / 1000;
  const roundTripKm = Math.round(oneWayDistanceKm * 2);

  return {
    distanceKm: roundTripKm,
    source: 'routing_api',
  };
}

// --- Hybrid approach ---

/**
 * Calculate round-trip distance with hybrid approach:
 * - If API key is available, try OpenRouteService
 * - On failure or no key, fallback to offline estimate
 *
 * Result is always rounded to integer km.
 */
export async function estimateDistance(
  from: Coordinates,
  to: Coordinates,
  options?: { apiKey?: string; roadFactor?: number },
): Promise<TravelEstimate> {
  if (options?.apiKey) {
    try {
      return await estimateWithRouting(from, to, options.apiKey);
    } catch {
      // Fallback silently to offline estimate
    }
  }

  return estimateOfflineDistance(from, to, options?.roadFactor);
}
