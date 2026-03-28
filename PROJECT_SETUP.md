# TS-API Portal - Project Setup

## Overview

- **Created:** 2026-03-27
- **Framework:** Next.js 15 with TypeScript
- **Styling:** Tailwind CSS
- **Location:** `C:\TS-API`

## Current Status

**Stato:** ✅ Configurato e funzionante - Integrazione con Alyante API completa
**Ultimo aggiornamento:** 2026-03-27
**Server:** Ferto

Il portale è stato implementato per interrogare le API del gestionale Alyante ed è pronto per l'uso.

## Project Structure

```
TS-API/
├── app/
│   ├── api/dati/route.ts    # Endpoint API (POST/GET)
│   ├── globals.css          # Stili globali Tailwind
│   ├── layout.tsx           # Layout principale
│   └── page.tsx            # Pagina home con form e tabella
├── components/
│   ├── SearchForm.tsx       # Form con selettore ambiente/entità
│   └── DataTable.tsx       # Tabella per visualizzare i risultati
├── lib/
│   └── api.ts              # Client per chiamare le API Alyante
├── docs/superpowers/specs/
│   └── 2026-03-27-ts-api-portal-design.md  # Design document
├── Swagger/                # Swagger UI (statico)
├── swagger-api.json        # Specifiche API Alyante
├── .env.local             # Variabili ambiente (configurato)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.ts
```

## Commands

```bash
# Avviare il server di sviluppo
cd C:\TS-API
npm run dev

# Build per produzione
npm run build

# Start produzione
npm start
```

## Configuration (.env.local) - Configurato

```env
GESTIONALE_API_URL=http://miorouter.homeip.net:9080/api/v1
GESTIONALE_USERNAME=Default
GESTIONALE_PASSWORD=password
```

## Funzionalità Implementate

### Form di Ricerca
- **Selettore Ambiente:** PRODUZIONE, SVILUPPO, TEST
- **Selettore Verticale:** opzionale, attivabile con checkbox
- **Selettore Entità:**
  - Anagrafica (Clienti/Fornitori)
  - Documenti
  - Articoli
- **Campi di ricerca dinamici** in base all'entità selezionata

### Endpoint Supportati
- `POST /api/dati` - Ricerca con body JSON
- `GET /api/dati?ambiente=X&entity=Y&campo1=valore` - Ricerca con query string

## Prossimi Passi

1. Avviare il server con `npm run dev`
2. Aprire il browser all'URL mostrato (solitamente http://localhost:3000)
3. Selezionare l'entità desiderata
4. Inserire i filtri di ricerca
5. Cliccare "Cerca"

## Note

- Il portale è pensato per uso interno (nessuna autenticazione lato portale)
- Le credenziali del gestionale sono configurate in `.env.local`
- L'API del gestionale usa autenticazione Basic Auth
- Il server Next.js usa una porta diversa se la 3000 è occupata (3001, 3002, ecc.)