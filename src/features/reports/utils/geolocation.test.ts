import { describe, it, expect } from 'vitest';
import { haversineDistance, estimateOfflineDistance } from './geolocation';
import type { Coordinates } from '@/types';

describe('haversineDistance', () => {
  it('returns 0 for same coordinates', () => {
    const point: Coordinates = { latitude: 45.4642, longitude: 9.19 };
    expect(haversineDistance(point, point)).toBe(0);
  });

  it('calculates distance between Milano and Roma (~477 km)', () => {
    const milano: Coordinates = { latitude: 45.4642, longitude: 9.19 };
    const roma: Coordinates = { latitude: 41.9028, longitude: 12.4964 };
    const distance = haversineDistance(milano, roma);
    expect(distance).toBeGreaterThan(470);
    expect(distance).toBeLessThan(490);
  });

  it('calculates short distance between nearby points', () => {
    const a: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const b: Coordinates = { latitude: 45.09, longitude: 9.0 };
    const distance = haversineDistance(a, b);
    expect(distance).toBeGreaterThan(9);
    expect(distance).toBeLessThan(11);
  });
});

describe('estimateOfflineDistance', () => {
  it('returns round-trip distance with default road factor (1.3)', () => {
    const from: Coordinates = { latitude: 45.4642, longitude: 9.19 };
    const to: Coordinates = { latitude: 45.5, longitude: 9.25 };
    const result = estimateOfflineDistance(from, to);

    // Straight line ~5.6 km, × 1.3 × 2 ≈ 15 km
    expect(result.distanceKm).toBeGreaterThan(10);
    expect(result.distanceKm).toBeLessThan(20);
    expect(result.source).toBe('offline_estimate');
  });

  it('returns integer km (rounded)', () => {
    const from: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const to: Coordinates = { latitude: 45.1, longitude: 9.0 };
    const result = estimateOfflineDistance(from, to);
    expect(Number.isInteger(result.distanceKm)).toBe(true);
  });

  it('respects custom road factor', () => {
    const from: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const to: Coordinates = { latitude: 45.1, longitude: 9.0 };

    const result13 = estimateOfflineDistance(from, to, 1.3);
    const result20 = estimateOfflineDistance(from, to, 2.0);

    expect(result20.distanceKm).toBeGreaterThan(result13.distanceKm);
  });

  it('returns 0 for same point', () => {
    const point: Coordinates = { latitude: 45.0, longitude: 9.0 };
    const result = estimateOfflineDistance(point, point);
    expect(result.distanceKm).toBe(0);
  });
});
