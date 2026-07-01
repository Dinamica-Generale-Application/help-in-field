import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layouts/AppLayout';
import { NotFoundRoute } from './routes/NotFoundRoute';
import { ReportListRoute } from '@/features/reports/routes/ReportListRoute';
import { ReportNewRoute } from '@/features/reports/routes/ReportNewRoute';
import { ReportEditRoute } from '@/features/reports/routes/ReportEditRoute';
import { ReportDetailRoute } from '@/features/reports/routes/ReportDetailRoute';
import { SettingsRoute } from '@/features/settings/routes/SettingsRoute';

// Lazy-loaded route for map (heavy dependency: react-leaflet)
const MapRoute = lazy(() =>
  import('@/features/map/routes/MapRoute').then((m) => ({ default: m.MapRoute })),
);

function MapFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Caricamento mappa…</p>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Report routes */}
          <Route index element={<ReportListRoute />} />
          <Route path="reports/new" element={<ReportNewRoute />} />
          <Route path="reports/:id" element={<ReportDetailRoute />} />
          <Route path="reports/:id/edit" element={<ReportEditRoute />} />

          {/* Map (lazy loaded) */}
          <Route
            path="map"
            element={
              <Suspense fallback={<MapFallback />}>
                <MapRoute />
              </Suspense>
            }
          />

          {/* Settings */}
          <Route path="settings" element={<SettingsRoute />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
