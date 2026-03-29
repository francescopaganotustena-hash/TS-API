# Riferimento Unico Ambiente e Chiamate API

Documento unico e autoconsistente per configurare rapidamente nuovi ambienti TS-API (sviluppo, test, staging, produzione), senza dipendenze da altri documenti.

## 1) Endpoint e credenziali da configurare

Valori operativi attuali:

- `GESTIONALE_API_URL=http://miorouter.homeip.net:9080/api/v1`
- `GESTIONALE_USERNAME=webapiadmin`
- `GESTIONALE_PASSWORD=default`
- `GESTIONALE_AUTH_SCOPE=1`

Note:

- `GESTIONALE_API_URL` e l'endpoint base del gestionale.
- `GESTIONALE_AUTH_SCOPE` viene inviato nell'header `Authorization-Scope`.
- Se sono presenti `GESTIONALE_USERNAME` e `GESTIONALE_PASSWORD`, viene inviata autenticazione Basic.

## 2) Variabili ambiente complete da portare in un nuovo ambiente

Template consigliato:

```env
# API Gestionale
GESTIONALE_API_URL=http://<host>:<porta>/api/v1
GESTIONALE_USERNAME=<user>
GESTIONALE_PASSWORD=<password>
GESTIONALE_AUTH_SCOPE=1

# Storage locale
SYNC_STORAGE_PROVIDER=sqlserver
SQLSERVER_CONNECTION_STRING=Server=<server>;Database=<db>;User Id=<user>;Password=<pwd>;TrustServerCertificate=True;Encrypt=False;
SQLSERVER_SCHEMA=dbo
SQLSERVER_REQUEST_TIMEOUT_MS=300000
SQLSERVER_CONNECTION_TIMEOUT_MS=30000

# Sync behavior
SYNC_INCREMENTAL_ENABLED=true
SYNC_ON_DEMAND_ENABLED=false
```

Valori SQL locali attuali:

- `SQLSERVER_CONNECTION_STRING=Server=localhost;Database=TSApiLocalCache;User Id=tsapi_app;Password=TsApiLocal2026!;TrustServerCertificate=True;Encrypt=False;`
- `SQLSERVER_SCHEMA=dbo`

## 3) Parametri API usati dall'app

### 3.1 Parametri contesto standard

- `ambiente` (default UI/API locale: `"1"`)
- `utente` (default UI/API locale: `"TeamSa"`)
- `azienda` (default UI/API locale: `"1"`)

### 3.2 Paginazione e filtri

- `pageNumber` (default: `0`)
- `pageSize` (default tipico: `100`)
- `filters` (mappa `chiave -> valore`)
- `extendedMode` (`true/false`)

### 3.3 Parametri sincronizzazione

- `syncMode`: `"full"` oppure `"incremental"`
- `overlapHours`: intero `1..168`
- `scope.type`: `"full"` oppure `"resource"`
- `scope.resource` (se `scope.type=resource`): `clienti|fornitori|articoli|ordini|righeOrdine`
- `scope.trigger`: `"manual"` oppure `"read-through"`

## 4) Endpoint locali principali

- `GET /api/local/clienti`
- `GET /api/local/fornitori`
- `GET /api/local/articoli`
- `GET /api/local/ordini`
- `GET /api/local/righeOrdine`
- `GET /api/local/meta`
- `POST /api/sync/start`
- `POST /api/sync/cancel`
- `GET /api/sync/status/{jobId}`
- `GET /api/sync/history`

## 5) Bootstrap nuovo ambiente (procedura corta)

1. Creare un file di variabili ambiente con il template del paragrafo 2.
2. Impostare endpoint/credenziali del nuovo gestionale.
3. Impostare connessione SQL Server del nuovo ambiente.
4. Avviare app (`npm run dev` oppure `npm run build && npm run start`).
5. Eseguire una sync baseline:
   - `scope.type=full`
   - `syncMode=full`
6. Eseguire test differenziale:
   - `scope.type=resource` su `clienti`/`fornitori`
   - poi `scope.type=full`, `syncMode=incremental`

## 6) Esempi chiamate (riutilizzabili)

### Avvio sync completa

```http
POST /api/sync/start
Content-Type: application/json

{
  "ambiente": "1",
  "utente": "TeamSa",
  "azienda": "1",
  "pageSize": 100,
  "maxPages": 1000,
  "syncMode": "full",
  "scope": { "type": "full", "trigger": "manual" }
}
```

### Avvio sync differenziale su singola risorsa

```http
POST /api/sync/start
Content-Type: application/json

{
  "ambiente": "1",
  "utente": "TeamSa",
  "azienda": "1",
  "pageSize": 100,
  "maxPages": 1000,
  "syncMode": "incremental",
  "overlapHours": 24,
  "scope": { "type": "resource", "resource": "ordini", "trigger": "manual" }
}
```

### Stato job

```http
GET /api/sync/status/{jobId}
```

### Stop job

```http
POST /api/sync/cancel
Content-Type: application/json

{ "jobId": "sync_..." }
```

## 7) Regole operative consigliate

- Primo avvio ambiente nuovo: sempre full sync.
- In produzione: abilitare `SYNC_INCREMENTAL_ENABLED=true` solo dopo baseline valida.
- Per problemi operativi:
  - impostare temporaneamente `SYNC_INCREMENTAL_ENABLED=false`
  - rilanciare una full sync.

## 8) Checklist validazione finale ambiente

- `GET /api/local/meta` risponde senza errori.
- `GET /api/sync/history` mostra job coerenti.
- Query locali su `clienti`, `fornitori`, `articoli`, `ordini`, `righeOrdine` restituiscono dati.
- Una sync `full + incremental` parte in differenziale dove esiste baseline valida.
