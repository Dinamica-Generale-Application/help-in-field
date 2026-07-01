/**
 * MapRoute — page wrapper that renders the InterventionMap.
 * Already lazy-loaded in the router via React.lazy.
 */

import { InterventionMap } from '../components/InterventionMap';

export function MapRoute() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Mappa Interventi</h1>
      <InterventionMap />
    </div>
  );
}
