# Soluzione: Visibilità documenti sotto clienti/fornitori

## Problema

Espandendo un cliente (o fornitore) nella schermata principale, le sottocartelle Fatture, Ordini, DDT e Altri documenti mostravano sempre "Nessun documento locale ancora disponibile" anche dopo una sincronizzazione completata con successo.

## Causa radice

Il codice era stato recentemente riscritto per passare da un approccio con **filtri lato server** a uno con **cache globale + filtro lato client**.

### Vecchio approccio (funzionante)

```typescript
let docs = await fetchLocalRows({
  filters: activeResource === "fornitori" ? { cliforfatt: ownerCode } : { cliForDest: ownerCode },
  extendedMode: true,
});
```

Il filtro `{ cliforfatt: ownerCode }` veniva tradotto in una query SQL che usava direttamente la colonna INT `cli_for_fatt`, popolata da `normalizeRow` durante il sync con gestione di tutte le varianti del nome campo:

```typescript
cli_for_fatt: toNullableInt(getFirstPathValue(row, "cliforfatt", "cliForFatt", "cli_for_fatt")),
```

### Nuovo approccio (rotto)

```typescript
const allDocs = await getAllOrders(); // fetch di tutti gli ordini senza filtri
let docs = filterDocsByOwnerCode(allDocs, ownerCode); // filtro lato client
```

Il filtro lato client cercava il codice cliente/fornitore direttamente nel `raw_json` parsato:

```typescript
const codeCandidates = [
  asText(getByPath(row, "cliforfatt")),   // <-- case-sensitive
  asText(getByPath(row, "cliForDest")),
  asText(getByPath(row, "clienteFornitoreMG.cliFor")),
  // ...
];
```

Il problema: `getByPath` in `page.tsx` fa una ricerca **case-sensitive** sulle chiavi JSON. L'API Alyante restituisce il campo come `cliForFatt` (camelCase con F maiuscola), non `cliforfatt` (tutto minuscolo). Il filtro non trovava mai corrispondenza e restituiva 0 documenti.

Anche il secondo bug presente — `const docs = filterDocsByOwnerCode(...)` seguito da `docs = dedupeDocs(docs)` (riassegnazione di una `const`) — è stato corretto cambiando `const` in `let`, ma non era la causa principale del problema di visibilità.

## Fix applicato

### 1. `app/api/_syncStoreSqlServer.ts` — Iniezione colonne INT nel record restituito

Nel metodo `queryLocalResource`, dopo il parse del `raw_json` per ogni documento di tipo `ordini`, vengono iniettati i valori delle colonne INT SQL come campi speciali `_cliForFatt` e `_cliForDest`:

```typescript
// Prima (solo il JSON parsato)
return parsedRecord;

// Dopo (JSON parsato + colonne INT affidabili)
if (rec.cli_for_fatt != null) parsedRecord._cliForFatt = Number(rec.cli_for_fatt);
if (rec.cli_for_dest != null) parsedRecord._cliForDest = Number(rec.cli_for_dest);
return parsedRecord;
```

Le colonne INT sono **sempre popolate correttamente** durante il sync da `normalizeRow`, che gestisce tutte le varianti del nome campo (`cliforfatt`, `cliForFatt`, `cli_for_fatt`). Iniettarle nel record restituito le rende disponibili al filtro lato client con un valore garantito.

### 2. `app/page.tsx` — Filtro lato client aggiornato

La funzione `filterDocsByOwnerCode` controlla ora i campi iniettati come prima priorità, più la variante camelCase `cliForFatt` che prima mancava:

```typescript
const codeCandidates = [
  asText(getByPath(row, "_cliForFatt")),          // colonna SQL iniettata (affidabile)
  asText(getByPath(row, "_cliForDest")),           // colonna SQL iniettata (affidabile)
  asText(getByPath(row, "clienteFornitoreMG.cliFor")),
  asText(getByPath(row, "clienteFornitoreMG.idCliFor")),
  asText(getByPath(row, "cliforfatt")),            // variante lowercase
  asText(getByPath(row, "cliForFatt")),            // variante camelCase (aggiunta)
  asText(getByPath(row, "cliForDest")),
  asText(getByPath(row, "idCliFor")),
  asText(getByPath(row, "cliFor")),
];
```

## Perché il vecchio approccio funzionava e il nuovo no

| Aspetto | Vecchio (server-side) | Nuovo (client-side) |
|---|---|---|
| Fonte del filtro | Colonna INT `cli_for_fatt` | Campo JSON `cliforfatt` |
| Gestione varianti nome | `normalizeRow` (case-insensitive) | `getByPath` (case-sensitive) |
| Dipendenza da enrichment | No | Parziale |
| Affidabilità | Alta | Bassa senza fix |

## Lezione appresa

Quando si passa da filtri server-side a filtri client-side su dati JSON, bisogna considerare che:
- I nomi dei campi nel JSON grezzo possono variare (es. `cliforfatt` vs `cliForFatt`)
- La funzione di ricerca nel JSON potrebbe essere case-sensitive
- Le colonne SQL calcolate durante il sync sono più affidabili dei campi JSON grezzi per operazioni di filtro
