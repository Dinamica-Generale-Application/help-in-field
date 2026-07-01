/**
 * SettingsRoute — settings page with configuration form and backup/restore.
 */

import { SettingsForm } from '../components/SettingsForm';
import { BackupSection } from '../components/BackupSection';

export function SettingsRoute() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6">
      <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>

      <SettingsForm />

      <hr className="border-border" />

      <BackupSection />
    </div>
  );
}
