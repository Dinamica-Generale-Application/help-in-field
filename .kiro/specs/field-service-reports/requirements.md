# Requirements Document

## Introduction

Applicazione mobile per la registrazione e condivisione di rapporti di assistenza tecnica sul campo. L'applicazione consente agli operatori di compilare rapporti di intervento direttamente dal proprio telefono, funzionando completamente offline e permettendo l'esportazione e condivisione dei rapporti completati.

## Glossary

- **App**: L'applicazione mobile per la registrazione dei rapporti di assistenza
- **Operatore**: Il tecnico di campo che utilizza l'applicazione per compilare i rapporti
- **Rapporto**: Il documento di assistenza tecnica contenente tutti i dati dell'intervento
- **Cliente**: L'azienda o persona presso cui viene effettuato l'intervento
- **Storage_Locale**: Il sistema di archiviazione dati sul dispositivo dell'operatore
- **Modulo_Esportazione**: Il componente responsabile della generazione e condivisione dei rapporti
- **Modulo_Calcolo**: Il componente responsabile del calcolo automatico dei costi dell'intervento
- **Modulo_Validazione**: Il componente responsabile della verifica dei dati inseriti
- **Modulo_OCR**: Il componente responsabile del riconoscimento ottico dei numeri di serie dalle foto
- **Numero_di_Serie**: Codice identificativo del dispositivo, con formato che inizia con "1ZZ"

## Requirements

### Requisito 1: Funzionamento Offline

**User Story:** Come operatore, voglio utilizzare l'applicazione senza connessione internet, così da poter compilare rapporti anche in zone senza copertura di rete.

#### Criteri di Accettazione

1. THE App SHALL memorizzare tutti i dati dei rapporti nello Storage_Locale del dispositivo, fino a un massimo di 500 rapporti
2. THE App SHALL permettere la creazione, la modifica e la visualizzazione dei rapporti senza richiedere una connessione internet attiva
3. WHEN l'Operatore avvia l'App senza connessione internet, THE App SHALL caricare tutti i rapporti precedentemente salvati dallo Storage_Locale entro 5 secondi
4. IF lo Storage_Locale non dispone di spazio sufficiente per salvare un rapporto, THEN THE App SHALL mostrare un messaggio di errore indicante lo spazio insufficiente e SHALL impedire la perdita dei rapporti già salvati

### Requisito 2: Creazione Rapporto di Assistenza

**User Story:** Come operatore, voglio creare un nuovo rapporto di assistenza, così da documentare ogni intervento effettuato.

#### Criteri di Accettazione

1. WHEN l'Operatore crea un nuovo rapporto, THE App SHALL presentare un modulo con i seguenti campi obbligatori: Ragione Sociale del cliente, Data dell'intervento (formato GG/MM/AAAA, default data odierna), Intervento eseguito da, Descrizione dell'intervento eseguito (massimo 2000 caratteri), Ore lavorate (valore numerico da 0.25 a 24.00 con incrementi di 0.25)
2. WHEN l'Operatore crea un nuovo rapporto, THE App SHALL presentare i seguenti campi opzionali: Indirizzo del cliente, Telefono del cliente, P.IVA del cliente (11 cifre), Luogo dell'intervento (se diverso dalla sede del cliente), Richiesto da, Per conto di, Motivo dell'intervento, Modello, Numero di serie, Anno di produzione, Chilometri (valore intero da 0 a 9.999.999), Sconto percentuale (valore numerico da 0 a 100), Note (massimo 2000 caratteri)
3. WHEN l'Operatore seleziona il motivo dell'intervento, THE App SHALL proporre le seguenti opzioni: Installazione, Supervisione, Malfunzionamento, Altro
4. WHEN l'Operatore compila il campo garanzia, THE App SHALL consentire la selezione tra "In Garanzia" e "Non in Garanzia"
5. WHEN l'Operatore compila il campo pagamento, THE App SHALL consentire la selezione tra "Pagato" e "Non Pagato"
6. IF l'Operatore tenta di salvare il rapporto con uno o più campi obbligatori non compilati, THEN THE App SHALL impedire il salvataggio e SHALL indicare visivamente quali campi obbligatori risultano mancanti
7. WHEN l'Operatore salva il rapporto con tutti i campi obbligatori compilati correttamente, THE App SHALL memorizzare il rapporto, confermare il salvataggio con un messaggio di avvenuta creazione e rendere il rapporto disponibile nell'elenco dei rapporti entro 3 secondi
8. IF l'Operatore tenta di abbandonare il modulo con dati non salvati, THEN THE App SHALL mostrare un messaggio di conferma che richiede all'Operatore di confermare o annullare l'uscita

### Requisito 3: Gestione Dati Cliente

**User Story:** Come operatore, voglio inserire e gestire i dati del cliente nel rapporto, così da avere un riferimento completo dell'azienda servita.

#### Criteri di Accettazione

1. WHEN l'Operatore inserisce i dati del cliente, THE App SHALL consentire l'inserimento di: Ragione sociale (massimo 200 caratteri), Indirizzo (massimo 300 caratteri), Telefono (massimo 20 caratteri), P.IVA (esattamente 11 cifre numeriche)
2. WHEN l'Operatore specifica un luogo di intervento diverso dalla sede del cliente, THE App SHALL memorizzare separatamente l'indirizzo del luogo di intervento (massimo 300 caratteri)
3. IF l'Operatore inserisce una P.IVA con un formato non valido (diverso da 11 cifre numeriche), THEN THE App SHALL mostrare un messaggio di errore indicando il formato corretto

### Requisito 4: Calcolo Automatico dei Costi

**User Story:** Come operatore, voglio che il costo totale dell'intervento venga calcolato automaticamente, così da evitare errori di calcolo.

#### Criteri di Accettazione

1. WHEN l'Operatore inserisce le ore lavorate (valore decimale compreso tra 0,25 e 24,00 con incrementi di 0,25), THE Modulo_Calcolo SHALL calcolare il costo orario moltiplicando le ore per la tariffa di 60 €/h e visualizzare il risultato arrotondato a 2 decimali
2. WHEN l'Operatore inserisce i chilometri percorsi (valore numerico compreso tra 0 e 9999), THE Modulo_Calcolo SHALL calcolare il costo chilometrico moltiplicando i chilometri per la tariffa di 0,90 €/km e visualizzare il risultato arrotondato a 2 decimali
3. WHEN l'Operatore inserisce una percentuale di sconto (valore compreso tra 0 e 100), THE Modulo_Calcolo SHALL applicare lo sconto al subtotale (costo orario + costo chilometrico) e visualizzare il subtotale scontato arrotondato a 2 decimali
4. THE Modulo_Calcolo SHALL calcolare l'IVA al 22% sul totale dopo lo sconto, arrotondando il risultato a 2 decimali
5. THE Modulo_Calcolo SHALL calcolare il Costo Totale Intervento come somma del subtotale scontato e dell'IVA, arrotondando a 2 decimali
6. WHEN l'Operatore modifica ore, chilometri o sconto, THE Modulo_Calcolo SHALL ricalcolare e visualizzare il Costo Totale Intervento aggiornato entro 1 secondo
7. IF l'Operatore inserisce un valore ore, chilometri o sconto fuori dai limiti consentiti o non numerico, THEN THE Modulo_Calcolo SHALL indicare un errore di validazione specificando il campo non valido e i limiti accettati, senza modificare il Costo Totale Intervento precedentemente calcolato

### Requisito 5: Salvataggio Rapporto

**User Story:** Come operatore, voglio salvare i rapporti sul dispositivo, così da non perdere i dati inseriti.

#### Criteri di Accettazione

1. WHEN l'Operatore salva un rapporto, THE App SHALL persistere tutti i dati del rapporto nello Storage_Locale entro 2 secondi e mostrare un messaggio di conferma
2. WHEN l'Operatore salva un rapporto incompleto, THE App SHALL memorizzare il rapporto come bozza con stato "Bozza" visibile nell'elenco rapporti
3. IF si verifica un errore durante il salvataggio, THEN THE App SHALL ritentare il salvataggio fino a un massimo di 3 tentativi; IF tutti i tentativi falliscono, THEN THE App SHALL mostrare un messaggio di errore con dettagli e mantenere i dati nel modulo corrente
4. WHEN l'Operatore chiude l'App durante la compilazione di un rapporto, THE App SHALL salvare automaticamente i dati inseriti come bozza

### Requisito 6: Elenco e Ricerca Rapporti

**User Story:** Come operatore, voglio visualizzare e cercare i rapporti salvati, così da poter ritrovare facilmente un intervento specifico.

#### Criteri di Accettazione

1. THE App SHALL mostrare un elenco di tutti i rapporti salvati ordinati per data dell'intervento in ordine decrescente, visualizzando per ogni rapporto: ragione sociale del cliente, data dell'intervento e stato (Bozza/Completato)
2. WHEN l'Operatore effettua una ricerca, THE App SHALL filtrare i rapporti per ragione sociale del cliente, data dell'intervento o numero di serie, aggiornando i risultati entro 1 secondo
3. IF la ricerca non produce risultati, THEN THE App SHALL mostrare un messaggio indicante l'assenza di rapporti corrispondenti ai criteri inseriti
4. WHEN l'Operatore seleziona un rapporto dall'elenco, THE App SHALL mostrare tutti i dettagli del rapporto selezionato

### Requisito 7: Modifica Rapporto

**User Story:** Come operatore, voglio modificare un rapporto esistente, così da poter correggere errori o aggiungere informazioni mancanti.

#### Criteri di Accettazione

1. WHEN l'Operatore apre un rapporto esistente in modalità modifica, THE App SHALL pre-popolare tutti i campi del modulo con i dati precedentemente salvati e consentire la modifica di ogni campo
2. WHEN l'Operatore salva le modifiche a un rapporto, THE App SHALL aggiornare il rapporto nello Storage_Locale e mostrare un messaggio di conferma
3. IF si verifica un errore durante il salvataggio delle modifiche, THEN THE App SHALL mostrare un messaggio di errore e mantenere i dati modificati nel modulo corrente senza perdita di informazioni

### Requisito 8: Esportazione e Condivisione Rapporti

**User Story:** Come operatore, voglio esportare e condividere i rapporti compilati, così da poterli inviare al cliente o all'ufficio.

#### Criteri di Accettazione

1. WHEN l'Operatore richiede l'esportazione di un rapporto completato, THE Modulo_Esportazione SHALL generare un file PDF contenente tutti i dati del rapporto entro 10 secondi
2. WHEN il file PDF è stato generato, THE Modulo_Esportazione SHALL aprire il menu di condivisione nativo del dispositivo
3. THE Modulo_Esportazione SHALL includere nel PDF generato tutti i campi del rapporto organizzati per sezioni (dati cliente, dettagli intervento, costi) con etichette leggibili per ciascun campo
4. THE Modulo_Esportazione SHALL includere nel PDF uno spazio dedicato per il timbro e la firma di approvazione dell'intervento
5. IF la generazione del file PDF fallisce, THEN THE Modulo_Esportazione SHALL mostrare un messaggio di errore indicante il motivo del fallimento e consentire all'Operatore di ritentare l'esportazione

### Requisito 9: Validazione Dati

**User Story:** Come operatore, voglio essere avvisato quando mancano dati obbligatori, così da compilare rapporti completi.

#### Criteri di Accettazione

1. IF l'Operatore tenta di salvare un rapporto come completato e uno o più campi obbligatori risultano vuoti, THEN THE Modulo_Validazione SHALL impedire il salvataggio, contrassegnare visivamente ciascun campo mancante con un indicatore di errore adiacente al campo, e mostrare un messaggio di errore indicante il numero di campi obbligatori non compilati
2. WHEN l'Operatore inserisce un valore non numerico nei campi ore, chilometri o sconto, THE Modulo_Validazione SHALL mostrare un messaggio di errore adiacente al campo indicando che il valore deve essere numerico
3. IF l'Operatore inserisce un valore di sconto superiore a 100 o inferiore a 0, THEN THE Modulo_Validazione SHALL mostrare un messaggio di errore indicando che il valore deve essere compreso tra 0 e 100
4. IF l'Operatore inserisce un valore di ore inferiore a 0 o superiore a 24, oppure un valore di chilometri inferiore a 0 o superiore a 99999, THEN THE Modulo_Validazione SHALL mostrare un messaggio di errore indicando l'intervallo valido per il campo
5. IF la validazione fallisce al tentativo di salvataggio, THEN THE Modulo_Validazione SHALL preservare tutti i dati già inseriti dall'Operatore nel rapporto, permettendo la correzione dei soli campi non validi senza perdita di informazioni

### Requisito 10: Allegati Multimediali

**User Story:** Come operatore, voglio allegare foto e video al rapporto, così da documentare visivamente il problema riscontrato, i numeri di serie dei dispositivi e la situazione dopo la risoluzione.

#### Criteri di Accettazione

1. WHEN l'Operatore aggiunge un allegato al rapporto, THE App SHALL consentire di scattare una foto con la fotocamera del dispositivo o selezionare un'immagine dalla galleria, accettando file in formato JPEG o PNG con dimensione massima di 10 MB per immagine
2. WHEN l'Operatore aggiunge un video al rapporto, THE App SHALL consentire di registrare un video con la fotocamera del dispositivo o selezionare un video dalla galleria, accettando file con dimensione massima di 50 MB e durata massima di 2 minuti per video
3. THE App SHALL consentire l'aggiunta di un massimo di 20 allegati multimediali (foto e video combinati) per singolo rapporto
4. WHEN l'Operatore aggiunge un allegato, THE App SHALL consentire di associare una descrizione testuale all'allegato con lunghezza massima di 200 caratteri (ad esempio: "Numero di serie", "Problema riscontrato", "Problema risolto")
5. THE App SHALL memorizzare gli allegati multimediali nello Storage_Locale insieme al rapporto associato
6. WHEN l'Operatore esporta un rapporto con allegati, THE Modulo_Esportazione SHALL includere le foto nel file PDF generato e, per ogni video allegato, includere un frame di anteprima con la relativa descrizione
7. WHEN l'Operatore scatta o seleziona una foto di una targhetta o etichetta del dispositivo, THE Modulo_OCR SHALL analizzare l'immagine entro 10 secondi per riconoscere il Numero_di_Serie (formato "1ZZ...")
8. WHEN il Modulo_OCR riconosce un Numero_di_Serie nell'immagine, THE App SHALL proporre all'Operatore di compilare automaticamente il campo "Numero di serie" del rapporto con il valore riconosciuto
9. IF il Modulo_OCR non riesce a riconoscere un Numero_di_Serie nell'immagine entro il tempo limite, THEN THE App SHALL mostrare un messaggio indicante il mancato riconoscimento e consentire l'inserimento manuale del numero di serie
10. IF l'Operatore tenta di aggiungere un allegato che supera la dimensione massima consentita o il numero massimo di allegati per rapporto, THEN THE App SHALL mostrare un messaggio indicante il limite superato e impedire l'aggiunta dell'allegato

### Requisito 11: Eliminazione Rapporto

**User Story:** Come operatore, voglio poter eliminare rapporti non necessari, così da mantenere ordinato l'archivio.

#### Criteri di Accettazione

1. WHEN l'Operatore richiede l'eliminazione di un rapporto, THE App SHALL mostrare un messaggio di conferma contenente la ragione sociale del cliente e la data dell'intervento del rapporto da eliminare
2. WHEN l'Operatore conferma l'eliminazione, THE App SHALL rimuovere il rapporto e tutti gli allegati multimediali associati dallo Storage_Locale in modo permanente
3. IF l'Operatore annulla la richiesta di eliminazione, THEN THE App SHALL mantenere il rapporto invariato nello Storage_Locale
4. IF si verifica un errore durante l'eliminazione, THEN THE App SHALL mostrare un messaggio di errore e mantenere il rapporto invariato nello Storage_Locale
