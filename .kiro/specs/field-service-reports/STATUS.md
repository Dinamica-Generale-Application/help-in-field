# Stato Progetto — App Rapporti Assistenza

## Tecnologia
- **Framework**: React Native + Expo SDK 56
- **Linguaggio**: TypeScript
- **Database**: expo-sqlite con Drizzle ORM
- **Stato**: Zustand
- **Navigazione**: expo-router (file-based routing)
- **UI**: React Native Paper (Material Design 3) + @expo/vector-icons
- **Build**: EAS Build (cloud) → APK Android

## Funzionalità Implementate

### Core
- ✅ Creazione/Modifica/Eliminazione rapporti di assistenza
- ✅ Salvataggio locale offline (SQLite)
- ✅ Lista rapporti con ricerca e filtri
- ✅ Condivisione rapida dalla lista (genera PDF + share nativo)
- ✅ Dettaglio rapporto con export PDF

### Dispositivi
- ✅ Multipli dispositivi per rapporto (modello, seriale, anno, garanzia)
- ✅ OCR per riconoscimento codice prodotto (pattern: XXX-XXXX) e seriale (pattern: XZ + lettera + alfanumerici)
- ✅ Retry OCR automatico (3 tentativi)

### GPS e Costi
- ✅ Rilevamento GPS per luogo intervento (reverse geocoding)
- ✅ Calcolo km automatico A/R dalla sede
- ✅ Calcolo costi: ore × 60€/h + km × 0.90€/km + IVA 22%
- ✅ Riepilogo costi in tempo reale nel form

### Allegati
- ✅ Foto (scatto/galleria) e video
- ✅ Max 20 allegati per rapporto
- ✅ Foto visibili nel PDF (grandi, 2 per pagina)

### Speech-to-text
- ✅ Dettatura vocale nel campo descrizione (italiano, offline)

### Clienti
- ✅ Import elenco clienti da CSV (nome, indirizzo, telefono)
- ✅ Autocomplete con precompilazione campi

### Mappa
- ✅ Mappa interventi con puntini rossi per ogni intervento geolocalizzato
- ✅ Auto-zoom per mostrare tutti i punti

### Backup
- ✅ Esporta backup (JSON condivisibile)
- ✅ Importa backup (da file JSON)

### Impostazioni
- ✅ Nome operatore (precompila "eseguito da")
- ✅ Posizione sede (per calcolo km)
- ✅ Chiave API OpenRouteService (opzionale)
- ✅ Parametri stima offline
- ✅ Import clienti CSV
- ✅ Backup/Ripristino

## Campi Rimossi
- P.IVA (rimosso dal form)
- Pagamento Sì/No (rimosso)
- Sconto % / IVA / Subtotale scontato (rimossi dalla visualizzazione, calcolati internamente)

## Struttura Directory
```
app/                    # expo-router file-based routes
  _layout.tsx           # Root layout con PaperProvider + DB init
  index.tsx             # Home → ReportListScreen
  settings.tsx          # Impostazioni
  map.tsx               # Mappa interventi
  report/
    new.tsx             # Nuovo rapporto
    [id].tsx            # Dettaglio rapporto
    edit/[id].tsx       # Modifica rapporto
src/
  components/           # UI condivisi (AttachmentSection, Dialogs)
  data/                 # Repository + schema DB + migrations
  domain/               # Logica business (calcolo costi, validazione, OCR, PDF, geolocation)
  hooks/                # Custom hooks (useLocationEstimate, usePreventRemove)
  screens/              # Schermate (List, Form, Detail, Settings, Map)
  store/                # Zustand stores (report, attachment, settings)
  types/                # TypeScript interfaces
  utils/                # Utilities (backup, error-handler, auto-save, generate-id, speech)
```

## Build
- Account EAS: nicber
- Progetto: field-service-reports
- Comando build: `$env:NODE_OPTIONS="--no-experimental-strip-types"; eas build --platform android --profile preview`
- Node.js: v24 (richiede --no-experimental-strip-types per Expo CLI)
- .npmrc: legacy-peer-deps=true

## Problemi Noti
- OCR (ML Kit) funziona parzialmente — a volte non riconosce il seriale
- expo-file-system mostra warning deprecated (filtrato, non blocca)
- Le foto allegate usano URI dal cache di expo-image-picker (persistono per la sessione dell'app)

## Prossimi Sviluppi Possibili
- Firma digitale nel rapporto
- Sincronizzazione cloud tra dispositivi

## Piattaforme Supportate
- ✅ Android (APK nativo via EAS Build)
- ✅ Web / PWA (expo start --web, compatibile iOS Safari)
- ✅ iOS (nativo opzionale, richiede Apple Developer account)

## Fallback Web
| Funzionalità | Nativo | Web |
|---|---|---|
| Database | expo-sqlite (OPFS) | expo-sqlite (OPFS) |
| OCR | ML Kit (on-device) | Tesseract.js (browser) |
| Speech-to-text | expo-speech-recognition | Web Speech API |
| Mappa | react-native-maps | Leaflet (OpenStreetMap) |
| File sharing | expo-sharing | Blob download |
| File picker | expo-document-picker | `<input type="file">` |
| GPS | expo-location | Geolocation API browser |
