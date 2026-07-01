import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <ReportListRoute /> },
      { path: 'reports/new', element: <ReportNewRoute /> },
      { path: 'reports/:id', element: <ReportDetailRoute /> },
      { path: 'reports/:id/edit', element: <ReportEditRoute /> },
      {
        path: 'map',
        element: (
          <Suspense fallback={<MapFallback />}>
            <MapRoute />
          </Suspense>
        ),
      },
      { path: 'settings', element: <SettingsRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
