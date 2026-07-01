/**
 * InterventionMap — OSM map showing markers for reports with GPS coordinates.
 * Uses react-leaflet with OpenStreetMap tiles.
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { useReportStore } from '@/features/reports/stores/reportStore';
import { formatDate } from '@/utils/format';
import type { Report } from '@/features/reports/types';

// Fix default marker icon issue with Vite bundler
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

/** Report with guaranteed GPS coordinates */
interface GeoReport {
  id: string;
  companyName: string;
  interventionDate: string;
  lat: number;
  lon: number;
}

/** Extracts reports that have valid GPS coordinates */
function getGeoReports(reports: Report[]): GeoReport[] {
  return reports
    .filter(
      (r): r is Report & { interventionLat: number; interventionLon: number } =>
        r.interventionLat != null && r.interventionLon != null,
    )
    .map((r) => ({
      id: r.id,
      companyName: r.companyName,
      interventionDate: r.interventionDate,
      lat: r.interventionLat,
      lon: r.interventionLon,
    }));
}

/** Auto-fit map bounds to markers */
function FitBounds({ geoReports }: { geoReports: GeoReport[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;
    if (geoReports.length === 0) return;

    if (geoReports.length === 1) {
      const { lat, lon } = geoReports[0]!;
      map.setView([lat, lon], 13);
    } else {
      const bounds = L.latLngBounds(geoReports.map((r) => [r.lat, r.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    fitted.current = true;
  }, [map, geoReports]);

  return null;
}

export function InterventionMap() {
  const reports = useReportStore((s) => s.reports);
  const geoReports = getGeoReports(reports);

  if (geoReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Nessun intervento con posizione GPS
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Usa 📍 Rileva posizione nel form per registrare le coordinate.
        </p>
      </div>
    );
  }

  // Default center: first marker (will be overridden by FitBounds)
  const defaultCenter: [number, number] = [geoReports[0]!.lat, geoReports[0]!.lon];

  return (
    <div className="h-[calc(100vh-8rem)] w-full min-h-[400px]">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-full w-full rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds geoReports={geoReports} />
        {geoReports.map((report) => (
          <Marker key={report.id} position={[report.lat, report.lon]}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold">{report.companyName}</p>
                <p>{formatDate(report.interventionDate)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
