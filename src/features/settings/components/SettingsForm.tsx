/**
 * SettingsForm — form for operator settings, headquarters coordinates,
 * API key, road factor, and average speed.
 * Reads/writes to settingsStore with auto-save on change.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useGeolocation } from '@/hooks/useGeolocation';

export function SettingsForm() {
  const {
    operatorCode,
    homeCoordinates,
    homeAddress,
    openRouteServiceApiKey,
    roadFactor,
    averageSpeedKmh,
    updateSettings,
  } = useSettingsStore();

  const { getPosition, isLoading: gpsLoading, error: gpsError } = useGeolocation();

  // Local state for controlled inputs
  const [operatorInput, setOperatorInput] = useState(operatorCode);
  const [latInput, setLatInput] = useState(homeCoordinates?.latitude?.toString() ?? '');
  const [lonInput, setLonInput] = useState(homeCoordinates?.longitude?.toString() ?? '');
  const [addressInput, setAddressInput] = useState(homeAddress);
  const [apiKeyInput, setApiKeyInput] = useState(openRouteServiceApiKey);
  const [roadFactorInput, setRoadFactorInput] = useState(roadFactor.toString());
  const [speedInput, setSpeedInput] = useState(averageSpeedKmh.toString());
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Sync local state when store changes externally (e.g., after import)
  useEffect(() => {
    setOperatorInput(operatorCode);
    setLatInput(homeCoordinates?.latitude?.toString() ?? '');
    setLonInput(homeCoordinates?.longitude?.toString() ?? '');
    setAddressInput(homeAddress);
    setApiKeyInput(openRouteServiceApiKey);
    setRoadFactorInput(roadFactor.toString());
    setSpeedInput(averageSpeedKmh.toString());
  }, [operatorCode, homeCoordinates, homeAddress, openRouteServiceApiKey, roadFactor, averageSpeedKmh]);

  const showSaved = useCallback(() => {
    setSavedMessage('Salvato ✓');
    setTimeout(() => setSavedMessage(''), 2000);
  }, []);

  const handleSave = useCallback(() => {
    const lat = parseFloat(latInput.replace(',', '.'));
    const lon = parseFloat(lonInput.replace(',', '.'));
    const factor = parseFloat(roadFactorInput.replace(',', '.'));
    const speed = parseFloat(speedInput.replace(',', '.'));

    const updates: Parameters<typeof updateSettings>[0] = {
      operatorCode: operatorInput.trim(),
      homeAddress: addressInput.trim(),
      openRouteServiceApiKey: apiKeyInput.trim(),
      roadFactor: isNaN(factor) ? 1.3 : Math.max(1.0, Math.min(3.0, factor)),
      averageSpeedKmh: isNaN(speed) ? 50 : Math.max(10, Math.min(130, speed)),
    };

    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      updates.homeCoordinates = { latitude: lat, longitude: lon };
    } else if (latInput.trim() === '' && lonInput.trim() === '') {
      updates.homeCoordinates = undefined;
    }

    updateSettings(updates);
    showSaved();
  }, [operatorInput, latInput, lonInput, addressInput, apiKeyInput, roadFactorInput, speedInput, updateSettings, showSaved]);

  const handleGpsDetect = useCallback(async () => {
    const result = await getPosition();
    if (result) {
      setLatInput(result.coordinates.latitude.toFixed(6));
      setLonInput(result.coordinates.longitude.toFixed(6));
      if (result.address) {
        setAddressInput(result.address);
      }
    }
  }, [getPosition]);

  return (
    <section className="space-y-6" aria-labelledby="settings-form-title">
      <h2 id="settings-form-title" className="text-lg font-semibold text-foreground">
        Configurazione
      </h2>

      {/* Operator code */}
      <div className="space-y-2">
        <label htmlFor="operator-code" className="block text-sm font-medium text-foreground">
          Sigla operatore
        </label>
        <input
          id="operator-code"
          type="text"
          value={operatorInput}
          onChange={(e) => setOperatorInput(e.target.value)}
          placeholder="Es. OP1, T03"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
        />
        <p className="text-xs text-muted-foreground">
          Precompila il campo "Operatore" nei nuovi rapporti.
        </p>
      </div>

      {/* Headquarters coordinates */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Sede / Officina</legend>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lat-input" className="block text-xs text-muted-foreground mb-1">
              Latitudine
            </label>
            <input
              id="lat-input"
              type="text"
              inputMode="decimal"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="-90 / +90"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="lon-input" className="block text-xs text-muted-foreground mb-1">
              Longitudine
            </label>
            <input
              id="lon-input"
              type="text"
              inputMode="decimal"
              value={lonInput}
              onChange={(e) => setLonInput(e.target.value)}
              placeholder="-180 / +180"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGpsDetect}
          disabled={gpsLoading}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 min-h-[44px]"
        >
          📍 {gpsLoading ? 'Rilevamento…' : 'Rileva GPS'}
        </button>

        {gpsError && (
          <p className="text-sm text-destructive" role="alert">
            {gpsError}
          </p>
        )}

        <div>
          <label htmlFor="address-input" className="block text-xs text-muted-foreground mb-1">
            Indirizzo sede
          </label>
          <input
            id="address-input"
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Indirizzo descrittivo"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
          />
        </div>
      </fieldset>

      {/* API Key */}
      <div className="space-y-2">
        <label htmlFor="api-key-input" className="block text-sm font-medium text-foreground">
          API Key OpenRouteService
        </label>
        <div className="relative">
          <input
            id="api-key-input"
            type={showApiKey ? 'text' : 'password'}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Chiave API (opzionale)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={showApiKey ? 'Nascondi API key' : 'Mostra API key'}
          >
            {showApiKey ? '🙈' : '👁️'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Per calcolo distanze stradali precise. Gratuita su openrouteservice.org.
        </p>
      </div>

      {/* Road factor */}
      <div className="space-y-2">
        <label htmlFor="road-factor-input" className="block text-sm font-medium text-foreground">
          Fattore correttivo strada
        </label>
        <input
          id="road-factor-input"
          type="number"
          inputMode="decimal"
          min="1.0"
          max="3.0"
          step="0.1"
          value={roadFactorInput}
          onChange={(e) => setRoadFactorInput(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
        />
        <p className="text-xs text-muted-foreground">
          Moltiplicatore distanza in linea d'aria (1.0–3.0, default 1.3).
        </p>
      </div>

      {/* Average speed */}
      <div className="space-y-2">
        <label htmlFor="speed-input" className="block text-sm font-medium text-foreground">
          Velocità media km/h
        </label>
        <input
          id="speed-input"
          type="number"
          inputMode="decimal"
          min="10"
          max="130"
          value={speedInput}
          onChange={(e) => setSpeedInput(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring min-h-[44px]"
        />
        <p className="text-xs text-muted-foreground">
          Per stima tempo di viaggio offline (10–130, default 50).
        </p>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]"
        >
          Salva Impostazioni
        </button>
        {savedMessage && (
          <span className="text-sm text-green-600" role="status" aria-live="polite">
            {savedMessage}
          </span>
        )}
      </div>
    </section>
  );
}
