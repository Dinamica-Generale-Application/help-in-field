# Implementation Plan

## Overview
Rewrite Help-in-Field from React Native/Expo to a static React Web SPA with localStorage persistence, PDF export, geolocation, and map. Deploy on AWS CloudFront.

## Tasks

- [x] 1. Setup App Shell e Infrastruttura
  - Requirements: REQ-NF1, REQ-NF2, REQ-NF5
  - Sub-tasks:
    - 1.1: Create `src/app/provider.tsx` with ErrorBoundary wrapper
    - 1.2: Create `src/app/router.tsx` with BrowserRouter, all routes (lazy loading for map), layout wrapper
    - 1.3: Create `src/app/index.tsx` composing provider + router
    - 1.4: Create `src/components/layouts/AppLayout.tsx` — responsive header (title + navigation icons: list, map, settings) + `<Outlet />`
    - 1.5: Create `src/components/errors/ErrorBoundary.tsx` with fallback UI
    - 1.6: Create `src/app/routes/NotFoundRoute.tsx`
    - 1.7: Create `src/config/constants.ts` with HOURLY_RATE, KM_RATE, VAT_RATE, MAX_REPORTS, MAX_DEVICES, MAX_ATTACHMENTS
    - 1.8: Update `src/main.tsx` to import App and `index.css`
    - 1.9: Verify `npm run build` produces working `dist/`

- [x] 2. Types, Utility e Domain Logic
  - Requirements: REQ-1, REQ-2, REQ-5, REQ-NF4
  - Dependencies: 1
  - Sub-tasks:
    - 2.1: Create `src/types/index.ts` — Coordinates, shared types
    - 2.2: Create `src/features/reports/types/index.ts` — Report, Device, Attachment, ReportFormData interfaces
    - 2.3: Create `src/utils/format.ts` — formatDate (DD/MM/YYYY), formatCurrency (€ 1.234,56), parseItalianNumber (accepts comma and dot)
    - 2.4: Create `src/utils/generate-id.ts` — wrapper crypto.randomUUID()
    - 2.5: Create `src/utils/storage.ts` — typed getItem/setItem, getStorageSize(), isQuotaExceeded()
    - 2.6: Port `src/features/reports/utils/cost-calculation.ts` from `old/src/domain/cost-calculation.ts` (adapt imports)
    - 2.7: Port `src/features/reports/utils/validation.ts` from `old/src/domain/validation.ts` (adapt fields to new schema)
    - 2.8: Create `src/features/reports/utils/serial-validation.ts` — serial regex `/^[0-9]ZZ[0-9]{3}[A-Z]{2}$/` and model `/^[0-9]{3}-[0-9]{4}$/`
    - 2.9: Create `src/utils/image.ts` — compressImage(file, maxWidth=1920, quality=0.8) → Promise<{dataUrl, size}>
    - 2.10: Write unit tests for cost-calculation, validation, serial-validation, format

- [x] 3. Zustand Stores with localStorage persistence
  - Requirements: REQ-1, REQ-9, REQ-NF6
  - Dependencies: 2
  - Sub-tasks:
    - 3.1: Create `src/features/reports/stores/reportStore.ts` — state: reports[], actions: add/update/delete/search/getById. Persist middleware on localStorage key `hif_reports`. Limit 200 reports.
    - 3.2: Create `src/features/settings/stores/settingsStore.ts` — state: operatorCode, homeCoordinates, homeAddress, apiKey, roadFactor, averageSpeedKmh. Persist middleware on localStorage key `hif_settings`.
    - 3.3: Create `src/hooks/useStorageQuota.ts` — hook that calculates localStorage usage and returns { usedBytes, limitBytes, percentage, isWarning }
    - 3.4: Create `src/components/ui/StorageWarning.tsx` — warning banner when quota > 80%
    - 3.5: Handle `QuotaExceededError` in persist middleware (catch, notify user, data stays in memory)
    - 3.6: Write unit tests for reportStore (CRUD, persist, limit, duplicates)

- [x] 4. Report List + Search
  - Requirements: REQ-1
  - Dependencies: 3
  - Sub-tasks:
    - 4.1: Create `src/features/reports/routes/ReportListRoute.tsx` — list page with search bar + results + FAB "new"
    - 4.2: Create `src/features/reports/components/ReportListItem.tsx` — row with company name, date, status chip (draft yellow / completed green), PDF button
    - 4.3: Implement debounced text search (300ms) on company name, serial number, intervention date
    - 4.4: Empty state: message "Nessun rapporto. Crea il primo!" with CTA button
    - 4.5: Sort: most recent reports on top (by intervention date DESC)

- [x] 5. Report Form (create + edit)
  - Requirements: REQ-1, REQ-2, REQ-4, REQ-5, REQ-10
  - Dependencies: 3
  - Sub-tasks:
    - 5.1: Create `src/features/reports/routes/ReportNewRoute.tsx` — instantiates ReportForm without reportId
    - 5.2: Create `src/features/reports/routes/ReportEditRoute.tsx` — instantiates ReportForm with reportId from URL param
    - 5.3: Create `src/features/reports/components/ReportForm.tsx` — complete form with all fields, inline validation, debounced auto-save (1s)
    - 5.4: Create `src/features/reports/components/DeviceSection.tsx` — dynamic device list (add/remove), max 10, serial/model warning validation on-blur
    - 5.5: Create `src/features/reports/components/AttachmentSection.tsx` — multiple upload + camera capture, grid preview, remove, description, auto compression, max 10
    - 5.6: Create `src/features/reports/components/CostSummary.tsx` — live updated cost breakdown
    - 5.7: Create `src/features/reports/hooks/useCostCalculation.ts` — recalculate on hours/km/discount change
    - 5.8: Create `src/features/reports/hooks/useImageCompression.ts` — compression via Canvas API
    - 5.9: Implement "You have unsaved changes" dialog on navigation (react-router `useBlocker`)
    - 5.10: Buttons: "Save Draft", "Complete Report" (with validation), "Reopen" (from completed to draft)
    - 5.11: Pre-fill "Operator" field from settingsStore.operatorCode, "Date" field with today

- [x] 6. Report Detail + PDF Export
  - Requirements: REQ-1, REQ-3
  - Dependencies: 4, 5
  - Sub-tasks:
    - 6.1: Create `src/features/reports/routes/ReportDetailRoute.tsx` — load report from store via URL param ID
    - 6.2: Create `src/features/reports/components/ReportDetail.tsx` — read-only view organized by sections (client, intervention, devices, costs, attachments)
    - 6.3: Create `src/features/reports/components/DeleteReportDialog.tsx` — confirmation dialog with company name and date visible
    - 6.4: Create `src/features/reports/utils/pdf-export.ts` — generate professional HTML template (port structure from `old/src/domain/pdf-export.ts`, adapt to new schema)
    - 6.5: Create `src/lib/html2pdf.ts` — dynamic import of html2pdf.js, function `generateAndDownloadPdf(html, filename)`
    - 6.6: Implement PDF download with filename `rapporto_[company-name]_[date].pdf`
    - 6.7: iOS Safari fallback: detect UA, if download fails open blob URL in new tab
    - 6.8: Actions in view: "Edit", "Export PDF", "Delete"

- [x] 7. Speech-to-Text
  - Requirements: REQ-7
  - Dependencies: 5
  - Sub-tasks:
    - 7.1: Create `src/features/reports/hooks/useSpeechToText.ts` — hook wrapping Web Speech API, language it-IT, handles start/stop/interim/final/error
    - 7.2: Create `src/features/reports/components/SpeechButton.tsx` — button with mic icon, red during recording, hidden if API not supported
    - 7.3: Integrate in ReportForm: dictated text is appended to description field (does not overwrite)
    - 7.4: Show interim results in real-time (grey text below field)
    - 7.5: Add `aria-live="polite"` for accessible feedback

- [x] 8. Geolocation + Distance Calculation
  - Requirements: REQ-6
  - Dependencies: 5
  - Sub-tasks:
    - 8.1: Create `src/hooks/useGeolocation.ts` — shared hook: getCurrentPosition with 15s timeout, permission handling, Nominatim reverse geocoding
    - 8.2: Create `src/features/reports/utils/geolocation.ts` — haversineDistance, estimateOffline (× roadFactor × 2 round-trip), estimateWithRouting (OpenRouteService API)
    - 8.3: Create `src/features/reports/components/GpsButton.tsx` — button "📍 Detect position", shows loading, handles errors inline
    - 8.4: Integration in form: on GPS click → save lat/lon in report, pre-fill "Intervention location" (reverse geocode), pre-fill "Kilometers" (calculated distance)
    - 8.5: If headquarters not configured: show only lat/lon and address, don't calculate km
    - 8.6: User can override the pre-filled km value

- [x] 9. Intervention Map
  - Requirements: REQ-8
  - Dependencies: 3
  - Sub-tasks:
    - 9.1: Create `src/features/map/routes/MapRoute.tsx` — page with lazy loading of react-leaflet (`React.lazy`)
    - 9.2: Create `src/features/map/components/InterventionMap.tsx` — OSM map, marker for each report with coordinates
    - 9.3: Popup on marker click: company name + date
    - 9.4: Auto-fit bounds with padding if >1 pin; zoom 13 if only 1 pin
    - 9.5: Empty state: centered message "Nessun intervento con posizione GPS"
    - 9.6: Import Leaflet CSS

- [x] 10. Settings + Backup/Restore
  - Requirements: REQ-9, REQ-12
  - Dependencies: 3
  - Sub-tasks:
    - 10.1: Create `src/features/settings/routes/SettingsRoute.tsx` — settings page
    - 10.2: Create `src/features/settings/components/SettingsForm.tsx` — form: operator code, headquarters coordinates (manual + GPS), headquarters address, API key (password field with toggle), road factor, average speed
    - 10.3: Create `src/features/settings/components/BackupSection.tsx` — export/import buttons, summary dialog on import
    - 10.4: Create `src/features/settings/utils/backup.ts` — exportBackup(): generate JSON and download, importBackup(file): parse + validate + skip duplicates + merge into store
    - 10.5: "Delete all data" button with double confirmation (dialog → "Are you sure?" → "Confirm deletion") → clear localStorage
    - 10.6: Import validation: verify JSON structure, show clear error if invalid

- [x] 11. Responsive, Accessibility, Polish
  - Requirements: REQ-NF1, REQ-NF3, REQ-NF4
  - Dependencies: 4, 5, 6, 9, 10
  - Sub-tasks:
    - 11.1: Verify responsive layout 360px → 1440px on all screens
    - 11.2: Verify touch targets ≥ 44×44px on all buttons/controls
    - 11.3: Add `<label>` or `aria-label` to all inputs
    - 11.4: Verify logical tab order in forms
    - 11.5: Add focus-visible ring on all interactive elements
    - 11.6: Verify WCAG AA contrast with tools (lighthouse or axe)
    - 11.7: Verify Italian formats: dates, currency, decimal hours
    - 11.8: No horizontal scroll at any breakpoint

- [x] 12. Build Optimization + Deploy
  - Requirements: REQ-NF2, REQ-NF5
  - Dependencies: 11
  - Sub-tasks:
    - 12.1: Configure code splitting in `router.tsx`: lazy import for MapRoute and PDF export
    - 12.2: Verify bundle size: main chunk < 200KB gzipped
    - 12.3: Add `public/404.html` that redirects to `/index.html` (for CloudFront SPA routing)
    - 12.4: Verify that `npm run build` + `npx serve dist` works with SPA navigation
    - 12.5: Document CloudFront configuration: custom error response 404 → 200 `/index.html`
    - 12.6: Verify cache headers: hashed assets → long cache, index.html → no-cache (handled by Vite by default)

## Task Dependency Graph

```
1 (App Shell)
├── 2 (Types/Utils)
│   └── 3 (Zustand Stores)
│       ├── 4 (Report List) ──────────┐
│       ├── 5 (Report Form) ──────────┤
│       │   ├── 6 (Detail + PDF) ◄────┘
│       │   ├── 7 (Speech-to-Text)
│       │   └── 8 (Geolocation)
│       ├── 9 (Map)
│       └── 10 (Settings + Backup)
│
11 (Responsive/A11y) ◄── 4, 5, 6, 9, 10
└── 12 (Build + Deploy)
```

## Notes
- The `old/` directory contains the original React Native/Expo code as functional reference
- All persistence is localStorage-based, no backend
- Stack: Vite + React 19 + TypeScript + Shadcn/ui + Tailwind CSS 4 + Zustand + React Router 7
- UI language is Italian
