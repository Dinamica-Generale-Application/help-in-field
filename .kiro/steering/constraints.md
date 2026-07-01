# Vincoli di Progetto

## GDPR e Privacy

- L'app NON tratta dati personali di persone fisiche identificabili (Considerando 14 GDPR)
- I campi "operatore" e "richiesto da" usano esclusivamente sigle/codici/ruoli, MAI nomi e cognomi
- Se un campo potrebbe contenere dati personali, mostrare un placeholder che guidi l'utente (es. "Sigla operatore, es. OP1")
- Non inviare MAI dati utente a servizi esterni — i dati restano nel browser (localStorage)
- Nessun cookie di tracciamento, nessun analytics, nessun pixel
- Le coordinate GPS sono dati tecnici dell'intervento (sede aziendale), non posizione di persone

## Semplicità Architetturale

- App statica client-side: nessun backend, nessun database, nessun server
- Nessuna dipendenza da API a pagamento obbligatorie — le API esterne (OpenRouteService, Nominatim) sono opzionali e gratuite nel tier base
- Preferire soluzioni browser-native rispetto a librerie esterne (Web Speech API, Geolocation API, Canvas API)
- Aggiungere dipendenze npm solo se strettamente necessario — valutare sempre se una soluzione vanilla è sufficiente
- Nessuna autenticazione, nessun sistema di utenti, nessuna multi-tenancy

## Deploy

- Target: AWS S3 + CloudFront (hosting statico)
- Il build produce solo file statici (HTML, JS, CSS) nella cartella `dist/`
- Nessun Lambda, nessun API Gateway, nessuna risorsa server-side
- Il sito deve funzionare interamente nel browser senza chiamate a backend proprietari
