/**
 * Tests per il modulo geolocation.
 */

import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  estimateOffline,
  roundToQuarterHour,
  type Coordinates,
} from './geolocation';

describe('haversineDistance', () => {
  it('should return 0 for same coordinates', () => {
    const point: Coordinates = { latitude: 45.4642, longitude: 9.19 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('should calculate distance between Milano and Roma (~480 km)', () => {
    const milano: Coordinates = { latitude: 45.4642, longitude: 9.19 };
    const roma: Coordinates = { latitude: 41.9028, longitude: 12.4964 };
    const distance = haversineDistance(milano, roma);
    // ~477 km in linea d'aria
    expect(distance).toBeGreaterThan(470);
    expect(distance).toBeLessThan(490);
  });

  it('should calculate distance between two nearby points', () => {
    // ~10 km apart
    const a: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const b: Coordinates = { latitude: 45.09, longitude: 9.0 };
    const distance = haversineDistance(a, b);
    expect(distance).toBeGreaterThan(9);
    expect(distance).toBeLessThan(11);
  });
});

describe('estimateOffline', () => {
  it('should return round-trip distance with road factor', () => {
    const from: Coordinates = { latitude: 45.4642, longitude: 9.19 };
    const to: Coordinates = { latitude: 45.5, longitude: 9.25 };
    const result = estimateOffline(from, to);

    // Distanza linea d'aria ~5.6 km, road factor 1.3, x2 A/R ≈ 14.5 km
    expect(result.distanceKm).toBeGreaterThan(10);
    expect(result.distanceKm).toBeLessThan(20);
    expect(result.source).toBe('offline_estimate');
  });

  it('should calculate travel time based on average speed', () => {
    const from: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const to: Coordinates = { latitude: 45.45, longitude: 9.0 }; // ~50 km linea d'aria
    const result = estimateOffline(from, to, { averageSpeedKmh: 50 });

    // 50km * 1.3 * 2 = 130 km A/R, 130/50 = 2.6h
    expect(result.travelTimeHours).toBeGreaterThan(2);
    expect(result.travelTimeHours).toBeLessThan(3);
  });

  it('should respect custom road factor', () => {
    const from: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const to: Coordinates = { latitude: 45.1, longitude: 9.0 };

    const result13 = estimateOffline(from, to, { roadFactor: 1.3 });
    const result15 = estimateOffline(from, to, { roadFactor: 1.5 });

    expect(result15.distanceKm).toBeGreaterThan(result13.distanceKm);
  });
});

describe('roundToQuarterHour', () => {
  it('should round to nearest 0.25', () => {
    expect(roundToQuarterHour(1.1)).toBe(1.0);
    expect(roundToQuarterHour(1.13)).toBe(1.25);
    expect(roundToQuarterHour(1.37)).toBe(1.25);
    expect(roundToQuarterHour(1.38)).toBe(1.5);
    expect(roundToQuarterHour(2.63)).toBe(2.75);
    expect(roundToQuarterHour(0)).toBe(0);
  });
});
