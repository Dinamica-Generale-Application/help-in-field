# Dashboard Assistenza

Script Python che genera una dashboard HTML interattiva dai file JSON dei rapporti.

## Come funziona

1. Dalla webapp, quando esporti un PDF viene scaricato anche un file `.json` con i dati strutturati
2. Salva sia il PDF che il JSON nella cartella di rete (es. `H:\DG_Assistenza\Assistenze\2026_Guaresi`)
3. Lancia lo script per generare la dashboard

## Uso

```powershell
# Dalla cartella del progetto
python dashboard/genera_dashboard.py

# Oppure specificando la cartella
python dashboard/genera_dashboard.py "H:\DG_Assistenza\Assistenze\2026_Guaresi"
```

## Output

Genera un file `dashboard.html` nella stessa cartella dei rapporti.
Si apre automaticamente nel browser.

## Funzionalità dashboard

- **KPI**: numero interventi, ore totali, km totali, fatturato, ore medie, clienti unici
- **Filtri**: periodo (da/a), cliente, richiesto da, per conto di, motivo, operatore
- **Grafici**: interventi per mese, top clienti, distribuzione per motivo
- **Tabella**: dettaglio di tutti i rapporti con data, cliente, motivo, ore, km, totale

## Requisiti

- Python 3.10+
- Nessuna dipendenza esterna (usa solo librerie standard)

## Aggiornamento

Rilancia lo script ogni volta che aggiungi nuovi rapporti alla cartella.
La dashboard viene rigenerata con i dati aggiornati.
