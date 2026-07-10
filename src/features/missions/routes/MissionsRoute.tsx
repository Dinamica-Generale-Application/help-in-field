/**
 * MissionsRoute — page for creating missions to share with the service team.
 */

import { MissionForm } from '../components/MissionForm';

export function MissionsRoute() {
  return (
    <div className="p-4">
      <MissionForm />
    </div>
  );
}
