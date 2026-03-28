# SQL Server Readiness (Step 0)

Ultimo aggiornamento: 2026-03-28

## Obiettivo
Preparare il progetto alla migrazione da storage JSON locale a database SQL Server locale, con percorso lineare verso produzione.

## Decisioni tecniche
- Engine target: SQL Server (LocalDB / Express / Developer)
- Pattern: repository + provider (`json` -> `sqlserver`)
- Compatibilita futura: mantenere la logica query nel backend e ridurre SQL "sparso"
- Migrazione graduale: nessun breaking change su API frontend

## Variabili ambiente previste
- `SYNC_STORAGE_PROVIDER=json|sqlserver`
- `SQLSERVER_CONNECTION_STRING=Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True;Encrypt=False;`
- `SQLSERVER_SCHEMA=dbo`

## Modello dati minimo (prima fase)
- `sync_jobs` (monitoraggio/telemetria)
- `sync_meta` (ultima sync + stato)
- `clienti`
- `fornitori`
- `articoli`
- `ordini`
- `righe_ordine`

## Principi schema
- Colonne native per chiavi/filtri frequenti (`cliFor`, `tipodoc`, `numReg`, `datadoc`)
- Colonna `raw_json` per payload completo (flessibilita e debug)
- Indici sulle chiavi di navigazione albero e ricerca
- Upsert per sincronizzazione incrementale

## Piano operativo (prossimo step)
1. Introdurre modulo DB SQL Server (connessione + healthcheck)
2. Applicare DDL iniziale (file `sql/sqlserver/001_init.sql`)
3. Implementare repository SQL Server parallelo al repository JSON
4. Flag runtime `SYNC_STORAGE_PROVIDER` per switch controllato
5. Migrare endpoint sync/meta/history al nuovo repository
6. Test: sync completa, polling, ricerca, albero documenti

## Rischi noti
- Mapping campi eterogenei dal gestionale (serve normalizzazione)
- Volume ordini/righe: necessari indici e paginazione SQL robusta
- Gestione lock job sync concorrenti (usare transazione + stato job)

