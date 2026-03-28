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
- `SYNC_STORAGE_PROVIDER=sqlserver`
- `SQLSERVER_CONNECTION_STRING`
- `SQLSERVER_SCHEMA=dbo`

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

## Documentazione completa

- Stato operativo: `DEVELOPMENT_STATE.md`
- Storia completa progetto: `docs/PROJECT_HISTORY_COMPLETE.md`
- Readiness SQL Server: `docs/SQLSERVER_IMPLEMENTATION_READINESS.md`
- Specifiche API: `docs/api-specs-summary.md`
- Log attività iniziale: `docs/activity-log.md`
