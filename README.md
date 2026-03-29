# TS-API Portal - Quickstart Operativo

Portale locale per esplorare dati Alyante (`clienti`, `fornitori`, `articoli`, `ordini`, `righeOrdine`) con cache SQL Server e sincronizzazione controllata.

## Prerequisiti

- Node.js 20+
- SQL Server locale attivo
- File `.env.local` configurato

Variabili tipiche:

- `GESTIONALE_API_URL`
- `GESTIONALE_USERNAME`
- `GESTIONALE_PASSWORD`
- `GESTIONALE_AUTH_SCOPE`
- `SYNC_INCREMENTAL_ENABLED=false`
- `SYNC_ON_DEMAND_ENABLED=false`
- `SYNC_STORAGE_PROVIDER=sqlserver`
- `SQLSERVER_CONNECTION_STRING`
- `SQLSERVER_SCHEMA=dbo`

### Sync incrementale

La sincronizzazione incrementale e disattivata di default. Se `SYNC_INCREMENTAL_ENABLED=true`, la UI puo proporre la modalita incrementale e il backend prova a usare un delta basato sull'ultima sync riuscita.

Rollback immediato:

1. Imposta `SYNC_INCREMENTAL_ENABLED=false`.
2. Avvia una sync completa manuale.
3. Se necessario, forza `syncMode=full` nella richiesta `POST /api/sync/start`.

Comportamento atteso dopo rollback:

- il backend ignora le richieste incremental e torna al flusso completo;
- i job in corso non cambiano modalita a meta esecuzione;
- alla sync successiva i dati vengono riallineati con una full sync.

### Scope-based sync MVP

La UI supporta anche un primo MVP di sync per scope:

- `scope=full` per la sync completa
- `scope=resource` per una singola risorsa

Il comportamento on-demand e preparato lato UI, ma resta disabilitato di default con `SYNC_ON_DEMAND_ENABLED=false`.

Rollback immediato:

1. Imposta `SYNC_ON_DEMAND_ENABLED=false`.
2. Continua a usare `scope=full` per le sync manuali.
3. Se serve, disabilita anche `SYNC_INCREMENTAL_ENABLED` per tornare al solo flusso completo.

Comportamento atteso dopo rollback:

- la UI resta compatibile con il selettore scope, ma le chiamate on-demand non vengono attivate;
- il flusso operativo torna alla sync completa manuale;
- eventuali marker on-demand esposti in futuro dall'API locale vengono semplicemente ignorati se non presenti.

## Avvio rapido

```powershell
cd C:\TS-API
npm install
npm run build
npm run start
```

Apri: `http://localhost:3000`

## Uso quotidiano

1. Avvia applicazione.
2. Vai alla pagina Sync e lancia la sincronizzazione.
3. Attendi completamento job.
4. Torna all’Explorer e naviga l’albero.

## API locali utili

- `GET /api/local/clienti?...`
- `GET /api/local/fornitori?...`
- `GET /api/local/articoli?...`
- `GET /api/local/ordini?...`
- `GET /api/local/meta`
- `POST /api/sync/start`
- `GET /api/sync/status/{jobId}`
- `GET /api/sync/history`

## Verifiche rapide

```powershell
Invoke-WebRequest http://localhost:3000
Invoke-RestMethod "http://localhost:3000/api/local/clienti?ambiente=1&utente=TeamSa&azienda=1&pageSize=20"
Invoke-RestMethod "http://localhost:3000/api/local/meta"
```

## Troubleshooting veloce

- UI vuota o incoerente:
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cd C:\TS-API
npm run build
npm run start
```

- Sync bloccata:
  - controlla `/api/sync/history`
  - rilancia la sync
  - se appare limite pagine raggiunto, aumenta `maxPages` nella richiesta di sync

- Dati articolo senza codice:
  - verificare `cache_articoli.codice_articolo` in SQL
  - rilanciare sync completa se necessario

## Checklist rollout / rollback

1. Verifica `SYNC_INCREMENTAL_ENABLED=true` solo in ambiente controllato.
2. Verifica `SYNC_ON_DEMAND_ENABLED=true` solo quando il backend sara pronto a supportare il scope mirato.
3. Esegui una sync completa di baseline prima di usare l'incrementale.
4. Controlla i job e i conteggi dopo il primo delta.
5. Se qualcosa non torna, disabilita `SYNC_INCREMENTAL_ENABLED` o `SYNC_ON_DEMAND_ENABLED`.
6. Rilancia una sync completa per riallineare cache e metadati.

## Documentazione completa

- Stato operativo: `DEVELOPMENT_STATE.md`
- Riferimento unico ambiente/API: `docs/AMBIENTE_UNICO_RIFERIMENTO.md`
- Storia completa progetto: `docs/PROJECT_HISTORY_COMPLETE.md`
- Readiness SQL Server: `docs/SQLSERVER_IMPLEMENTATION_READINESS.md`
- Specifiche API: `docs/api-specs-summary.md`
- Log attività iniziale: `docs/activity-log.md`
