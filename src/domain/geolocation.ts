/**
 * Modulo Geolocalizzazione - Calcolo distanza e tempo di viaggio
 *
 * Approccio ibrido:
 * 1. Prova a usare OpenRouteService API per distanza/tempo reali (richiede connessione)
 * 2. Fallback sulla formula di Haversine + fattore correttivo per stima offline
 *
 * Entrambi i calcoli restituiscono andata e ritorno.
 */

// --- Tipi ---

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TravelEstimate {
  /** Distanza in km (andata e ritorno) */
  distanceKm: number;
  /** Tempo di viaggio stimato in ore (andata e ritorno) */
  travelTimeHours: number;
  /** Sorgente della stima */
  source: 'routing_api' | 'offline_estimate';
}

export interface GeolocationConfig {
  /** Chiave API per OpenRouteService (opzionale) */
  openRouteServiceApiKey?: string;
  /** Fattore correttivo per la stima offline (default 1.3) */
  roadFactor?: number;
  /** Velocità media stimata in km/h per calcolo offline (default 50) */
  averageSpeedKmh?: number;
}

// --- Costanti ---

/** Raggio medio della Terra in km */
const EARTH_RADIUS_KM = 6371;

/** Fattore correttivo per approssimare percorso stradale dalla distanza in linea d'aria */
const DEFAULT_ROAD_FACTOR = 1.3;

/** Velocità media stimata per percorsi misti (km/h) */
const DEFAULT_AVERAGE_SPEED_KMH = 50;

// --- Formula di Haversine ---

/**
 * Calcola la distanza in km tra due punti sulla superficie terrestre
 * usando la formula di Haversine (distanza geodetica in linea d'aria).
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

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// --- Stima offline ---

/**
 * Calcola distanza e tempo di viaggio con stima offline (Haversine + fattore correttivo).
 * Restituisce andata e ritorno.
 */
export function estimateOffline(
  from: Coordinates,
  to: Coordinates,
  config?: GeolocationConfig
): TravelEstimate {
  const roadFactor = config?.roadFactor ?? DEFAULT_ROAD_FACTOR;
  const averageSpeed = config?.averageSpeedKmh ?? DEFAULT_AVERAGE_SPEED_KMH;

  const straightLineKm = haversineDistance(from, to);
  const estimatedRoadKm = straightLineKm * roadFactor;

  // Andata e ritorno
  const roundTripKm = roundTo1(estimatedRoadKm * 2);
  const travelTimeHours = roundTo2(roundTripKm / averageSpeed);

  return {
    distanceKm: roundTripKm,
    travelTimeHours,
    source: 'offline_estimate',
  };
}

// --- API OpenRouteService ---

/**
 * Calcola distanza e tempo di viaggio tramite OpenRouteService API.
 * Restituisce andata e ritorno.
 *
 * @throws Error se la richiesta fallisce o la chiave API non è configurata
 */
export async function estimateWithRouting(
  from: Coordinates,
  to: Coordinates,
  apiKey: string
): Promise<TravelEstimate> {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // La risposta GeoJSON contiene le proprietà nel primo feature
  const properties = data?.features?.[0]?.properties?.summary;
  if (!properties) {
    throw new Error('OpenRouteService: risposta non valida');
  }

  // distance è in metri, duration è in secondi (sola andata)
  const oneWayDistanceKm = properties.distance / 1000;
  const oneWayDurationHours = properties.duration / 3600;

  // Andata e ritorno
  return {
    distanceKm: roundTo1(oneWayDistanceKm * 2),
    travelTimeHours: roundTo2(oneWayDurationHours * 2),
    source: 'routing_api',
  };
}

// --- Approccio ibrido ---

/**
 * Calcola distanza e tempo di viaggio con approccio ibrido:
 * - Se c'è una API key e connessione, usa OpenRouteService
 * - Altrimenti fallback sulla stima offline
 *
 * Restituisce sempre andata e ritorno.
 */
export async function estimateTravel(
  from: Coordinates,
  to: Coordinates,
  config?: GeolocationConfig
): Promise<TravelEstimate> {
  // Se abbiamo una API key, proviamo il routing
  if (config?.openRouteServiceApiKey) {
    try {
      return await estimateWithRouting(from, to, config.openRouteServiceApiKey);
    } catch {
      // Fallback silenzioso alla stima offline
    }
  }

  // Stima offline
  return estimateOffline(from, to, config);
}

// --- Utility ---

function roundTo1(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Arrotonda le ore al quarto d'ora più vicino (incrementi di 0.25).
 * Utile per precompilare il campo ore di viaggio nel form.
 */
export function roundToQuarterHour(hours: number): number {
  return Math.round(hours * 4) / 4;
}
