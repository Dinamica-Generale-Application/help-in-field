# Implementation Plan: Field Service Reports

## Overview

Implementazione di un'applicazione mobile offline-first (React Native + Expo, TypeScript) per la registrazione e condivisione di rapporti di assistenza tecnica. L'architettura è organizzata a livelli: Data Layer (SQLite + filesystem), Domain Layer (calcolo, validazione, OCR, PDF), Application Layer (Zustand store, hooks), Presentation Layer (UI components, navigation).

## Tasks

- [x] 1. Setup progetto e infrastruttura dati
  - [x] 1.1 Configurare la struttura del progetto e le dipendenze
    - Inizializzare progetto Expo con TypeScript
    - Installare dipendenze: expo-sqlite, drizzle-orm, zustand, expo-router, react-native-paper, expo-image-picker, expo-camera, expo-file-system, expo-sharing, react-native-html-to-pdf, @react-native-ml-kit/text-recognition, fast-check (dev)
    - Creare la struttura directory: `src/domain/`, `src/data/`, `src/store/`, `src/hooks/`, `src/screens/`, `src/components/`, `src/types/`
    - Configurare expo-router con file-based routing
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Definire modelli TypeScript e schema database
    - Creare `src/types/report.ts` con le interfacce `Report`, `Attachment`, `ReportFormData`, `SearchQuery`
    - Creare `src/types/errors.ts` con enum `AppErrorCode` e interfaccia `AppError`
    - Creare schema Drizzle ORM in `src/data/schema.ts` per tabelle `reports` e `attachments` con tutti i vincoli CHECK, indici, e foreign key ON DELETE CASCADE
    - Implementare la migrazione iniziale del database
    - _Requirements: 1.1, 5.1_

  - [x] 1.3 Implementare il database service e inizializzazione
    - Creare `src/data/database.ts` con funzione di inizializzazione database SQLite
    - Gestire apertura connessione, esecuzione migrazioni, e WAL mode
    - Implementare recovery automatico in caso di database corrotto
    - _Requirements: 1.1, 1.3_

- [x] 2. Implementare il Domain Layer — Modulo Calcolo Costi
  - [x] 2.1 Implementare il CostCalculationEngine
    - Creare `src/domain/cost-calculation.ts`
    - Implementare la funzione `calculate(input: CostInput): CostBreakdown`
    - Definire costanti: `HOURLY_RATE = 60`, `KM_RATE = 0.90`, `VAT_RATE = 0.22`
    - Implementare arrotondamento a 2 decimali (half-up) per ogni passaggio intermedio
    - Formula: `grandTotal = roundTo2((hourlyTotal + kmTotal) × (1 - discount/100) × 1.22)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.2 Write property test for Cost Calculation Correctness
    - **Property 1: Cost Calculation Correctness**
    - Generare input casuali: hours (0.25–24.00, step 0.25), km (0–9999999), discount (0–100)
    - Verificare che il risultato corrisponda alla formula con arrotondamenti intermedi
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 2.3 Write unit tests for CostCalculationEngine
    - Testare casi limite: 0.25 ore, 24 ore, 0 km, sconto 0%, sconto 100%
    - Testare arrotondamenti con valori che producono più di 2 decimali
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 3. Implementare il Domain Layer — Modulo Validazione
  - [x] 3.1 Implementare il ValidationModule
    - Creare `src/domain/validation.ts`
    - Implementare `validateReport(report: ReportFormData): ValidationResult`
    - Implementare `validateField(field, value): ValidationError | null`
    - Implementare `validateVatNumber(vatNumber: string): boolean` — esattamente 11 cifre numeriche
    - Implementare `validateHours(hours: number): boolean` — range [0.25, 24.00]
    - Implementare `validateKilometers(km: number): boolean` — range [0, 9999999]
    - Implementare `validateDiscount(discount: number): boolean` — range [0, 100]
    - Verificare campi obbligatori: companyName, interventionDate, performedBy, description, hoursWorked
    - _Requirements: 2.6, 3.3, 4.7, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 3.2 Write property test for Validation Rejects Incomplete Reports
    - **Property 2: Validation Rejects Incomplete Reports**
    - Generare report con almeno un campo obbligatorio vuoto/mancante
    - Verificare `isValid: false` e presenza errore riferito al campo mancante
    - **Validates: Requirements 2.6, 9.1**

  - [ ]* 3.3 Write property test for VAT Number Format Validation
    - **Property 4: VAT Number Format Validation**
    - Generare stringhe casuali (non 11 cifre) → reject; stringhe 11 cifre → accept
    - **Validates: Requirements 3.3**

  - [ ]* 3.4 Write property test for Numeric Range Validation
    - **Property 5: Numeric Range Validation**
    - Generare valori fuori range per ore, km, sconto → verificare errore con campo e range
    - **Validates: Requirements 4.7, 9.3, 9.4**

  - [ ]* 3.5 Write property test for Non-Numeric Input Rejection
    - **Property 6: Non-Numeric Input Rejection**
    - Generare stringhe non numeriche per campi ore/km/sconto → verificare errore di tipo
    - **Validates: Requirements 9.2**

  - [ ]* 3.6 Write property test for Data Preservation on Validation Failure
    - **Property 12: Data Preservation on Validation Failure**
    - Generare form con mix di campi validi e invalidi → verificare che tutti i valori siano preservati dopo validazione fallita
    - **Validates: Requirements 9.5**

- [x] 4. Checkpoint - Verificare calcolo e validazione
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementare il Data Layer — Report Repository
  - [x] 5.1 Implementare il ReportRepository
    - Creare `src/data/report-repository.ts`
    - Implementare metodi CRUD: `create`, `update`, `delete`, `getById`, `getAll`
    - Implementare `search(query: SearchQuery)` con filtro su companyName, serialNumber, interventionDate
    - Implementare `saveDraft` per salvataggio bozze
    - Implementare `getStorageInfo` per contare rapporti e verificare limite 500
    - Implementare `getAll` con ordinamento per `intervention_date DESC`
    - Implementare retry fino a 3 tentativi su errore di scrittura
    - Generare UUID per ogni nuovo rapporto
    - _Requirements: 1.1, 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2_

  - [ ]* 5.2 Write property test for Report List Ordering
    - **Property 7: Report List Ordering**
    - Generare collezione di rapporti con date distinte → verificare ordinamento decrescente
    - **Validates: Requirements 6.1**

  - [ ]* 5.3 Write property test for Search Returns Matching Results
    - **Property 8: Search Returns Matching Results**
    - Generare rapporti e query → verificare che i risultati contengano la query in companyName/serialNumber/interventionDate
    - **Validates: Requirements 6.2**

  - [ ]* 5.4 Write property test for Save/Load Round-Trip
    - **Property 9: Save/Load Round-Trip**
    - Generare report validi, salvare e caricare per ID → verificare uguaglianza campi
    - **Validates: Requirements 7.1**

  - [ ]* 5.5 Write property test for Update Persistence
    - **Property 10: Update Persistence**
    - Generare report, applicare aggiornamenti parziali, caricare → verificare campi aggiornati e non aggiornati preservati
    - **Validates: Requirements 7.2**

  - [ ]* 5.6 Write property test for Valid Reports Save Successfully
    - **Property 3: Valid Reports Save Successfully**
    - Generare report con tutti i campi obbligatori validi → verificare salvataggio come "completed" con successo e recuperabilità
    - Generare report con campi opzionali vuoti → verificare salvataggio come "draft"
    - **Validates: Requirements 2.7, 5.2**

- [x] 6. Implementare il Data Layer — Attachment Repository
  - [x] 6.1 Implementare l'AttachmentRepository
    - Creare `src/data/attachment-repository.ts`
    - Implementare `add(reportId, attachment)` — salvare file in `{appDocumentsDir}/attachments/{reportId}/`
    - Implementare compressione immagini >5MB a qualità 80%
    - Implementare `remove(attachmentId)` — eliminare file e record DB
    - Implementare `getByReportId(reportId)` e `getCount(reportId)`
    - Verificare limite 20 allegati per rapporto
    - Verificare dimensioni massime: 10MB immagine, 50MB video
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.10_

  - [ ]* 6.2 Write property test for Delete Removes Report and Attachments
    - **Property 13: Delete Removes Report and Attachments**
    - Generare report con allegati, eliminare, verificare che `getById` restituisca null e nessun file esista nel filesystem
    - **Validates: Requirements 11.2**

- [x] 7. Checkpoint - Verificare Data Layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implementare il Domain Layer — Modulo OCR
  - [x] 8.1 Implementare l'OcrModule
    - Creare `src/domain/ocr.ts`
    - Implementare `recognizeSerialNumber(imageUri): Promise<OcrResult>`
    - Utilizzare `@react-native-ml-kit/text-recognition` per riconoscimento on-device
    - Applicare regex `/1ZZ[A-Z0-9]+/` sui blocchi di testo riconosciuti
    - Gestire timeout 10 secondi con fallback
    - Gestire confidence < 0.7 con indicazione "verifica il valore"
    - Gestire caso nessun match → messaggio informativo
    - _Requirements: 10.7, 10.8, 10.9_

  - [ ]* 8.2 Write unit tests for OcrModule
    - Mockare ML Kit per testare estrazione pattern "1ZZ"
    - Testare caso riconoscimento riuscito, nessun match, timeout, bassa confidence
    - _Requirements: 10.7, 10.8, 10.9_

- [x] 9. Implementare il Domain Layer — Modulo Esportazione PDF
  - [x] 9.1 Implementare il PdfExportModule
    - Creare `src/domain/pdf-export.ts`
    - Implementare `generatePdf(report, attachments): Promise<PdfExportResult>`
    - Creare template HTML con sezioni: Dati Cliente, Dettagli Intervento, Costi, Allegati, Spazio Firma/Timbro
    - Includere foto inline e frame anteprima video con descrizione
    - Implementare `sharePdf(filePath)` con expo-sharing
    - Gestire errori di generazione con possibilità di retry
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.6_

  - [ ]* 9.2 Write property test for PDF Template Completeness
    - **Property 11: PDF Template Completeness**
    - Generare report completati → verificare che il template HTML contenga: companyName, interventionDate, performedBy, description, e tutti i valori breakdown costi
    - **Validates: Requirements 8.3**

  - [ ]* 9.3 Write unit tests for PdfExportModule
    - Testare struttura sezioni del template HTML
    - Testare inclusione spazio firma
    - Testare inclusione allegati (immagini inline, video come frame)
    - _Requirements: 8.3, 8.4, 10.6_

- [x] 10. Implementare l'Application Layer — State Store
  - [x] 10.1 Implementare lo Zustand Store per i rapporti
    - Creare `src/store/report-store.ts`
    - Definire stato: `reports`, `currentReport`, `formData`, `validationErrors`, `costBreakdown`, `isLoading`
    - Implementare azioni: `loadReports`, `createReport`, `updateReport`, `deleteReport`, `saveDraft`
    - Integrare CostCalculationEngine per ricalcolo automatico su modifica ore/km/sconto
    - Integrare ValidationModule per validazione al salvataggio
    - Implementare auto-save su `AppState` change (background/terminazione)
    - _Requirements: 2.7, 4.6, 5.1, 5.2, 5.4, 9.5_

  - [x] 10.2 Implementare lo Zustand Store per gli allegati
    - Creare `src/store/attachment-store.ts`
    - Definire stato: `attachments`, `isUploading`
    - Implementare azioni: `addAttachment`, `removeAttachment`, `loadAttachments`
    - Gestire validazione limiti (20 allegati, dimensioni max)
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.10_

- [x] 11. Implementare la Presentation Layer — Schermate principali
  - [x] 11.1 Implementare la schermata Elenco Rapporti
    - Creare `src/screens/ReportListScreen.tsx`
    - Mostrare lista rapporti con: ragione sociale, data intervento, stato (Bozza/Completato)
    - Implementare barra di ricerca con filtro su ragione sociale, data, numero di serie
    - Mostrare messaggio "nessun risultato" quando la ricerca non produce risultati
    - Navigare al dettaglio rapporto on tap
    - Implementare FAB per creazione nuovo rapporto
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 11.2 Implementare la schermata Form Rapporto (Creazione/Modifica)
    - Creare `src/screens/ReportFormScreen.tsx`
    - Implementare tutti i campi obbligatori: Ragione Sociale, Data intervento (default oggi, formato GG/MM/AAAA), Intervento eseguito da, Descrizione (max 2000 char), Ore lavorate (incrementi 0.25)
    - Implementare tutti i campi opzionali: Indirizzo, Telefono, P.IVA, Luogo intervento, Richiesto da, Per conto di, Motivo (picker: Installazione/Supervisione/Malfunzionamento/Altro), Modello, Numero serie, Anno produzione, Km, Sconto %, Note (max 2000 char), Garanzia (In/Non in Garanzia), Pagamento (Pagato/Non Pagato)
    - Visualizzare breakdown costi in tempo reale (aggiornamento <1s)
    - Mostrare errori di validazione inline adiacenti ai campi
    - Implementare scroll automatico al primo errore al tentativo di salvataggio
    - Pre-popolare campi in modalità modifica
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 4.6, 7.1, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 11.3 Implementare la gestione allegati nel form
    - Aggiungere sezione allegati nella schermata form
    - Implementare scatto foto / selezione da galleria (JPEG/PNG, max 10MB)
    - Implementare registrazione video / selezione da galleria (max 50MB, max 2 min)
    - Mostrare anteprima allegati con descrizione editabile (max 200 char)
    - Implementare eliminazione allegato
    - Mostrare contatore allegati (X/20)
    - Integrare OCR: dopo scatto/selezione foto, proporre riconoscimento numero di serie
    - Mostrare risultato OCR con opzione di compilazione automatica del campo
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7, 10.8, 10.9, 10.10_

  - [x] 11.4 Implementare dialog di conferma uscita e eliminazione
    - Implementare dialog "Dati non salvati" quando l'utente tenta di uscire dal form con modifiche
    - Implementare dialog eliminazione con ragione sociale e data del rapporto
    - Gestire annullamento eliminazione → rapporto invariato
    - _Requirements: 2.8, 11.1, 11.3_

  - [x] 11.5 Implementare la schermata Dettaglio Rapporto
    - Creare `src/screens/ReportDetailScreen.tsx`
    - Mostrare tutti i dettagli del rapporto in sola lettura
    - Mostrare allegati con anteprima
    - Implementare pulsanti: Modifica, Esporta PDF, Elimina
    - Attivare condivisione PDF tramite menu nativo del dispositivo
    - _Requirements: 6.4, 8.1, 8.2, 11.1, 11.2_

- [x] 12. Implementare gestione errori e lifecycle
  - [x] 12.1 Implementare gestione errori globale e auto-save
    - Creare `src/utils/error-handler.ts` con gestione errori per codice `AppErrorCode`
    - Implementare messaggi user-friendly in italiano per ogni tipo di errore
    - Implementare auto-save bozza su `AppState` change (background/terminazione)
    - Implementare recovery da ultimo auto-save al prossimo avvio dopo crash
    - Implementare retry (3 tentativi) su errori di scrittura SQLite
    - Verificare spazio disponibile prima del salvataggio
    - _Requirements: 1.4, 5.3, 5.4, 7.3, 8.5, 11.4_

- [x] 13. Checkpoint finale - Verificare integrazione completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- L'applicazione è completamente offline-first: nessuna funzionalità dipende dalla rete
- Il modulo calcolo e validazione sono puri (no side-effect), ideali per property-based testing
- fast-check è la libreria PBT scelta (TypeScript-native, minimo 100 iterazioni per test)
- Gli allegati vengono gestiti su filesystem con path relativo salvato in DB

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 4, "tasks": ["5.1", "6.1", "8.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "6.2", "8.2", "9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3", "10.1", "10.2"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] },
    { "id": 8, "tasks": ["12.1"] }
  ]
}
```
