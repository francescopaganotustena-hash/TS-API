# Stato Sviluppo TS-API (Handover Unico)

Ultimo aggiornamento: 2026-03-28
Workspace: `C:\TS-API`
Obiettivo progetto: frontend unico per interrogare API Alyante/gestionale su Clienti, Fornitori, Articoli, Ordini con filtri user-friendly e risultati leggibili.

## Documentazione completa di continuita

Per la storia completa, dettagliata e cronologica del lavoro (decisioni, incidenti, fix, stato attuale e runbook), vedere:

- `docs/PROJECT_HISTORY_COMPLETE.md`
- `README.md` (quickstart operativo sintetico)

## 1) Configurazione API corretta (confermata)

Le chiamate funzionano con questi parametri obbligatori:

- Base URL gestionale: `http://miorouter.homeip.net:9080/api/v1`
- Auth: `Basic Auth`
  - Username: `webapiadmin`
  - Password: `default`
- Header obbligatorio:
  - `Authorization-Scope: 1`
- Query param obbligatori sulle risorse business:
  - `utente=TeamSa`
  - `azienda=1`

Esempio funzionante (fornito e confermato):

`GET /api/v1/1/cliente/2?utente=TeamSa&azienda=1`

Variabili in `.env.local`:

- `GESTIONALE_API_URL=http://miorouter.homeip.net:9080/api/v1`
- `GESTIONALE_USERNAME=webapiadmin`
- `GESTIONALE_PASSWORD=default`
- `GESTIONALE_AUTH_SCOPE=1`

## 2) Risorse mappate nel portale

Mappatura `resourceType -> entity` attuale:

- `clienti -> cliente`
- `fornitori -> fornitore`
- `articoli -> Articolo`
- `ordini -> Documento`

UI risorse: Clienti, Fornitori, Articoli, Ordini.

## 3) Endpoint locali frontend/backend

- Frontend: `http://localhost:3000`
- API locale unica: `POST /api/dati` e `GET /api/dati`

`POST /api/dati` body tipico:

```json
{
  "ambiente": "1",
  "utente": "TeamSa",
  "azienda": "1",
  "resourceType": "clienti|fornitori|articoli|ordini",
  "filters": {},
  "pageSize": 100,
  "extendedMode": true
}
```

`GET /api/dati` supporta:

- test diretto cliente via `clienteId`
- ricerca via `resourceType` + filtri querystring

## 4) Regole IMPORTANTI di paginazione (anomalia gestionale risolta)

### Comportamento reale gestionale

La ricerca `_op=search` usa `pageNumber` **zero-based**:

- prima pagina = `pageNumber: 0`
- seconda pagina = `pageNumber: 1`

Se si usa erroneamente `pageNumber: 1` come prima pagina, i risultati iniziano da offset avanzato e sembrano "mancare" record.

### Fix applicato

- Default pagina lato backend impostato a `0`.
- Sanificazione: `pageNumber >= 0`.
- `pageSize` minima richiesta da UI/API locale: `100`.
- Per stabilità contro anomalie remote su pageSize alte, internamente si usa raccolta a batch sicuri (`REMOTE_SAFE_PAGE_SIZE=50`) e ricomposizione risultati.

## 5) Ricerca estesa e fallback

Modalità `extendedMode`:

- prova anche campi non sempre supportati dal gestionale (es. nome/descrizione)
- se il gestionale risponde con errore (`400` o `500`) o con lista vuota anomala, scatta fallback automatico:
  - query con filtri sicuri
  - filtro locale sui campi estesi

Questo evita che la UI "non trovi" dati per limiti del motore search remoto.

## 6) Campi di ricerca correnti (UI)

### Clienti

- `cliFor`
- `dittaCg18`
- `flgAttivo`
- `tipoCf`
- `nome` (esteso)
- `partitaIva` (esteso)
- `codiceFiscale` (esteso)

### Fornitori

- `cliFor`
- `dittaCg18`
- `flgAttivo`
- `tipoCf`
- `nome` (esteso)
- `partitaIva` (esteso)
- `codiceFiscale` (esteso)

### Articoli

- `codiceArticoloMG`
- `ditta`
- `flgArtesaur`
- `descrizione` (esteso)

### Ordini

- `numdoc`
- `sezdoc`
- `tipodoc`

## 7) Descrizioni articoli (problema risolto)

Problema iniziale:

- molte righe search avevano `currentDescription=null`
- `datoDescrizione` spesso array vuoto
- la tabella mostrava "-"

Fix applicato:

- normalizzazione campo `descrizione` articolo con fallback:
  - `descrizione`
  - `currentDescription`
  - `datoDescrizione[].descart`
  - `datoDescrizione[].descartest`
- enrichment su dettaglio articolo (`GET /Articolo/{codice}`) quando mancante.

Risultato: colonna descrizione popolata correttamente quando i dati esistono.

## 8) Tabelle ordinabili (feature aggiunta)

Le tabelle risultati sono ordinabili cliccando l'intestazione colonna.

- Primo click: `ASC`
- Secondo click: `DESC`
- Criterio automatico:
  - numeri
  - date
  - testo (`localeCompare`)

## 9) File principali modificati

- `C:\TS-API\lib\api.ts`
- `C:\TS-API\app\api\dati\route.ts`
- `C:\TS-API\components\SearchForm.tsx`
- `C:\TS-API\components\DataTable.tsx`

## 10) Verifiche effettuate (stato attuale)

Verifiche API locali con `pageSize=100` e senza filtri (dopo fix paginazione):

- `clienti`: 100 record (inizio corretto, non piu da 100+)
- `fornitori`: 100 record
- `articoli`: 100 record
- `ordini`: 100 record

Verificata anche ricerca estesa su nome/descrizione con fallback attivo.

## 11) Note operative per ripartenza rapida

1. Avvio:

```powershell
cd C:\TS-API
npm run dev -p 3000
```

Avvio robusto consigliato (pulizia automatica cache `.next`):

```powershell
cd C:\TS-API
npm run dev:clean -- -p 3000
```

2. Se Next.js mostra errori cache tipo `Cannot find module './xxx.js'` o `routes-manifest.json`:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force .next
npm run build
npm run dev -p 3000
```

3. URL test rapido frontend:

- `http://localhost:3000`

## 12) Limiti noti

- Alcuni campi estesi dipendono dalla qualità dati della base; se i valori non esistono a monte, il filtro non può restituire match.
- `totalCount` del gestionale non è affidabile in alcune risposte (`0` anche con dati presenti), quindi non va usato come fonte unica.

## 13) Decisioni architetturali consolidate

- Mantenere `pageSize` minima utente = `100` (richiesta business/UI).
- Isolare le anomalie del gestionale nel backend locale (`lib/api.ts`) per non sporcare la UX.
- Usare fallback locale per campi "friendly" (nome cliente/fornitore, descrizione articolo).

## 14) Riepilogo finale

Stato stabile e pronto a evoluzioni:

- autenticazione corretta
- endpoint corretti
- paginazione corretta (zero-based)
- filtri principali funzionanti
- descrizioni articolo visibili
- tabelle ordinabili
- pageSize minima 100 rispettata

Questo documento è la base di continuità per riprendere lo sviluppo senza perdere contesto.

## 15) Aggiornamento stato recente (ultimo sprint)

- Corretto errore React in tabella (`Internal React error: Expected static flag was missing`) stabilizzando l'ordine degli hook nel componente tabella.
- Stabilizzato il flusso di sviluppo locale con script dedicato:
  - `npm run dev:clean -- -p 3000` (pulisce `.next` e avvia dev)
- Corretto issue in ricerca fornitori su ragione sociale:
  - campi avanzati sempre visibili nel form
  - auto-attivazione ricerca estesa quando viene valorizzato un campo esteso (frontend + backend)
- Verifica funzionale: filtro fornitori per nome (`AQUA`) restituisce correttamente `AQUA SPA`.

## 16) TODO API implementabili da `swagger-api.json`

### Priorità alta (impatto immediato UX/business)

1. Dettaglio Ordine con righe documento
- Endpoint: `POST /Documento?_op=search` + `POST /RigaDocumento?_op=search`
- Obiettivo: dalla lista ordini aprire dettaglio con righe articolo, quantità, prezzi.
- Beneficio: rende la sezione ordini realmente operativa.
- Complessità: media.

2. Destinatari per cliente/fornitore
- Endpoint: `POST /DestinatarioMG?_op=search`
- Obiettivo: aggiungere filtro/lookup destinatario nei flussi documenti e anagrafiche.
- Beneficio: ricerca più precisa in contesti logistici/fatturazione.
- Complessità: media.

3. Ricerca listini articolo
- Endpoint: `POST /ListinoArticoloLI?_op=search`, `POST /ListinoArticoloLI/_op=searchlistino`

## 17) Aggiornamento recente

- La classificazione documenti lato frontend ora considera sia i codici testuali sia i codici numerici osservati nei payload reali, per evitare che i documenti finiscano tutti in "Altri documenti".
- La sincronizzazione accetta un numero di pagine di default piu alto (`maxPages=500`, limite massimo `1000`) per ridurre il rischio di troncamento sui dataset piu voluminosi.
- Obiettivo: visualizzare prezzo/listino articolo per cliente/fornitore o listino.
- Beneficio: completa scenario commerciale.
- Complessità: media.

### Priorità media

4. Lookup depositi/magazzini
- Endpoint: `POST /DepositoMG?_op=search`
- Obiettivo: filtri per deposito nelle viste articoli/ordini.
- Beneficio: maggiore controllo su disponibilità e contesto magazzino.
- Complessità: bassa-media.

5. Vista anagrafica completa (master)
- Endpoint: `POST /Anagrafica?_op=search` e `GET /Anagrafica/{id}`
- Obiettivo: unificare dati anagrafici avanzati (indirizzi, contatti, riferimenti).
- Beneficio: campi friendly più ricchi nelle tabelle clienti/fornitori.
- Complessità: media.

6. Relazione cliente-fornitore-articolo
- Endpoint: `POST /ClienteFornitoreArticoloMG?_op=search`
- Obiettivo: mostrare articoli associati a specifico cliente/fornitore.
- Beneficio: ricerca commerciale mirata.
- Complessità: media.

### Priorità bassa / avanzata

7. Azioni documentali (approve/decline)
- Endpoint: `POST /Documento/{approveId?}`, `POST /Documento/{declineId?}`
- Obiettivo: workflow approvazione/rifiuto documenti dal frontend.
- Beneficio: abilita processi operativi end-to-end.
- Complessità: alta (richiede permessi e validazioni).

8. Operazioni inventariali
- Endpoint: `POST /GiacenzaMG/{._op=ricalcologiacenza?}`
- Obiettivo: funzioni tecniche di ricalcolo giacenze.
- Beneficio: manutenzione dati magazzino.
- Complessità: alta e delicata (operazioni potenzialmente invasive).

## 17) Piano implementativo consigliato (incrementale)

1. Ordini + Righe documento (read-only)  
2. Destinatari + DepositoMG (filtri/lookup)  
3. ListinoArticoloLI (ricerca prezzi)  
4. Anagrafica estesa unificata  
5. Eventuali azioni operative (approve/decline, ricalcoli) con feature flag

## 18) Note di sicurezza per future API write

- Ogni endpoint `POST/PUT/DELETE` non read-only va protetto da:
  - conferma utente esplicita
  - log operazione
  - feature flag ambiente (`dev/test/prod`)
- Prima di abilitare write operation su `Documento` o `GiacenzaMG`, validare con utente i casi d'uso e i permessi reali dell'utenza API.

## 19) Roadmap tecnica (Sprint 1-2-3)

Legenda effort:
- `S` = 0.5-1.5 giorni
- `M` = 2-4 giorni
- `L` = 5-8 giorni

### Sprint 1 (fondamenta funzionali read-only)

1. Dettaglio Ordini + Righe Documento
- Effort: `M`
- API: `Documento?_op=search`, `RigaDocumento?_op=search`
- Deliverable:
  - click su ordine -> pannello dettaglio
  - tabella righe (articolo, descrizione, quantità, prezzo, totale)
  - gestione loading/error dedicata
- Dipendenze: nessuna

2. Lookup Destinatari
- Effort: `S`
- API: `DestinatarioMG?_op=search`
- Deliverable:
  - filtro destinatario nelle ricerche ordini
  - colonna destinatario in vista ordini (se disponibile)
- Dipendenze: task 1 consigliato

3. Hardening paginazione/filtri
- Effort: `S`
- API: già integrate
- Deliverable:
  - test automatici smoke su tutte le risorse principali
  - regressione su pageNumber zero-based e pageSize 100
- Dipendenze: nessuna

### Sprint 2 (valore commerciale)

4. Ricerca Listini Articolo
- Effort: `M`
- API: `ListinoArticoloLI?_op=search`, `ListinoArticoloLI/_op=searchlistino`
- Deliverable:
  - pagina/lista prezzi articolo
  - filtri per articolo, listino, cliente/fornitore (se disponibile)
  - colonne prezzo e validità
- Dipendenze: nessuna

5. Lookup Depositi/Magazzini
- Effort: `S`
- API: `DepositoMG?_op=search`
- Deliverable:
  - filtro deposito in articoli/ordini
  - supporto selezione deposito con label descrittiva
- Dipendenze: nessuna

6. Anagrafica estesa (Clienti/Fornitori)
- Effort: `M`
- API: `Anagrafica?_op=search`, `Anagrafica/{id}`
- Deliverable:
  - arricchimento campi friendly (indirizzo, contatti, riferimenti)
  - tooltip/dettaglio anagrafica in tabella
- Dipendenze: task 3 consigliato

### Sprint 3 (verticalizzazioni e operatività)

7. Relazione Cliente-Fornitore-Articolo
- Effort: `M`
- API: `ClienteFornitoreArticoloMG?_op=search`
- Deliverable:
  - vista associazioni articolo per cliente/fornitore
  - filtri incrociati (cli/for + articolo)
- Dipendenze: Sprint 2 completato

8. Workflow Documento (Approve/Decline) con feature flag
- Effort: `L`
- API: `Documento/{approveId?}`, `Documento/{declineId?}`
- Deliverable:
  - azioni esplicite con conferma
  - audit log lato app
  - abilitazione solo per ambiente autorizzato
- Dipendenze: policy sicurezza condivisa

9. Operazioni tecniche Magazzino (ricalcolo giacenze) con guard rail
- Effort: `L`
- API: `GiacenzaMG/{._op=ricalcologiacenza?}`
- Deliverable:
  - pannello operativo protetto
  - doppia conferma + logging
  - esecuzione controllata per ambiente
- Dipendenze: policy sicurezza condivisa

## 20) Backlog sintetico pronto-sprint

Ordine consigliato di esecuzione:
1. `S1-T1` Dettaglio ordini + righe documento (`M`)
2. `S1-T2` Destinatari (`S`)
3. `S1-T3` Hardening test regressione (`S`)
4. `S2-T4` Listini articolo (`M`)
5. `S2-T5` DepositoMG (`S`)
6. `S2-T6` Anagrafica estesa (`M`)
7. `S3-T7` Relazioni cli-for-articolo (`M`)
8. `S3-T8` Approve/Decline documenti (`L`)
9. `S3-T9` Ricalcolo giacenze (`L`)

## 21) Kanban operativo

Stato aggiornamento board: 2026-03-28

### TODO

- `S1-T2` Lookup destinatari (`S`)
- `S1-T3` Hardening test regressione (`S`)
- `S2-T4` Ricerca listini articolo (`M`)
- `S2-T5` Lookup depositi/magazzini (`S`)
- `S2-T6` Anagrafica estesa clienti/fornitori (`M`)
- `S3-T7` Relazione cliente-fornitore-articolo (`M`)
- `S3-T8` Workflow documento approve/decline (`L`)
- `S3-T9` Operazioni ricalcolo giacenze (`L`)

### IN-PROGRESS

- Nessuna attività in corso.

### DONE

- `D-01` Integrazione auth API (`Basic Auth` + `Authorization-Scope`)
- `D-02` Mappatura risorse principali (`clienti`, `fornitori`, `articoli`, `ordini`)
- `D-03` Correzione paginazione zero-based (`pageNumber`)
- `D-04` Page size minima utente a `100`
- `D-05` Fallback ricerca estesa (`400/500/empty`) con filtro locale
- `D-06` Arricchimento dati clienti/fornitori tramite endpoint dettaglio
- `D-07` Normalizzazione descrizione articoli con fallback multipli
- `D-08` Tabelle ordinabili (ASC/DESC, numeri/date/testo)
- `D-09` Correzione errore React static flag (stabilizzazione hook order)
- `D-10` Script di avvio robusto `dev:clean`
- `D-11` Ripristino ricerca fornitori per ragione sociale (campi avanzati sempre visibili + auto extended mode)
- `D-12` Completato `S1-T1`: drilldown `Ordini -> RigheDocumento` (pulsante `Righe`, pannello dettaglio righe, ricerca `RigaDocumento` via endpoint locale unico `/api/dati` con risorsa tecnica `righeOrdine`)

### Regole board

- Spostare massimo 1 task alla volta in `IN-PROGRESS` per ridurre contesto e regressioni.
- Ogni task chiuso va copiato in `DONE` con ID progressivo `D-xx`.
- A fine task aggiornare sempre:
  - test eseguiti
  - file toccati
  - eventuali rischi residui

## 22) Aggiornamento finale prima della sospensione

Data aggiornamento: 2026-03-27

### Nuove funzionalità completate

- Drilldown `Clienti -> Documenti` implementato:
  - pulsante `Documenti` per ogni riga cliente in tabella
  - apertura pannello dedicato con documenti del cliente selezionato
  - filtri pannello: `tipodoc`, `sezdoc`, `numdoc`
- Filtro documenti per cliente reso affidabile:
  - supporto filtro tecnico `cliforfatt` con fallback locale
  - arricchimento ordini tramite dettaglio `Documento/{numReg}`
  - lettura cliente da `clienteFornitoreMG.cliFor` quando i campi testata sono `null`
- Correzione matcher filtri locali estesi:
  - rispetto del `comparer` (equal / startsWith / endsWith / contains)
  - eliminati match parziali non desiderati sui codici cliente.

### Verifiche eseguite

- Build produzione: `OK`
- Test API locale filtro documenti cliente:
  - richiesta ordini con `cliforfatt=16`
  - risultato: `7` documenti
  - controllo campione: tutti con `clienteFornitoreMG.cliFor = 16`

### File toccati in questo step

- `C:\\TS-API\\app\\page.tsx`
- `C:\\TS-API\\components\\DataTable.tsx`
- `C:\\TS-API\\lib\\api.ts`

## 23) Stato sospensione

- Stato progetto: `SOSPESO - STABILE`
- Server verificato: avvio stabile consigliato in modalità production (`npm run start -- -p 3000`) o dev robusto (`npm run dev:clean -- -p 3000`).
- Punto di ripartenza consigliato:
  1. proseguire con `S1-T2` (lookup destinatari).
  2. poi eseguire `S1-T3` (hardening test regressione).

## 24) Ripartenza e avanzamento (2026-03-28)

### Task completato

- `S1-T1` Dettaglio ordini + righe documento: `COMPLETATO`

### Cosa è stato implementato

- Aggiunta risorsa tecnica locale `righeOrdine` mappata su entity gestionale `RigaDocumento`.
- Esteso endpoint unico `POST/GET /api/dati` per supportare `resourceType=righeOrdine`.
- Tabella ordini con nuova azione `Righe`:
  - disponibile sia su ricerca ordini principale sia nel pannello `Clienti -> Documenti`.
  - click su ordine apre pannello righe documento.
- Nuovo pannello `Righe documento` in UI:
  - mostra contesto documento (`tipodoc`, `sezdoc`, `numdoc`, `numReg`)
  - mostra query tecnica eseguita
  - tabella righe con colonne: riga, codice articolo, descrizione, quantità, UM, prezzo, totale.

### Verifiche eseguite

- Build produzione: `OK` (`npm run build`).

### File toccati in questo step

- `C:\\TS-API\\app\\page.tsx`
- `C:\\TS-API\\components\\DataTable.tsx`
- `C:\\TS-API\\lib\\api.ts`
- `C:\\TS-API\\app\\api\\dati\\route.ts`

## 25) Verifica runtime locale (2026-03-28)

- Avvio eseguito con script robusto:
  - `npm run dev:clean -- -p 3000`
- Esito health-check:
  - `GET http://localhost:3000` -> `200 OK`
- Stato:
  - server locale avviato e pronto per test manuali UI.

## 26) Stato SQL Server e storage provider (2026-03-28)

### Configurazione attiva

- Provider storage locale: `sqlserver` (`SYNC_STORAGE_PROVIDER=sqlserver`)
- Istanza SQL: `MSSQLSERVER` (localhost)
- Database locale cache: `TSApiLocalCache`
- Schema applicato: `sql/sqlserver/001_init.sql`

### Verifiche effettuate

- Connessione backend Node -> SQL Server: `OK`
- Endpoint metadata locale su provider SQL:
  - `GET /api/local/meta` risponde con dati da `sync_meta`/`sync_resource_meta`
- Sync end-to-end su SQL Server: `OK`
  - Job: `sync_1774696823200`
  - Stato finale: `success`
  - Errori: `0`

### Snapshot conteggi tabelle dopo sync

- `cache_clienti = 107`
- `cache_fornitori = 523`
- `cache_articoli = 3000` (run limitata da `maxPages` nel test)
- `cache_ordini = 3000` (run limitata da `maxPages` nel test)
- `cache_righe_ordine = 3000` (run limitata da `maxPages` nel test)
- `sync_jobs = 2`
- `sync_meta = 1`
- `sync_resource_meta = 5`

## 27) Bonifica workspace (2026-03-28)

### Pulizia eseguita

- Rimossi artefatti temporanei e log non necessari (`.tmp*`, `.dev*`, `.start*`, `tsconfig.tsbuildinfo`): `39` file eliminati.
- Nessun file sorgente applicativo eliminato.

### Vincolo operativo rispettato

- Nessuna interruzione servizio durante la bonifica richiesta.
- Verifica post-bonifica:
  - `GET http://localhost:3000` -> `200`
  - `GET /api/local/meta` -> `OK`
