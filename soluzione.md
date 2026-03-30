# Soluzione definitiva: visibilita documenti stabile anche dopo riavvio

## Problema osservato

Dopo riavvio del servizio, sotto clienti/fornitori le cartelle documento (Fatture, Ordini, DDT, Altri documenti) risultavano vuote o intermittenti, anche con cache locale gia sincronizzata. Su clienti con molti documenti (es. MARINCO) il problema era piu evidente per via dei tempi di caricamento piu lunghi.

## Causa radice (reale)

Il problema non era la perdita dati.
I dati erano presenti in SQL Server, ma il flusso UI era fragile su piu livelli:

1. caricava grandi volumi di ordini in client con pageSize piccolo (molte richieste sequenziali)
2. filtrava lato frontend
3. in caso di timeout/errori nel fetch massivo, la UI finiva facilmente su placeholder a zero
4. la cache in memoria `allOrdersCacheRef` poteva memorizzare array vuoti (`[]`) che in JavaScript sono truthy, bloccando ogni re-fetch successivo
5. se entrambe le query mirate fallivano, il fallback a `getAllOrders()` non veniva raggiunto per un bug nella struttura try/catch

In parallelo, c'era anche un punto backend da rendere piu robusto:
nella query paginata ordini non venivano sempre esposte le colonne SQL affidabili per owner (`cli_for_fatt`, `cli_for_dest`) usate per supportare il filtro client-side.

## Patch applicata

### 1) Backend SQL: esposizione colonne owner affidabili nella query ordini

File: `app/api/_syncStoreSqlServer.ts`

Nel ramo `queryLocalResource(..., resource === "ordini")` la CTE `page` e la `SELECT` finale includono ora:

- `cli_for_fatt`
- `cli_for_dest`

Questo garantisce che i campi iniettati `_cliForFatt` / `_cliForDest` siano sempre disponibili nel payload locale.

### 2) Frontend: strategia di caricamento documenti piu resiliente

File: `app/page.tsx`

Nel caricamento documenti on-demand per cliente/fornitore:

1. prima prova query mirata (`clifordest` per clienti, `cliforfatt` per fornitori)
2. usa `docsPageSize = 500` righe per pagina per ridurre drasticamente il numero di richieste HTTP sequenziali
3. se il fetch completo fallisce, fallback alla prima pagina mirata (protetto da proprio try/catch)
4. solo se ancora vuoto, fallback al caricamento globale + filtro locale

### 3) Frontend: fix cache `allOrdersCacheRef` con array vuoti

In JavaScript `[]` e truthy, quindi `if (allOrdersCacheRef.current)` ritornava `true` anche con array vuoto, impedendo ogni re-fetch successivo dopo un caricamento a vuoto.

Fix: controllo cambiato in `allOrdersCacheRef.current !== null && allOrdersCacheRef.current.length > 0`, e il risultato viene memorizzato solo se non vuoto.

### 4) Frontend: fix try/catch annidato per `getTargetedOrdersFirstPage`

Se `getTargetedOrders()` lanciava un'eccezione, il catch chiamava `getTargetedOrdersFirstPage()` senza protezione. Se anche questa lanciava (es. sync in corso al riavvio), l'eccezione propagava fuori e il fallback a `getAllOrders()` non veniva mai raggiunto.

Fix: `getTargetedOrdersFirstPage()` e ora avvolta nel proprio try/catch, garantendo che il blocco `getAllOrders()` venga sempre raggiunto se entrambe le query mirate falliscono.

## Impatto quantitativo sul numero di richieste HTTP

Con `docsPageSize = 500` (prima era 100):

| Scenario | Prima | Dopo |
|---|---|---|
| `getAllOrders()` su 11.291 ordini | 113 richieste | 23 richieste |
| Cliente grande (es. MARINCO ~1000 doc) | 10 richieste | 2 richieste |
| Fallback prima pagina | 100 doc | 500 doc |

## Verifica tecnica eseguita

Confronto diretto SQL vs API locale (stessa sessione):

- SQL `cache_ordini`: `11291`
- API `/api/local/ordini`: `11291`
- SQL `cache_righe_ordine`: `61126`
- API `/api/local/righeOrdine`: `61126`
- SQL ordini cliente `6`: `2701`
- API `/api/local/ordini?clifordest=6`: `2701`

Tutti i clienti incluso MARINCO mostrano i documenti correttamente dopo riavvio.

## File toccati

- `app/api/_syncStoreSqlServer.ts`
- `app/page.tsx`
- `soluzione.md`
