import { useCallback, useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import type { Device, WarrantyStatus } from '../types';
import { validateSerialNumber, validateModel } from '../utils/serial-validation';
import { generateId } from '@/utils/generate-id';
import { MAX_DEVICES } from '@/config/constants';

interface DeviceSectionProps {
  devices: Device[];
  onChange: (devices: Device[]) => void;
}

interface DeviceWarnings {
  [deviceId: string]: {
    serialNumber?: string;
    model?: string;
  };
}

/**
 * Sezione dispositivi — lista dinamica (aggiungi/rimuovi), max 10.
 * Validazione serial/model WARNING only (bordo giallo + icona warning) on-blur.
 */
export function DeviceSection({ devices, onChange }: DeviceSectionProps) {
  const [warnings, setWarnings] = useState<DeviceWarnings>({});

  const addDevice = useCallback(() => {
    if (devices.length >= MAX_DEVICES) return;
    const newDevice: Device = {
      id: generateId(),
      model: '',
      serialNumber: '',
      productionYear: '',
      warranty: undefined,
    };
    onChange([...devices, newDevice]);
  }, [devices, onChange]);

  const removeDevice = useCallback(
    (id: string) => {
      onChange(devices.filter((d) => d.id !== id));
      setWarnings((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [devices, onChange],
  );

  const updateDevice = useCallback(
    (id: string, field: keyof Device, value: string) => {
      onChange(
        devices.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
      );
    },
    [devices, onChange],
  );

  const handleBlur = useCallback(
    (deviceId: string, field: 'serialNumber' | 'model', value: string) => {
      const result =
        field === 'serialNumber'
          ? validateSerialNumber(value)
          : validateModel(value);

      setWarnings((prev) => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          [field]: result.isValid ? undefined : result.message,
        },
      }));
    },
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">
          Dispositivi ({devices.length}/{MAX_DEVICES})
        </h3>
        <button
          type="button"
          onClick={addDevice}
          disabled={devices.length >= MAX_DEVICES}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Aggiungi
        </button>
      </div>

      {devices.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Nessun dispositivo aggiunto.
        </p>
      )}

      {devices.map((device, index) => (
        <DeviceItem
          key={device.id}
          device={device}
          index={index}
          warnings={warnings[device.id]}
          onUpdate={updateDevice}
          onBlur={handleBlur}
          onRemove={removeDevice}
        />
      ))}
    </div>
  );
}

// --- Sub-component ---

interface DeviceItemProps {
  device: Device;
  index: number;
  warnings?: { serialNumber?: string; model?: string };
  onUpdate: (id: string, field: keyof Device, value: string) => void;
  onBlur: (id: string, field: 'serialNumber' | 'model', value: string) => void;
  onRemove: (id: string) => void;
}

function DeviceItem({ device, index, warnings, onUpdate, onBlur, onRemove }: DeviceItemProps) {
  return (
    <div className="rounded-lg border p-3 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Dispositivo {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(device.id)}
          className="p-2 rounded hover:bg-destructive/10 text-destructive min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={`Rimuovi dispositivo ${index + 1}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Modello */}
        <div className="space-y-1">
          <label htmlFor={`device-model-${device.id}`} className="text-xs font-medium">
            Modello
          </label>
          <div className="relative">
            <input
              id={`device-model-${device.id}`}
              type="text"
              value={device.model || ''}
              onChange={(e) => onUpdate(device.id, 'model', e.target.value)}
              onBlur={(e) => onBlur(device.id, 'model', e.target.value)}
              placeholder="es. 969-0406"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                warnings?.model
                  ? 'border-yellow-400 focus-visible:outline-yellow-400'
                  : 'border-input focus-visible:outline-ring'
              }`}
            />
            {warnings?.model && (
              <AlertTriangle className="absolute right-2 top-2.5 h-4 w-4 text-yellow-500" />
            )}
          </div>
          {warnings?.model && (
            <p className="text-xs text-yellow-600">{warnings.model}</p>
          )}
        </div>

        {/* Numero di serie */}
        <div className="space-y-1">
          <label htmlFor={`device-serial-${device.id}`} className="text-xs font-medium">
            Numero di Serie
          </label>
          <div className="relative">
            <input
              id={`device-serial-${device.id}`}
              type="text"
              value={device.serialNumber || ''}
              onChange={(e) => onUpdate(device.id, 'serialNumber', e.target.value)}
              onBlur={(e) => onBlur(device.id, 'serialNumber', e.target.value)}
              placeholder="es. 1ZZ533DE"
              className={`w-full rounded-md border px-3 py-2 text-sm ${
                warnings?.serialNumber
                  ? 'border-yellow-400 focus-visible:outline-yellow-400'
                  : 'border-input focus-visible:outline-ring'
              }`}
            />
            {warnings?.serialNumber && (
              <AlertTriangle className="absolute right-2 top-2.5 h-4 w-4 text-yellow-500" />
            )}
          </div>
          {warnings?.serialNumber && (
            <p className="text-xs text-yellow-600">{warnings.serialNumber}</p>
          )}
        </div>

        {/* Anno produzione */}
        <div className="space-y-1">
          <label htmlFor={`device-year-${device.id}`} className="text-xs font-medium">
            Anno produzione
          </label>
          <input
            id={`device-year-${device.id}`}
            type="text"
            value={device.productionYear || ''}
            onChange={(e) => onUpdate(device.id, 'productionYear', e.target.value)}
            placeholder="es. 2023"
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          />
        </div>

        {/* Garanzia */}
        <div className="space-y-1">
          <label htmlFor={`device-warranty-${device.id}`} className="text-xs font-medium">
            Garanzia
          </label>
          <select
            id={`device-warranty-${device.id}`}
            value={device.warranty || ''}
            onChange={(e) =>
              onUpdate(device.id, 'warranty', e.target.value as WarrantyStatus)
            }
            className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <option value="">Non specificato</option>
            <option value="in_warranty">In garanzia</option>
            <option value="out_warranty">Fuori garanzia</option>
          </select>
        </div>
      </div>
    </div>
  );
}
