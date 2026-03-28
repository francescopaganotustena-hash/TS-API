---
name: ts-api-portal-design
description: Design per portale Next.js che interroga API gestionale
type: project
---

# TS-API Portal - Design Document

## Panoramica

**Progetto:** TS-API Portal
**Tipo:** Web Application (Full-stack)
**Framework:** Next.js
**Data:** 2026-03-27

## Obiettivo

Creare un portale web che permette agli utenti di interrogare le API di un gestionale esterno, impostando parametri di ricerca tramite un form e visualizzando i risultati in una tabella.

## Architettura

### Stack Tecnologico
- **Frontend:** Next.js con React (App Router)
- **Styling:** CSS Modules o Tailwind CSS
- **Backend:** Next.js API Routes
- **Lingua:** TypeScript

### Struttura del Progetto

```
TS-API/
├── app/
│   ├── page.tsx          # Home principale
│   ├── layout.tsx        # Layout base
│   └── api/
│       └── dati/         # Endpoint interno
├── components/
│   ├── SearchForm.tsx    # Form parametri ricerca
│   └── DataTable.tsx    # Tabella risultati
├── lib/
│   └── api.ts            # Client per API gestionale
├── package.json
└── .env.local            # Variabili ambiente
```

## Flusso Applicativo

1. **Input Utente:** L'utente compila il form con i parametri di ricerca
2. **Richiesta:** Il frontend invia i parametri all'endpoint `/api/dati`
3. **Elaborazione:** Il backend Next.js inoltra la richiesta al gestionale
4. **Risposta:** I dati vengono restituiti al frontend
5. **Visualizzazione:** I risultati appaiono nella tabella

## Interfaccia Utente

### Componenti UI
- **SearchForm:** Campi input per i parametri di ricerca + pulsante submit
- **DataTable:** Tabella per visualizzare i dati ricevuti
- **Loading State:** Indicatore durante il caricamento
- **Error State:** Messaggio in caso di errore

### Comportamento
- Validazione base dei campi input
- Gestione stati di caricamento
- Gestione errori con messaggi utente

## Configurazione

### Variabili d'Ambiente (.env.local)
```
GESTIONALE_API_URL=url_del_gestionale
GESTIONALE_API_KEY=chiave_api
```

### Note
- Portale per uso interno (nessuna autenticazione)
- CORS configurato per permettere chiamate dal frontend

## Acceptance Criteria

1. ✅ Il form accetta parametri di ricerca dall'utente
2. ✅ La richiesta viene inviata correttamente all'API del gestionale
3. ✅ I risultati vengono visualizzati in una tabella
4. ✅ Gli stati di loading e errore sono gestiti
5. ✅ L'applicazione è avviabile con `npm run dev`