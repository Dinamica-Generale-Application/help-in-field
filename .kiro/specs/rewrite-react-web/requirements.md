# Riscrittura Help-in-Field: da React Native/Expo a React Web (SPA statica)

## Contesto

Il progetto originale (in `old/`) è un'app React Native/Expo per la gestione di rapporti di assistenza tecnica sul campo. Viene riscritto come SPA React pura per deploy statico su AWS CloudFront.

### Riferimento funzionale
Il codice in `old/` rappresenta la specifica funzionale di partenza. La nuova app replica le funzionalità core con le differenze documentate sotto.

### Decisioni architetturali

- **Persistenza `localStorage`**: tutti i dati (rapporti, impostazioni, pin mappa) sono persistiti in `localStorage`. Sopravvivono alla chiusura del tab/browser. L'utente può cancellarli manualmente dal browser.
- **Solo dati aziendali**: nessun dato di persona fisica identificabile. Campi come "operatore" e "richiesto da" usano sigle/ruoli, mai nomi e cognomi. Questo esclude l'app dal perimetro GDPR (Regolamento si applica solo a persone fisiche identificabili).
- **Solo online**: niente Service Worker, niente offline mode.
- **Deploy statico**: SPA su S3 + CloudFront (HTML/JS/CSS, nessun server backend).
- **Struttura bulletproof-react**: `src/app`, `src/features`, `src/components`, `src/config`, `src/hooks`, `src/lib`, `src/stores`, `src/types`, `src/utils`.
- **Stack**: Vite + React 19 + TypeScript + Shadcn/ui + Tailwind CSS 4 + Zustand + React Router 7.

### Politica dati e GDPR

L'app tratta esclusivamente:
- Ragioni sociali (persone giuridiche)
- Indirizzi sede aziendali
- Telefoni aziendali
- Sigle operatore (es. "OP1", "T03") — non riconducibili a persona fisica
- Ruoli/reparti (es. "Ufficio tecnico") — non persone fisiche
- Dati tecnici (seriali, modelli, coordinate intervento)

**Il GDPR non si applica** ai dati di persone giuridiche né a identificativi non riconducibili a persona fisica (Considerando 14 del Regolamento). Non servono: informativa, consenso, registro trattamenti, DPO.

---

## Requisiti Funzionali

### REQ-1: Gestione Rapporti (CRUD con persistenza localStorage)
**Cosa**: L'utente può creare, visualizzare, modificare e cancellare rapporti di assistenza tecnica. I rapporti vengono salvati in `localStorage` e sopravvivono alla chiusura del browser.
**Perché**: È il core dell'app — il tecnico compila il rapporto sul campo e lo esporta come PDF. La persistenza evita perdita dati accidentale.
**Accettazione**:
- [ ] Form di creazione rapporto con tutti i campi (vedi sotto)
- [ ] Lista rapporti con ricerca testuale (ragione sociale, seriale, data)
- [ ] Visualizzazione dettaglio rapporto in sola lettura
- [ ] Modifica rapporto esistente
- [ ] Cancellazione rapporto con dialog di conferma
- [ ] Stato rapporto: bozza / completato
- [ ] Transizione a "completato" tramite pulsante esplicito "Completa Rapporto" (richiede validazione OK)
- [ ] Transizione da "completato" a "bozza" tramite "Riapri" (per correzioni)
- [ ] Validazione campi obbligatori al tentativo di completamento
- [ ] Salvataggio automatico in `localStorage` ad ogni modifica del form (debounced 1s)
- [ ] Limite massimo 200 rapporti in localStorage (avviso quando si avvicina al limite)
- [ ] Protezione navigazione: dialog "Hai modifiche non salvate" se l'utente naviga via dal form con dati dirty

**Campi del form** (solo dati aziendali, no persone fisiche):
- Ragione Sociale (obbligatorio) — nome azienda cliente
- Indirizzo sede intervento (opzionale) — indirizzo aziendale
- Telefono azienda (opzionale) — numero fisso/centralino aziendale
- Data intervento (obbligatorio) — default: oggi
- Operatore (obbligatorio) — sigla/codice identificativo, NON nome e cognome (es. "OP1", "T03", "Tecnico A")
- Luogo intervento (opzionale) — indirizzo o descrizione del sito
- Richiesto da (opzionale) — ruolo/reparto, NON nome persona (es. "Ufficio tecnico", "Resp. manutenzione")
- Per conto di (opzionale) — ragione sociale azienda committente se diversa dal cliente
- Motivo intervento (opzionale) — installazione / supervisione / malfunzionamento / altro
- Descrizione (obbligatorio) — testo libero, evitare nomi di persone
- Dispositivi (multipli): vedi REQ-4
- Ore lavorate (obbligatorio) — range 0.25–24, incrementi 0.25
- Chilometri (opzionale) — range 0–9999
- Sconto % (opzionale) — range 0–100
- Stato pagamento (opzionale) — pagato / non pagato
- Note (opzionale)
- Allegati foto: vedi REQ-10

### REQ-2: Calcolo Costi in Tempo Reale
**Cosa**: Il form calcola automaticamente il breakdown costi dell'intervento mentre l'utente compila ore, km e sconto.
**Perché**: Il tecnico deve vedere il totale prima di stampare il rapporto per il cliente.
**Accettazione**:
- [ ] Formula (identica a `old/src/domain/cost-calculation.ts`):
  - `costoOre = ore × €60.00/h`
  - `costoKm = km × €0.90/km`
  - `subtotale = costoOre + costoKm`
  - `importoSconto = subtotale × (sconto% / 100)`
  - `imponibile = subtotale − importoSconto`
  - `IVA = imponibile × 22%`
  - `totale = imponibile + IVA`
- [ ] Ogni risultato intermedio arrotondato a 2 decimali (half-up: `Math.round(x * 100) / 100`)
- [ ] Ricalcolo live ad ogni modifica dei campi ore/km/sconto
- [ ] Mostra breakdown completo sotto il form (costoOre, costoKm, subtotale, sconto, imponibile, IVA, totale)
- [ ] Se ore = 0 o non compilate, non mostrare il breakdown

### REQ-3: Export PDF
**Cosa**: L'utente può generare un PDF professionale del rapporto e scaricarlo.
**Perché**: Il PDF è il deliverable finale — viene consegnato al cliente o archiviato.
**Accettazione**:
- [ ] Genera PDF dal template HTML (riutilizzare struttura da `old/src/domain/pdf-export.ts`)
- [ ] Download automatico del file PDF con nome `rapporto_[ragione-sociale]_[data].pdf`
- [ ] Il PDF include: dati cliente, dettagli intervento, dispositivi, breakdown costi completo, allegati foto, spazio firma (tecnico + cliente)
- [ ] Usa libreria `html2pdf.js` per la generazione
- [ ] Fallback per iOS Safari: se il download automatico fallisce, aprire il PDF in un nuovo tab (blob URL) con istruzioni "Tieni premuto per salvare"
- [ ] Pulsante "Esporta PDF" visibile sia nel dettaglio rapporto che nella lista (icona share)

### REQ-4: Dispositivi Multipli per Rapporto
**Cosa**: Ogni rapporto può avere 0-N dispositivi, ognuno con modello, seriale, anno, garanzia.
**Perché**: Un intervento può riguardare più macchine/apparecchi.
**Accettazione**:
- [ ] Sezione "Dispositivi" nel form con pulsante "+ Aggiungi dispositivo"
- [ ] Ogni dispositivo ha: modello (opzionale), numero di serie (opzionale), anno produzione (opzionale), stato garanzia (in garanzia / fuori garanzia / non specificato)
- [ ] Pulsante "×" per rimuovere un dispositivo (con conferma se ha dati compilati)
- [ ] I dispositivi compaiono nel PDF e nel dettaglio rapporto
- [ ] Massimo 10 dispositivi per rapporto

### REQ-5: Validazione Seriale e Modello
**Cosa**: I campi seriale e modello hanno validazione formato non bloccante.
**Perché**: Aiuta l'operatore a inserire codici nel formato corretto, riducendo errori.
**Accettazione**:
- [ ] Campo "Numero di Serie": validazione pattern 8 caratteri, formato `NZZNNNAА` (N=cifra, Z=lettera Z fissa, A=lettera maiuscola). Regex: `/^[0-9]ZZ[0-9]{3}[A-Z]{2}$/`
- [ ] Campo "Modello": validazione pattern 3 cifre + trattino + 4 cifre. Regex: `/^[0-9]{3}-[0-9]{4}$/`
- [ ] Feedback inline: bordo giallo + icona warning + messaggio "Formato atteso: 1ZZ533DE" o "Formato atteso: 969-0406"
- [ ] La validazione è WARNING, non bloccante — l'utente può salvare/completare il rapporto anche con formato diverso
- [ ] Validazione attivata on-blur (non durante la digitazione)

### REQ-6: Geolocalizzazione Intervento
**Cosa**: L'utente può rilevare la posizione GPS dell'intervento e calcolare automaticamente la distanza dalla sede.
**Perché**: Precompila i km nel calcolo costi e salva le coordinate per la mappa.
**Accettazione**:
- [ ] Pulsante "📍 Rileva posizione" nel form che usa `navigator.geolocation.getCurrentPosition()`
- [ ] Richiesta permesso GPS con gestione rifiuto (messaggio "Permesso GPS negato, inserisci i km manualmente")
- [ ] Reverse geocoding con Nominatim (OpenStreetMap) per mostrare indirizzo stimato → precompila campo "Luogo intervento"
- [ ] Se la sede è configurata in impostazioni: calcolo distanza andata e ritorno
  - Preferenza: OpenRouteService API (se API key configurata) → distanza stradale reale
  - Fallback: Haversine × fattore correttivo (default 1.3) → stima offline
- [ ] Precompilazione campo "Chilometri" con distanza calcolata (arrotondata al km intero)
- [ ] L'utente può sovrascrivere il valore km calcolato
- [ ] Coordinate salvate nel rapporto per REQ-8 (mappa)
- [ ] Timeout 15 secondi sulla richiesta GPS, poi messaggio di errore
- [ ] Logica calcolo distanza: `old/src/domain/geolocation.ts`

### REQ-7: Speech-to-Text (Dettatura Vocale)
**Cosa**: L'utente può dettare la descrizione dell'intervento.
**Perché**: Sul campo è più comodo dettare che scrivere su smartphone.
**Accettazione**:
- [ ] Pulsante microfono (🎤) accanto al campo "Descrizione"
- [ ] Usa Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) in lingua italiana (`it-IT`)
- [ ] Durante la dettatura: testo intermedio visibile in grigio, pulsante diventa rosso (recording)
- [ ] Al termine: testo finale aggiunto alla descrizione esistente (append, non sovrascrive)
- [ ] Pulsante "Stop" per terminare manualmente la dettatura
- [ ] **Degradazione graziosa**: se il browser non supporta Web Speech API, il pulsante microfono NON viene renderizzato (nessun errore)
- [ ] Browser supportati: Chrome, Edge, Safari 14.1+. Non supportato: Firefox.

### REQ-8: Mappa Interventi
**Cosa**: Schermata mappa che mostra gli interventi con coordinate GPS come pin su mappa.
**Perché**: Visualizzazione rapida degli interventi effettuati — utile per planning e verifica copertura territorio.
**Accettazione**:
- [ ] Mappa Leaflet/OpenStreetMap con `react-leaflet`
- [ ] Pin per ogni rapporto che ha coordinate GPS (campo `lat`/`lon` non null)
- [ ] Popup al click sul pin: ragione sociale + data intervento
- [ ] Auto-fit bounds per inquadrare tutti i pin con padding
- [ ] Se un solo pin: zoom fisso livello 13
- [ ] Stato vuoto: messaggio "Nessun intervento con posizione GPS. Usa 📍 Rileva posizione nel form."
- [ ] Dati mappa letti direttamente dal `localStorage` (stessi rapporti di REQ-1)
- [ ] Caricamento lazy di react-leaflet (code splitting) per non appesantire il bundle iniziale

### REQ-9: Impostazioni
**Cosa**: Schermata impostazioni per configurare parametri operativi dell'app.
**Perché**: Personalizzazione per l'operatore e configurazione calcolo distanza.
**Accettazione**:
- [ ] Sigla/codice operatore — precompila il campo "Operatore" nei nuovi rapporti. NON nome e cognome, solo identificativo aziendale (es. "OP1", "T03")
- [ ] Posizione sede/officina:
  - Coordinate (latitudine/longitudine) inseribili manualmente
  - Pulsante "Rileva GPS" per acquisire la posizione corrente
  - Indirizzo descrittivo (solo per visualizzazione)
- [ ] Chiave API OpenRouteService (opzionale) — per calcolo distanze stradali precise. Campo password con toggle visibilità.
- [ ] Parametri stima offline (usati senza API key):
  - Fattore correttivo strada (1.0–3.0, default 1.3)
  - Velocità media km/h (10–130, default 50)
- [ ] Tutte le impostazioni persistite in `localStorage` (sopravvivono alla chiusura browser)
- [ ] Pulsante "Cancella tutti i dati" con doppia conferma — svuota localStorage completamente

### REQ-10: Allegati Foto
**Cosa**: L'utente può allegare foto ai rapporti.
**Perché**: Documentazione visiva dell'intervento (guasti, targhette, lavori eseguiti).
**Accettazione**:
- [ ] Upload immagini via `<input type="file" accept="image/*" multiple>`
- [ ] Opzione cattura da fotocamera: `<input type="file" accept="image/*" capture="environment">` (pulsante separato "📷 Scatta foto")
- [ ] Compressione automatica: ridimensiona a max 1920px lato lungo, qualità JPEG 80% → riduce da ~5MB a ~200-400KB per foto
- [ ] Preview thumbnail (griglia) degli allegati nel form
- [ ] Possibilità di rimuovere un allegato (pulsante ×)
- [ ] Descrizione opzionale per ogni allegato (campo testo breve)
- [ ] Le foto vengono salvate in localStorage come data URL base64 (dopo compressione)
- [ ] Nel PDF le foto vengono renderizzate come immagini a piena larghezza
- [ ] Limite: max 10 allegati per rapporto (dopo compressione ~4MB totale per rapporto, gestibile in localStorage)
- [ ] Avviso se localStorage si avvicina al limite (5MB è il limite standard dei browser) — suggerire export backup + cancellazione vecchi rapporti

### REQ-12: Backup/Restore (JSON)
**Cosa**: L'utente può esportare tutti i dati come file JSON e reimportarli.
**Perché**: Serve come backup di sicurezza e per trasferire dati tra dispositivi/browser.
**Accettazione**:
- [ ] Pulsante "Esporta Backup" → download file `backup_assistenza_[YYYY-MM-DD].json`
- [ ] Il backup include: tutti i rapporti + dispositivi + allegati (base64) + impostazioni
- [ ] Pulsante "Importa Backup" → file picker `.json`, carica dati nello store e localStorage
- [ ] All'import: dialog con riepilogo ("Trovati N rapporti. Importare?") prima di procedere
- [ ] Skip rapporti con ID già presente (no duplicati)
- [ ] Validazione base del file JSON: verifica che abbia la struttura attesa, errore user-friendly se il file non è valido
- [ ] Il backup NON contiene dati personali (coerente con la politica GDPR dell'app)

---

## Requisiti Non Funzionali

### REQ-NF1: Responsive / Mobile-First
- L'app deve essere usabile su smartphone (viewport 360px+)
- Layout adattivo: form su colonna singola su mobile, 2 colonne su desktop (≥768px)
- Touch-friendly: target minimi 44×44px per tutti i pulsanti e controlli
- Nessuno scroll orizzontale a nessun breakpoint

### REQ-NF2: Performance
- First Contentful Paint < 2s su connessione 4G
- Bundle iniziale < 200KB gzipped (esclusi chunk lazy: mappa, html2pdf)
- react-leaflet caricato lazy (solo quando l'utente apre la mappa)
- html2pdf.js caricato lazy (solo quando l'utente genera un PDF)

### REQ-NF3: Accessibilità
- Navigazione da tastiera completa (tab order logico)
- Ogni `<input>` ha un `<label>` associato (o `aria-label`)
- `aria-live="polite"` per feedback speech-to-text e geolocalizzazione
- Contrasto colori WCAG AA (rapporto minimo 4.5:1)
- Focus visible su tutti gli elementi interattivi

### REQ-NF4: Internazionalizzazione
- UI interamente in italiano (come l'originale)
- Formati italiani: date DD/MM/YYYY, valuta con virgola decimale e punto migliaia (€ 1.234,56)
- Decimali ore: virgola come separatore (es. "2,5 ore") — accettare sia punto che virgola come input

### REQ-NF5: Deploy CloudFront
- `npm run build` produce `dist/` con HTML + JS + CSS statici
- Compatibile con S3 origin + CloudFront distribution
- SPA routing: custom error response 404 → 200 `/index.html`
- Cache headers: assets con hash nel nome → `max-age=31536000`; `index.html` → `no-cache`

### REQ-NF6: Limiti localStorage
- localStorage ha un limite di ~5-10MB per dominio (varia per browser)
- L'app deve monitorare l'utilizzo e avvisare l'utente quando si supera l'80% della quota stimata (4MB)
- Suggerimento: "Spazio quasi esaurito. Esporta un backup e cancella i rapporti più vecchi."
- In caso di errore `QuotaExceededError` durante il salvataggio: notifica chiara all'utente, nessuna perdita dati del rapporto corrente (resta in memoria Zustand)
