# TS-API - Storia Completa Sviluppo (Dettagliata)

Ultimo aggiornamento: 2026-03-28  
Workspace: `<PROJECT_ROOT>`  
Repository attivo: `https://github.com/francescopaganotustena-hash/TS-API`

## 1) Obiettivo Progetto

Costruire un portale locale (`localhost:3000`) per esplorare dati Alyante/gestionale (Clienti, Fornitori, Articoli, Ordini, Righe Ordine) con:

- UX ad albero navigabile
- ricerca veloce e leggibile
- sincronizzazione locale robusta
- performance elevate lato frontend
- base tecnica migrabile verso SQL Server (poi diventata SQL-first nativa)

## 2) Timeline Evolutiva (Sintesi Cronologica)

### Fase A - Avvio e mappatura API

- Raccolte specifiche da `swagger-api.json`.
- Mappati endpoint principali e pattern ricerca.
- Definiti parametri fondamentali:
  - `ambiente=1`
  - `utente=TeamSa`
  - `azienda=1`
  - `Authorization-Scope=1`
- Definita mappatura risorse:
  - `clienti -> cliente`
  - `fornitori -> fornitore`
  - `articoli -> Articolo`
  - `ordini -> Documento`
  - `righeOrdine -> RigaDocumento`

### Fase B - Stabilizzazione API locale e ricerca

- Corrette incongruenze paginazione (`pageNumber` zero-based).
- Introdotti fallback ricerca estesa su campi non sempre supportati nativamente.
- Stabilizzati form/filtri e resa tabellare.

### Fase C - Restyling UI e passaggio ad albero

- Rifatta interfaccia Explorer con sidebar, pannello dettagli, nodi gerarchici.
- Implementata navigazione ad albero su tutte le aree principali.
- Aggiunti gruppi documenti/destinatari/righe in lazy loading.

### Fase D - Problemi reali emersi in test locale

- Dati mancanti/placeholder (`Cliente1`, badge a `0`, nodi vuoti).
- Ricerche intermittenti/non affidabili.
- UI a volte “sfasciata” per mismatch build/runtime.
- Sync bloccata con messaggi “sincronizzazione in corso”.

### Fase E - Scelta architetturale SQL-first

- Scelta esplicita: abbandono JSON-file come storage principale.
- Adozione SQL Server locale come fonte runtime.
- Introduzione provider SQL per cache locale e sync jobs.

### Fase F - Implementazione SQL Server completa

- Creazione schema tabelle cache + metadata + jobs.
- Porting lettura/scrittura store su SQL.
- API locali reindirizzate a query SQL (server-side filtering/paging).
- Indicizzazione tabelle per ricerche rapide.

### Fase G - Hardening finale (ultima iterazione)

- Albero iniziale compresso (no auto-open al primo avvio).
- Classificazione documenti corretta (non più tutti in “Altri documenti”).
- Fix `cache_articoli.codice_articolo` (prima nullo, ora valorizzato).
- Sync resa più sicura contro troncamento silenzioso.
- Aggiornamento documentazione di handover.

## 3) Decisioni Architetturali Chiave

### Decisione 1 - SQL Server come storage primario

Motivazione:

- ridurre latenza in consultazione frontend
- eliminare dipendenza da tempi API remoti durante la navigazione
- avere base dati interrogabile e controllabile
- preparare migrazione/estensione enterprise

Esito:

- runtime locale SQL-first
- sincronizzazione asincrona gestionale -> SQL locale
- frontend legge quasi esclusivamente dal DB locale

### Decisione 2 - Sync esplicita con monitoraggio

Motivazione:

- trasparenza stato job
- isolamento errori remoti
- controllo operativo per utente

Esito:

- endpoint sync start/status/history
- persistenza job su SQL
- metadati ultima sync e conteggi per risorsa

### Decisione 3 - Ricerca server-side su cache locale

Motivazione:

- evitare fetch massive lato client
- rendere i filtri rapidi e consistenti

Esito:

- query SQL paginata
- filtri per risorsa indicizzati
- fallback mirati su campi derivati dal JSON grezzo dove necessario

## 4) Stato Tecnico Attuale (As-Is)

### Frontend

- Explorer ad albero con:
  - sidebar risorse
  - pannello centrale nodi
  - pannello dettaglio
- Ricerca per risorsa con filtri contestuali.
- Albero iniziale compresso.
- Espansione lazy per:
  - documenti cliente/fornitore
  - destinatari
  - righe ordine

### Backend API locale

- `GET /api/local/[resource]`:
  - query SQL paginata
  - filtri normalizzati
  - risposta con `count`, `updatedAt`, `data`
- `GET /api/local/meta`: metadati sync
- `POST /api/sync/start`: avvio job sync
- `GET /api/sync/status/[jobId]`: stato singolo job
- `GET /api/sync/history`: storico jobs
- `GET/POST /api/dati`: compatibilità/fetch verso gestionale

### Database SQL Server

Tabelle principali:

- `sync_jobs`
- `sync_meta`
- `sync_resource_meta`
- `cache_clienti`
- `cache_fornitori`
- `cache_articoli`
- `cache_ordini`
- `cache_righe_ordine`

Caratteristiche:

- colonne denormalizzate per ricerca rapida
- `raw_json` completo per dettaglio/fallback
- indici su chiavi di lookup più frequenti

## 5) Problemi Critici Risolti (Con Causa)

### 5.1 Albero auto-aperto all’avvio

Sintomo:

- UI affollata al primo caricamento.

Causa:

- auto-espansione iniziale globale dei nodi.

Fix:

- rimozione auto-espansione iniziale
- reset espansione su cambio risorsa

### 5.2 Documenti tutti in “Altri documenti”

Sintomo:

- classificazione non coerente (fatture/ordini/DDT non separati).

Causa:

- classificatore basato soprattutto su prefissi testuali; payload reali spesso con `tipodoc` numerico.

Fix:

- supporto codici numerici reali + varianti testuali
- migliorata costruzione etichetta documento

### 5.3 `cache_articoli.codice_articolo` nullo

Sintomo:

- nel DB il codice articolo risultava `NULL` su tutta/ampia parte tabella.

Causa:

- estrattore non copriva tutte le varianti/percorsi reali del payload.

Fix:

- estrazione robusta multi-path anche su campi nidificati/array
- fallback ricerca SQL su `raw_json`
- backfill dati esistenti

### 5.4 Possibile troncamento sync

Sintomo:

- rischio di caricare solo parte dataset su risorse molto grandi.

Causa:

- limite pagine statico con chiusura “silenziosa”.

Fix:

- default `maxPages` aumentato
- limite massimo aumentato
- errore esplicito se si raggiunge il cap con ultima pagina piena

## 6) Verifiche Eseguite (Ultimo Ciclo)

- `npm run lint` -> OK
- `npm run build` -> OK
- `localhost:3000` -> HTTP 200
- API locali:
  - clienti: `107`
  - fornitori: `523`
  - articoli: `5224`
  - ordini: `11291`
- SQL `cache_articoli`:
  - prima: codice spesso/totalmente nullo
  - dopo fix+backfill: `null_codice = 0` su `5224`
- Distribuzione ordini su codici `tipodoc` reali (mappata):
  - classi valorizzate su fatture/DDT/ordini (non più tutto in “altri”)

## 7) File Chiave da Conoscere

Frontend:

- `app/page.tsx`
- `lib/explorerTree.ts`
- `components/explorer/*`

Sync/Store:

- `app/api/_syncEngine.ts`
- `app/api/_syncStore.ts`
- `app/api/_syncStoreSqlServer.ts`
- `app/api/sync/start/route.ts`
- `app/api/local/[resource]/route.ts`

Schema SQL:

- `sql/sqlserver/001_init.sql`

Documentazione:

- `DEVELOPMENT_STATE.md`
- `docs/activity-log.md`
- `docs/api-specs-summary.md`
- `docs/SQLSERVER_IMPLEMENTATION_READINESS.md`

## 8) Runbook di Ripartenza (Operativo)

### Avvio locale

```powershell
cd <PROJECT_ROOT>
npm run build
npm run start
```

URL:

- `http://localhost:3000`

### Diagnostica rapida

1. Verifica processo:
```powershell
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Select ProcessId,CommandLine
```
2. Verifica API locale:
```powershell
Invoke-RestMethod "http://localhost:3000/api/local/clienti?ambiente=1&utente=TeamSa&azienda=1&pageSize=20"
```
3. Verifica sync meta:
```powershell
Invoke-RestMethod "http://localhost:3000/api/local/meta"
```

### Query SQL utili

Controllo codici articolo null:
```sql
SELECT COUNT(*) total,
       SUM(CASE WHEN codice_articolo IS NULL OR LTRIM(RTRIM(codice_articolo))='' THEN 1 ELSE 0 END) null_codice
FROM dbo.cache_articoli;
```

Controllo distribuzione tipo documento:
```sql
SELECT tipo_doc, COUNT(*) c
FROM dbo.cache_ordini
GROUP BY tipo_doc
ORDER BY c DESC;
```

## 9) Rischi Residui e Mitigazioni

- Dataset remoti in crescita oltre cap pagine:
  - mitigazione: errore esplicito sync + aumento `maxPages`.
- Variazioni schema payload Alyante:
  - mitigazione: normalizzatori multi-path + `raw_json` integrale.
- Regressioni UI in build/start non riallineati:
  - mitigazione: rebuild + restart pulito.

## 10) Indicazioni per il Prossimo Sprint

1. Aggiungere KPI in pagina sync:
   - throughput righe/sec
   - ETA stimata
2. Aggiungere test automatici su:
   - classificazione documenti
   - mapping campi critici SQL
3. Introdurre controllo qualità post-sync:
   - soglie minime record per risorsa
   - allerta su anomalie improvvise

## 11) Stato Conclusivo

Il progetto è in stato operativo stabile con base SQL Server locale consolidata, UI ad albero funzionale, ricerca server-side rapida e sincronizzazione controllata.  
La documentazione ora include sia stato tecnico corrente sia storia completa, per ripresa futura senza perdita di contesto.
