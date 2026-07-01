/**
 * Hook per il calcolo automatico di km e tempo di viaggio.
 *
 * Rileva la posizione GPS corrente dell'intervento e calcola
 * distanza/tempo dalla posizione di partenza fissa (impostazioni).
 * Approccio ibrido: routing API con fallback offline.
 */

import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { estimateTravel, roundToQuarterHour, type Coordinates, type TravelEstimate } from '../domain/geolocation';
import { useSettingsStore } from '../store/settings-store';

export interface LocationEstimateState {
  /** Stima calcolata (null se non ancora calcolata) */
  estimate: TravelEstimate | null;
  /** Coordinate rilevate per la posizione dell'intervento */
  interventionCoords: Coordinates | null;
  /** Calcolo in corso */
  isCalculating: boolean;
  /** Errore (null se ok) */
  error: string | null;
}

export interface LocationEstimateActions {
  /** Rileva posizione GPS e calcola km/tempo */
  calculateFromCurrentPosition: () => Promise<TravelEstimate | null>;
  /** Calcola da coordinate specifiche (se già note) */
  calculateFromCoordinates: (coords: Coordinates) => Promise<TravelEstimate | null>;
  /** Reset dello stato */
  reset: () => void;
}

export type UseLocationEstimateReturn = LocationEstimateState & LocationEstimateActions;

/**
 * Hook per il calcolo automatico km e tempo di viaggio.
 *
 * Uso tipico:
 * ```tsx
 * const { estimate, isCalculating, error, calculateFromCurrentPosition } = useLocationEstimate();
 *
 * // Al tap su "Calcola km":
 * const result = await calculateFromCurrentPosition();
 * if (result) {
 *   updateFormField('kilometers', result.distanceKm);
 *   // result.travelTimeHours disponibile per ore di viaggio
 * }
 * ```
 */
export function useLocationEstimate(): UseLocationEstimateReturn {
  const [estimate, setEstimate] = useState<TravelEstimate | null>(null);
  const [interventionCoords, setInterventionCoords] = useState<Coordinates | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateFromCoordinates = useCallback(async (coords: Coordinates): Promise<TravelEstimate | null> => {
    const { homeCoordinates, getGeolocationConfig } = useSettingsStore.getState();

    if (!homeCoordinates) {
      setError('Posizione di partenza non configurata. Vai su Impostazioni per impostarla.');
      return null;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const config = getGeolocationConfig();
      const result = await estimateTravel(homeCoordinates, coords, config);

      setEstimate(result);
      setInterventionCoords(coords);
      setIsCalculating(false);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Errore nel calcolo della distanza';
      setError(message);
      setIsCalculating(false);
      return null;
    }
  }, []);

  const calculateFromCurrentPosition = useCallback(async (): Promise<TravelEstimate | null> => {
    setIsCalculating(true);
    setError(null);

    try {
      // Richiedi permesso GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permesso GPS negato. Abilita la localizzazione nelle impostazioni del dispositivo.');
        setIsCalculating(false);
        return null;
      }

      // Rileva posizione corrente
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords: Coordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Delega il calcolo
      setIsCalculating(false);
      return await calculateFromCoordinates(coords);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Impossibile rilevare la posizione GPS';
      setError(message);
      setIsCalculating(false);
      return null;
    }
  }, [calculateFromCoordinates]);

  const reset = useCallback(() => {
    setEstimate(null);
    setInterventionCoords(null);
    setError(null);
    setIsCalculating(false);
  }, []);

  return {
    estimate,
    interventionCoords,
    isCalculating,
    error,
    calculateFromCurrentPosition,
    calculateFromCoordinates,
    reset,
  };
}
