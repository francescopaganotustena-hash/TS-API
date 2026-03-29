# Activity Log - Analisi API Alyante

## Data: 27 Marzo 2026

### Attività Svolta: Analisi Progetto TS-API e Recupero Specifiche API

#### Obiettivo
Analizzare il progetto TS-API Portal e recuperare le specifiche delle API dal gestionale Alyante per consentire lo sviluppo di un portale di integrazione.

#### Azioni Eseguite

1. **Analisi della Struttura del Progetto**
   - Esaminato `package.json` per dipendenze e script
   - Letto `PROJECT_SETUP.md` per documentazione esistente
   - Analizzati i componenti React:
     - `app/layout.tsx` - Layout principale
     - `app/page.tsx` - Pagina home
     - `components/SearchForm.tsx` - Form di ricerca
     - `components/DataTable.tsx` - Tabella dati
   - Esaminato `lib/api.ts` - Layer API
   - Controllati file di configurazione:
     - `next.config.ts`
     - `tailwind.config.ts`
     - `tsconfig.json`

2. **Recupero Specifiche API dal Gestionale**
   - Connesso a: `http://192.168.178.74:9080`
   - Recuperato Swagger UI da: `/api/swagger/docs/index.html`
   - Scaricato specifiche JSON da: `/api/swagger.json`
   - File salvato localmente: `swagger-api.json`

3. **Analisi delle API Disponibili**
   - Identificato pattern URL: `/v1/{ambiente}/{verticale?}/{Entita}/{id}`
   - Mappate tutte le operazioni CRUD supportate
   - Catalogate 60+ entità disponibili raggruppate per categoria:
     - Contabilità (CO)
     - Anagrafiche
     - Gestione Documenti (MG)
     - Clienti/Fornitori (MG)
     - Articoli/Magazzino (MG)
     - Produzione (PD)
     - WMS
     - Varie (License, Job, Lookup, etc.)

4. **Documentazione Creata**
   - `docs/api-specs-summary.md` - Specifiche complete API Alyante
   - `docs/activity-log.md` - Questo file di log

#### Risultati Ottenuti

| Elemento | Dettaglio |
|----------|-----------|
| API Base URL | `http://192.168.178.74:9080/api` |
| Swagger Version | 2.0 |
| Entità Totali | 60+ |
| Operazioni per Entità | GetById, Search, Create, Update, Delete, Validate, ValidateProperties |
| File Specifiche | `swagger-api.json` |

#### Entità Principali Identificate

**Contabilità:**
- ContoPdcCG, GruppoPdcCG, Azienda, Iva, ValutaCO, SedeCO

**Anagrafiche:**
- AnagraficaGenerale, Banca, Agenzia

**Gestione Documenti:**
- DocumentoTestata, DocumentoRiga, AnagraficaDocumentoDitta

**Clienti/Fornitori:**
- ClienteFornitore, Agente, Destinatario

**Articoli/Magazzino:**
- Articolo, Categoria, Famiglia, Giacenza, ListinoArticolo

**Produzione:**
- Commessa, Progetto, McProductionOrder, McStock

#### Prossimi Passi Raccomandati

1. **Configurazione Ambiente**
   ```env
   GESTIONALE_API_URL=http://192.168.178.74:9080/api
   GESTIONALE_API_KEY=<api-key>
   ```

2. **Selezione Entità per MVP**
   - Scegliere 2-3 entità per iniziare (es. ClienteFornitoreMG, Articolo)

3. **Sviluppo Componenti**
   - Personalizzare `SearchForm.tsx` con campi entità-specifici
   - Configurare `DataTable.tsx` con colonne appropriate
   - Implementare chiamate API in `lib/api.ts`

4. **Autenticazione**
   - Implementare meccanismo di autenticazione per chiamate al gestionale

#### Note Tecniche

- Le API utilizzano `SearchGroupDTO` per tutte le operazioni di ricerca
- Il parametro `ambiente` è obbligatorio in tutte le chiamate
- Il parametro `verticale` è opzionale per supporto multi-tenancy
- Tutte le entità supportano validazione lato server

#### File Correlati

- `swagger-api.json` - Specifiche complete OpenAPI/Swagger
- `docs/api-specs-summary.md` - Documentazione sintetica API
- `docs/activity-log.md` - Questo file

---
*Attività completata con successo. Tutte le specifiche API sono state recuperate e documentate.*
---

## Nota Operativa: Incremental Sync e Rollback

### Flag di configurazione

- `SYNC_INCREMENTAL_ENABLED=false` di default.
- `SYNC_ON_DEMAND_ENABLED=false` di default.
- Se impostato a `true`, il backend puo esporre la modalita incrementale.
- Se il flag e `false`, ogni richiesta incremental deve ricadere su una sync completa.
- Il primo MVP scope-based riguarda solo `scope=resource`.

### Strategia di rollback

1. Disabilitare subito `SYNC_INCREMENTAL_ENABLED`.
2. Forzare una sync completa manuale con `syncMode=full`.
3. Considerare il job in corso come non modificabile: la modalita non cambia a runtime.
4. Attendersi che il job successivo riallinei completamente cache e metadati.
5. Disabilitare `SYNC_ON_DEMAND_ENABLED` se si vuole tornare al solo flusso manuale.

### Checklist rapida

1. Validare la baseline con una sync completa prima del rollout.
2. Abilitare l'incrementale solo in ambiente controllato.
3. Abilitare `SYNC_ON_DEMAND_ENABLED` solo dopo il supporto backend per lo scope mirato.
4. Controllare conteggi e job history dopo il primo delta.
5. In caso di anomalie, spegnere il flag e rilanciare una full sync.

---

## Data: 29 Marzo 2026

### Stato Sviluppi - Sessione Operativa

#### Sincronizzazione

- Corretto `scope=resource + incremental` per usare baseline per-risorsa (`resources[resource].updatedAt`) con fallback controllato.
- Corretto `scope=full + incremental`: ora considera anche baseline generate da sync ristrette; fallback full solo sulle risorse senza baseline valida.
- Aggiornata UX pagina Sync:
  - terminologia semplificata (`Ambito`, `Strategia sync`, `Differenziale`, `Ricarica completa`);
  - tooltip informativi su `Ambito`, `Strategia`, `Overlap`;
  - rimosso pulsante `Comprimi` in questo flusso;
  - aggiunto pulsante `Torna alla home` in testata.
- Gestito caso operativo di job "zombie" rimasto `running` dopo riavvii, con sblocco manuale e rilancio test.

#### Explorer e Dati Documento

- Risolto errore SQL su filtri numerici grandi (`numReg` oltre `INT`): binding ora usa `BIGINT` quando necessario.
- Corretto mapping nominativo cliente/fornitore nei documenti:
  - eliminata collisione `cliFor` vs `idCliFor`;
  - risoluzione contestuale nome in vista clienti/fornitori.
- Aggiunta visualizzazione nome accanto a `Cliente/Fornitore` nella lista documenti.
- Abilitati importi documento anche quando la testata non li espone:
  - calcolo da `righeOrdine` (somma `importo`) in lettura locale ordini.

#### Simulazioni Documento

- Aggiunta pagina `Fattura Simulata` con apertura in nuovo tab dal pannello dettaglio.
- Aggiunta pagina `Ordine Simulato` con apertura in nuovo tab.
- Aggiunta pagina `DDT Simulato` (fornitori) con apertura in nuovo tab.
- Corretto errore di hydration nella pagina fattura simulata (gestione parametro `numReg` lato client con `useSearchParams`).

#### Esito Verifiche

- `npm run lint` superato dopo ogni modifica principale.
- Verificata esecuzione reale di sync incrementali su risorse multiple.
- Verificato fallback per-risorsa durante sync globale incrementale.
