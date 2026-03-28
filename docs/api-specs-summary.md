# Alyante Web API - Specifiche Recuparate

## Informazioni Generali
- **Titolo:** Alyante Web API
- **Versione:** v1
- **Base URL:** `http://192.168.178.74:9080`
- **Swagger JSON:** `/api/swagger.json`

## Struttura URL Pattern

Tutte le API seguono il pattern:
```
/v1/{ambiente}/{verticale?}/{Entita}/{id}
/v1/{ambiente}/{verticale?}/{Entita}{._op=operation?}
```

### Parametri Path Comuni
- `ambiente` (required): L'ambiente di lavoro
- `verticale` (opzionale): Il verticale di lavoro

## Operazioni Standard per Entità

Ogni entità supporta le seguenti operazioni:

| Operazione | Metodo | Endpoint | Descrizione |
|------------|--------|----------|-------------|
| GetById | GET | `/{id}` | Recupera oggetto per ID |
| Search | POST | `{._op=search?}` | Ricerca con filtri |
| Create | POST | `/` (body) | Crea nuovo oggetto |
| Update | PUT | `/{id}` (body) | Aggiorna oggetto |
| Delete | DELETE | `/{id}` | Elimina oggetto |
| Validate | POST | `{._op=validate?}` | Valida oggetto |
| ValidateProperties | POST | `{._op=validateproperties?}` | Valida proprietà specifiche |

## Entità Disponibili (per categoria)

### 1. Environments & Auth
- **Environments**: Gestione ambienti di esecuzione (`/auth/environments`)

### 2. Contabilità (CO)
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| ContoPdcCG | ContoPdcCGDTO | Conti piano dei conti |
| GruppoPdcCG | GruppoPdcCGDTO | Gruppi piano dei conti |
| Azienda | AziendaCODTO | Aziende |
| ApplicationCO | ApplicationCODTO | Applicazioni |
| Iva | CodIvaCODTO | Codici IVA |
| CondizionePagamentoCO | CondizionePagamentoCODTO | Condizioni di pagamento |
| StatoEsteroCO | StatoEsteroCODTO | Stati esteri |
| MasterRegistrazioneCO | MasterRegistrazioneCODTO | Master registrazioni |
| AnagraficaIntermedioCO | AnagraficaIntermedioCODTO | Anagrafiche intermedie |
| SedeCO | SedeCODTO | Sedi |
| ValutaCO | ValutaCODTO | Valute |

### 3. Anagrafiche
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| Anagrafica | AnagraficaGeneraleCODTO | Anagrafica generale |
| Banca | BancaCODTO | Banche |
| Agenzia | AgenziaCODTO | Agenzie bancarie |

### 4. Gestione Documenti (MG)
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| Documento | DocumentoTestataMGDTO | Testate documenti |
| RigaDocumento | DocumentoRigaMGDTO | Righe documenti |
| AnagraficaDocumentoDittaMG | AnagraficaDocumentoDittaMGDTO | Anagrafica documenti ditta |
| HeadingReferenceDocumentMG | HeadingReferenceDocumentMGDTO | Riferimenti documenti |
| ParametriGeneraliDocumentiMG | ParametriGeneraliDocumentiMGDTO | Parametri documenti |

### 5. Clienti/Fornitori (MG)
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| ClienteFornitoreMG | ClienteFornitoreMGDTO | Clienti e fornitori |
| DestinatarioMG | DestinatarioMGDTO | Destinatari |
| CliForClassificazioniMG | CliForClassificazioniMGDTO | Classificazioni cli/for |
| AgenteMG | AgenteMGDTO | Agenti |
| AgentiMultipliMG | AgentiMultipliMGDTO | Agenti multipli |
| ClienteFornitoreArticoloMG | ClienteFornitoreArticoloMGDTO | Articoli per cli/for |

### 6. Articoli e Magazzino (MG)
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| Articolo | ArticoloMGDTO | Articoli |
| CategoriaMG | CategoriaMGDTO | Categorie articoli |
| FamigliaMG | FamigliaMGDTO | Famiglie articoli |
| SottoFamigliaMG | SottoFamigliaMGDTO | Sottofamiglie |
| GruppoArticoliMG | GruppoArticoliMGDTO | Gruppi articoli |
| SottoGruppoArticoliMG | SottoGruppoArticoliMGDTO | Sottogruppi |
| MacroAreaMG | MacroAreaMGDTO | Macro aree |
| MacroCategoriaMG | MacroCategoriaMGDTO | Macro categorie |
| MarcaMG | MarcaMGDTO | Marche |
| SottoCategoriaMG | SottoCategoriaMGDTO | Sottocategorie |
| AreaMG | AreaMGDTO | Aree |
| ZonaMG | ZonaMGDTO | Zone |
| DepositoMG | DepositoMGDTO | Depositi |
| GiacenzaMG | GiacenzaMGDTO | Giacenze magazzino |
| ListinoArticoloLI | ListinoArticoloLIDTO | Listini articoli |
| CodiceListinoVenditaAcquistoMG | CodiceListinoVenditaAcquistoMGDTO | Codici listino |
| ArticoloAgenteMG | ArticoloAgenteMGDTO | Articoli per agente |
| RicalcoloPrezziMG | RicalcoloPrezziMGDTO | Ricalcolo prezzi |
| AnagraficaLottoMG | AnagraficaLottoMGDTO | Lotti |

### 7. Classificazioni Statistiche
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| Raggruppamento1MG | Raggruppamento1MGDTO | Raggruppamento 1 |
| Raggruppamento2MG | Raggruppamento2MGDTO | Raggruppamento 2 |
| Raggruppamento3MG | Raggruppamento3MGDTO | Raggruppamento 3 |

### 8. Produzione (PD)
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| CommessaPD | - | Commesse produzione |
| Progetto | - | Progetti |
| TipoProgettoPD | - | Tipi progetto |
| McProductionOrderPD | - | Ordini produzione |
| McBillMaterialPD | - | Distinte base |
| McDepartmentPD | - | Reparti |
| McItemPD | - | Item produzione |
| McMachinePD | - | Macchine |
| McOperatorPD | - | Operatori |
| McRegAvanzPD | - | Registrazioni avanzamento |
| McRegMatPD | - | Registrazioni materiali |
| McStockLotPD | - | Giacenze lotti |
| McStockPD | - | Giacenze |
| McWorkcenterPD | - | Centri di lavoro |
| McWorkingCyclePD | - | Cicli di lavoro |

### 9. WMS (Warehouse Management)
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| WMSCompanyConfigMG | - | Configurazione azienda WMS |
| WMSStorageConfigMG | - | Configurazione magazzino WMS |
| WMSOpRettificationMG | - | Rettifiche WMS |
| WMSOrdPrelMG | - | Prelievi WMS |

### 10. Varie
| Entità | DTO | Descrizione |
|--------|-----|-------------|
| License | LicenseFWDTO | Licenze |
| polyedroservice | PolyedroWSFWDTO | Servizi Polyedro |
| Hypermedia | - | Gestione media/allegati |
| Thesaurus | - | Risorse localizzate |
| Metadata | - | Metadati dominio |
| Job | - | Job e operazioni lunghe |
| Lookup | - | Lookup dati applicativi |
| GpsLogPD | GpsLogPD | Log GPS |

## DTO di Supporto

### SearchGroupDTO
Utilizzato per tutte le ricerche:
```json
{
  "pageNumber": 1,
  "pageSize": 20,
  "items": [
    {
      "propertyName": "nomeCampo",
      "value": "valore",
      "comparer": 0,  // Equal=0, NotEqual=1, GreaterThan=10, LessThan=11, etc.
      "operator": 1   // And=1, Or=2, Not=3
    }
  ],
  "orderingProperties": ["campoOrdinamento"]
}
```

### ValidateDTO
Risposta dalle operazioni di validazione:
```json
{
  "isValid": true,
  "messages": []
}
```

## Esempi di Chiamate

### 1. Ricerca Clienti/Fornitori
```http
POST /v1/{ambiente}/ClienteFornitoreMG{._op=search?}
Content-Type: application/json

{
  "pageNumber": 1,
  "pageSize": 20,
  "items": [
    {
      "propertyName": "RagioneSociale",
      "value": "Rossi",
      "comparer": 20,  // Contains
      "operator": 1    // And
    }
  ]
}
```

### 2. Recupero Articolo per ID
```http
GET /v1/{ambiente}/Articolo/{id-articolo}
Accept: application/json
```

### 3. Creazione Nuovo Documento
```http
POST /v1/{ambiente}/Documento
Content-Type: application/json

{
  "TipoDocumento": "DDT",
  "Numero": 123,
  "Data": "2026-03-27",
  "Cliente": {...}
}
```

### 4. Ricalcolo Giacenze
```http
POST /v1/{ambiente}/GiacenzaMG{._op=ricalcologiacenza?}
Content-Type: application/json

{
  "articolo": "ART001",
  "deposito": "DEP01"
}
```

## Note Importanti

1. **Autenticazione**: Le API richiedono autenticazione (da configurare)
2. **Ambiente**: Il parametro `ambiente` è obbligatorio in tutte le chiamate
3. **Verticale**: Il parametro `verticale` è opzionale per multi-tenancy
4. **Validazione**: Tutte le entità supportano validazione lato server
5. **Forza Operazioni**: Il parametro `force` permette di ignorare errori specifici

## Prossimi Passi per il Progetto TS-API

1. **Configurare `.env.local`**:
   ```env
   GESTIONALE_API_URL=http://192.168.178.74:9080/api
   GESTIONALE_API_KEY=<api-key>
   ```

2. **Scegliere le entità da esporre** nel portale (es. ClienteFornitoreMG, Articolo, Documento)

3. **Personalizzare SearchForm** con i campi specifici dell'entità selezionata

4. **Aggiornare DataTable** con le colonne appropriate per i dati restituiti