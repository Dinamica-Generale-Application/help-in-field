# Design — Help-in-Field React Web

## Overview

SPA React per la gestione di rapporti di assistenza tecnica, con persistenza `localStorage`, export PDF, geolocalizzazione e mappa interventi. Deploy statico su AWS CloudFront (S3 origin). Nessun backend.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                            │
│                                                           │
│  ┌───────────┐    ┌────────────┐    ┌─────────────────┐  │
│  │   React   │───▶│   Zustand   │───▶│  localStorage   │  │
│  │  Router 7  │    │   Stores    │    │  (persistenza)  │  │
│  └───────────┘    └────────────┘    └─────────────────┘  │
│        │                │                                  │
│        ▼                ▼                                  │
│  ┌───────────┐    ┌────────────┐    ┌─────────────────┐  │
│  │  Shadcn   │    │   Domain   │    │   html2pdf.js   │  │
│  │  UI + TW  │    │   Logic    │    │   (lazy PDF)    │  │
│  └───────────┘    └────────────┘    └─────────────────┘  │
│                         │                                  │
│                         ▼                                  │
│               ┌──────────────────┐                        │
│               │    Web APIs      │                        │
│               │  · Geolocation   │                        │
│               │  · SpeechRecog.  │                        │
│               │  · File Input    │                        │
│               │  · Canvas (img)  │                        │
│               └──────────────────┘                        │
└──────────────────────────────────────────────────────────┘
          │
          ▼ (solo risorse esterne, nessun dato utente inviato)
    ┌─────────────┐
    │   Servizi   │
    │  · OSM tiles (mappa)           │
    │  · Nominatim (reverse geocode) │
    │  · OpenRouteService (distanze) │
    └─────────────┘
```

### Flusso dati unidirezionale

```
User Action → Store Action → Aggiorna State → Sync localStorage → Re-render UI
```

I componenti leggono dallo store via hook Zustand. Le mutazioni passano esclusivamente dalle action dello store. La persistenza localStorage è un middleware Zustand trasparente.

## Components and Interfaces

### Struttura Progetto (Bulletproof-React)

```
src/
├── app/
│   ├── index.tsx                 # Export App component
│   ├── provider.tsx              # ErrorBoundary wrapper
│   ├── router.tsx                # BrowserRouter + Routes + lazy loading
│   └── routes/
│       └── NotFoundRoute.tsx
├── components/
│   ├── errors/
│   │   └── ErrorBoundary.tsx     # Catch errors, mostra fallback
│   ├── layouts/
│   │   └── AppLayout.tsx         # Header + Outlet + navigation
│   └── ui/
│       ├── Button.tsx            # Shadcn/ui button
│       ├── Card.tsx              # Shadcn/ui card
│       ├── Dialog.tsx            # Shadcn/ui dialog (confirm, delete)
│       ├── Input.tsx             # Shadcn/ui input
│       ├── Label.tsx             # Shadcn/ui label
│       ├── Select.tsx            # Shadcn/ui select
│       ├── Toast.tsx             # Shadcn/ui toast (notifiche)
│       └── StorageWarning.tsx    # Banner avviso quota localStorage
├── config/
│   └── constants.ts              # HOURLY_RATE, KM_RATE, VAT_RATE, MAX_REPORTS, etc.
├── features/
│   ├── reports/
│   │   ├── components/
│   │   │   ├── ReportForm.tsx          # Form completo (crea + modifica)
│   │   │   ├── ReportDetail.tsx        # Vista read-only
│   │   │   ├── ReportListItem.tsx      # Riga nella lista
│   │   │   ├── DeviceSection.tsx       # Sezione dispositivi dinamica
│   │   │   ├── AttachmentSection.tsx   # Upload + preview foto
│   │   │   ├── CostSummary.tsx         # Breakdown costi live
│   │   │   ├── SpeechButton.tsx        # Pulsante microfono
│   │   │   ├── GpsButton.tsx           # Pulsante rileva posizione
│   │   │   └── DeleteReportDialog.tsx  # Conferma eliminazione
│   │   ├── hooks/
│   │   │   ├── useCostCalculation.ts   # Ricalcolo live costi
│   │   │   ├── useSpeechToText.ts      # Web Speech API wrapper
│   │   │   └── useImageCompression.ts  # Canvas resize + JPEG compression
│   │   ├── routes/
│   │   │   ├── ReportListRoute.tsx     # Pagina lista
│   │   │   ├── ReportNewRoute.tsx      # Pagina creazione
│   │   │   ├── ReportDetailRoute.tsx   # Pagina dettaglio
│   │   │   └── ReportEditRoute.tsx     # Pagina modifica
│   │   ├── stores/
│   │   │   └── reportStore.ts          # CRUD + ricerca + persist localStorage
│   │   ├── types/
│   │   │   └── index.ts               # Report, Device, Attachment, FormData
│   │   └── utils/
│   │       ├── cost-calculation.ts     # Logica pura calcolo costi
│   │       ├── validation.ts           # Validazione form
│   │       ├── serial-validation.ts    # Regex seriale + modello
│   │       └── pdf-export.ts           # Template HTML → html2pdf
│   ├── map/
│   │   ├── components/
│   │   │   └── InterventionMap.tsx     # react-leaflet map + markers
│   │   └── routes/
│   │       └── MapRoute.tsx            # Pagina mappa (lazy loaded)
│   └── settings/
│       ├── components/
│       │   ├── SettingsForm.tsx         # Form impostazioni
│       │   └── BackupSection.tsx       # Export/import JSON
│       ├── routes/
│       │   └── SettingsRoute.tsx       # Pagina impostazioni
│       └── stores/
│           └── settingsStore.ts        # Impostazioni + persist localStorage
├── hooks/
│   ├── useGeolocation.ts              # GPS + reverse geocoding + calcolo distanza
│   └── useStorageQuota.ts             # Monitoraggio quota localStorage
├── lib/
│   ├── html2pdf.ts                    # Dynamic import html2pdf.js
│   └── utils.ts                       # cn() class merging
├── types/
│   └── index.ts                       # Coordinates, common shared types
└── utils/
    ├── format.ts                      # formatDate, formatCurrency
    ├── generate-id.ts                 # crypto.randomUUID wrapper
    ├── storage.ts                     # localStorage helpers (get/set/size)
    └── image.ts                       # compressImage (Canvas API)
```

### Interfacce Componenti Principali

**AppLayout**
```
Props: nessuna (usa Outlet di React Router)
Responsabilità:
- Header con titolo app + icone navigazione (lista, mappa, impostazioni)
- Mobile: hamburger menu o bottom navigation
- Desktop: header fisso con links
- Render <Outlet /> per contenuto route
```

**ReportForm**
```
Props: { reportId?: string } (se presente = modalità edit)
Responsabilità:
- Gestisce lo stato locale del form
- Auto-save debounced in localStorage (1s)
- Validazione inline on-blur
- Dialog "modifiche non salvate" su navigazione
- Integra DeviceSection, AttachmentSection, CostSummary, SpeechButton, GpsButton
```

**InterventionMap**
```
Props: nessuna (legge rapporti dallo store)
Responsabilità:
- Filtra rapporti con coordinate GPS
- Render Leaflet map con marker per ogni intervento
- Popup: ragione sociale + data
- Fit bounds automatico
```

## Data Models

### Report
```typescript
interface Report {
  id: string;                          // crypto.randomUUID()
  status: 'draft' | 'completed';
  companyName: string;                 // Ragione sociale (obbligatorio)
  address?: string;                    // Indirizzo sede
  phone?: string;                      // Telefono aziendale
  interventionDate: string;            // ISO 8601 (YYYY-MM-DD)
  operator: string;                    // Sigla operatore (obbligatorio)
  interventionLocation?: string;       // Luogo intervento
  interventionLat?: number;            // Coordinate GPS
  interventionLon?: number;
  requestedBy?: string;                // Ruolo/reparto
  onBehalfOf?: string;                 // Azienda committente
  interventionReason?: 'installation' | 'supervision' | 'malfunction' | 'other';
  description: string;                 // Obbligatorio
  devices: Device[];                   // 0-10 dispositivi
  hoursWorked: number;                 // 0.25–24, step 0.25
  kilometers?: number;                 // 0–9999
  discountPercent: number;             // 0–100, default 0
  payment?: 'paid' | 'unpaid';
  notes?: string;
  attachments: Attachment[];           // 0-10 foto
  // Costi calcolati (denormalizzati per il PDF)
  hourlyTotal?: number;
  kilometerTotal?: number;
  subtotal?: number;
  discountAmount?: number;
  taxableAmount?: number;
  vatAmount?: number;
  grandTotal?: number;
  // Metadata
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}
```

### Device
```typescript
interface Device {
  id: string;
  model?: string;
  serialNumber?: string;
  productionYear?: string;
  warranty?: 'in_warranty' | 'out_warranty';
}
```

### Attachment
```typescript
interface Attachment {
  id: string;
  dataUrl: string;                     // base64 data URL (dopo compressione)
  description?: string;
  originalSize: number;                // bytes, per info
  compressedSize: number;              // bytes, per quota tracking
}
```

### Settings
```typescript
interface Settings {
  operatorCode: string;                // Sigla operatore (es. "OP1")
  homeCoordinates?: Coordinates;       // Sede per calcolo km
  homeAddress: string;                 // Indirizzo descrittivo sede
  openRouteServiceApiKey: string;      // API key (opzionale)
  roadFactor: number;                  // 1.0–3.0, default 1.3
  averageSpeedKmh: number;            // 10–130, default 50
}

interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### Storage Schema (localStorage keys)
```
"hif_reports"    → JSON string di Report[]
"hif_settings"   → JSON string di Settings
"hif_version"    → "2.0" (per future migrazioni schema)
```

## Error Handling

| Scenario | Strategia |
|----------|-----------|
| `QuotaExceededError` al salvataggio | Notifica toast: "Spazio esaurito. Esporta backup e cancella rapporti vecchi." Il rapporto resta in memoria Zustand (non perso). |
| GPS permission denied | Messaggio inline: "Permesso GPS negato. Inserisci i km manualmente." Pulsante GPS disabilitato. |
| GPS timeout (15s) | Messaggio inline: "Impossibile ottenere la posizione. Riprova o inserisci manualmente." |
| OpenRouteService API errore | Fallback silenzioso a calcolo Haversine offline. Nessun errore visibile all'utente. |
| Nominatim errore | Coordinate salvate ma campo indirizzo lasciato vuoto. Nessun errore bloccante. |
| html2pdf.js fallisce | Toast: "Errore generazione PDF." + fallback `window.print()`. |
| iOS Safari blob download | Apri PDF in nuovo tab con messaggio "Tieni premuto sull'immagine per salvare." |
| File backup JSON non valido | Dialog errore: "Il file selezionato non è un backup valido." Nessuna modifica ai dati. |
| Web Speech API non supportata | Pulsante microfono non renderizzato. Nessun errore. |
| Foto troppo grande (>10MB raw) | La compressione la riduce. Se dopo compressione ancora >1MB, avviso e scarto. |
| localStorage non disponibile | Avviso al boot: "Il browser non supporta il salvataggio locale. I dati andranno persi alla chiusura." App funziona in-memory only. |

## Correctness Properties

- **Idempotenza calcolo costi**: `calculate(input)` produce sempre lo stesso output per lo stesso input, senza side-effect.
- **Integrità dati localStorage**: ogni write è atomica per chiave. Se il browser crasha durante un write, al prossimo boot si ha o il vecchio stato completo o il nuovo stato completo (JSON.stringify è atomico per chiave).
- **Unicità ID**: `crypto.randomUUID()` garantisce unicità senza collisioni.
- **Skip duplicati import**: un rapporto importato con ID già presente viene ignorato (non sovrascrive).
- **Validazione non distruttiva**: gli errori di validazione non cancellano i dati inseriti. Il form preserva tutto.
- **Compressione deterministica**: stessa immagine input → stessa dimensione output (Canvas API è deterministica per stessa risoluzione target).

## Testing Strategy

| Layer | Tool | Cosa testare |
|-------|------|-------------|
| Utils/Domain | Vitest (unit) | `cost-calculation.ts`, `validation.ts`, `serial-validation.ts`, `format.ts`, `image.ts` |
| Stores | Vitest (unit) | CRUD reportStore, persist/load da localStorage mock, settingsStore |
| Hooks | Vitest + React Testing Library | `useCostCalculation`, `useStorageQuota` |
| Components | Vitest + RTL | ReportForm (validazione), DeviceSection (add/remove), CostSummary (rendering) |
| Integration | Vitest + RTL | Flusso crea → salva → lista → dettaglio → PDF |
| E2E (opzionale) | Playwright | Flusso completo happy path su Chrome |

Mock necessari:
- `navigator.geolocation` → mock con coordinate fisse
- `localStorage` → in-memory mock (già disponibile in jsdom)
- `SpeechRecognition` → mock per test pulsante
- `html2pdf.js` → mock che ritorna un blob fake
