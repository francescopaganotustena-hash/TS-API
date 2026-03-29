# TS-API Next Generation - Piano di Sviluppo Futuro

**Data documento:** 28 Marzo 2026  
**Versione:** 1.0  
**Stato:** Piano strategico per evoluzione piattaforma

---

## Sommario Esecutivo

Questo documento descrive il piano dettagliato per la creazione di **TS-API Nexus**, un'evoluzione radicale del TS-API esistente. Il nuovo sistema manterrà tutte le funzionalità attuali ma le potenzierà con un'architettura moderna, UI/UX di nuova generazione e funzionalità drag & drop avanzate.

### Obiettivi Principali
1. **Performance 10x** rispetto all'attuale implementazione
2. **UI/UX Super Moderna** con animazioni fluide e design system coerente
3. **Drag & Drop Nativo** per workflow builder e dashboard customization
4. **Real-time Updates** per sincronizzazione e notifiche live
5. **Architettura Scalabile** enterprise-ready

---

## 1. Stack Tecnologico Proposto

### 1.1 Frontend Stack

| Categoria | Tecnologia | Versione | Motivazione |
|-----------|-----------|----------|-------------|
| Framework | Next.js | 15.x | App Router, SSR/SSG, React Server Components |
| Linguaggio | TypeScript | 5.x | Type-safety end-to-end |
| UI Components | Shadcn/ui | Latest | Componenti accessibili, customizzabili |
| Primitive UI | Radix UI | Latest | Accessibilità nativa |
| Animazioni | Framer Motion | 11.x | Animazioni 60fps, gesture support |
| Drag & Drop | dnd-kit | 6.x | Moderno, accessibile, performante |
| State Management | Zustand | 4.x | Leggero, semplice, devtools |
| Data Fetching | TanStack Query | 5.x | Cache, background sync, optimistic updates |
| Form Handling | React Hook Form | 7.x | Performance, validazione |
| Validazione | Zod | 3.x | Schema validation type-safe |
| Grafici | Recharts | 2.x | Charts responsive, composabili |
| Tabelle | TanStack Table | 8.x | Headless, flessibile, potente |
| Date Handling | date-fns | 4.x | Leggera, funzionale |
| Utility | lodash-es | 4.x | Utility functions tree-shakable |

### 1.2 Backend Stack

| Categoria | Tecnologia | Versione | Motivazione |
|-----------|-----------|----------|-------------|
| Runtime | Node.js | 22.x | Performance, WebSocket nativo |
| API Framework | Hono | 4.x | Leggero, veloce, type-safe |
| Alternativa | Fastify | 4.x | Plugin ecosystem, performance |
| ORM | Drizzle ORM | Latest | Type-safe, query builder, migration |
| Database | PostgreSQL | 16.x | Open source, performante, estendibile |
| Cache | Redis | 7.x | Sessioni, cache, pub/sub |
| Queue | BullMQ | 5.x | Job processing, scheduling |
| Real-time | Socket.io | 4.x | WebSocket, fallback automatici |
| Search | PostgreSQL + pg_search | - | Full-text search indicizzata |

### 1.3 DevOps & Infrastructure

| Categoria | Tecnologia | Scopo |
|-----------|-----------|-------|
| Container | Docker + Docker Compose | Development e deployment |
| Orchestration | Kubernetes (opzionale) | Scalabilità produzione |
| CI/CD | GitHub Actions | Build, test, deploy automatici |
| Monitoring | Prometheus + Grafana | Metriche e dashboard |
| Logging | Pino + ELK Stack | Log strutturati, ricerca |
| Testing Unit | Vitest | Test veloci, compatibili Jest |
| Testing E2E | Playwright | Browser automation |
| API Mocking | MSW (Mock Service Worker) | Mock API in development |
| Package Manager | PNPM | Workspace, performance |
| Monorepo | Turborepo | Build caching, task pipeline |

---

## 2. Architettura di Sistema

### 2.1 Diagramma Architetturale

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TS-API NEXUS ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         CLIENT LAYER                                    │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Next.js 15 Frontend                          │   │    │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐   │   │    │
│  │  │  │   Explorer  │ │  Dashboard  │ │    Drag & Drop Canvas   │   │   │    │
│  │  │  │   2.0       │ │   Analytics │ │    (Workflow Builder)   │   │   │    │
│  │  │  └─────────────┘ └─────────────┘ └─────────────────────────┘   │   │    │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │   │    │
│  │  │  │         Real-time Sync Status (WebSocket/Socket.io)     │   │   │    │
│  │  │  └─────────────────────────────────────────────────────────┘   │   │    │
│  │  └─────────────────────────────────────────────────────────────────┘   │    │
│  │                                    │                                     │    │
│  │                                    ▼                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────────┐    │    │
│  │  │                    BFF Layer (Backend for Frontend)             │    │    │
│  │  │  - API Gateway (Hono)                                           │    │    │
│  │  │  - GraphQL Server (Apollo/Urql)                                 │    │    │
│  │  │  - WebSocket Gateway                                            │    │    │
│  │  └─────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         SERVICE LAYER                                   │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐    │    │
│  │  │ Sync Service │ │ Cache Service│ │      Job Queue Service       │    │    │
│  │  │              │ │   (Redis)    │ │         (BullMQ)             │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────────┘    │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐    │    │
│  │  │ Alyante API  │ │  WebSocket   │ │      Notification Service    │    │    │
│  │  │  Connector   │ │   Gateway    │ │         (Push)               │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                          DATA LAYER                                     │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐    │    │
│  │  │  PostgreSQL  │ │    Redis     │ │   Message Queue (BullMQ)     │    │    │
│  │  │  (Primario)  │ │   (Cache)    │ │         (Jobs)               │    │    │
│  │  │              │ │              │ │                                │    │    │
│  │  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────────────────────┐ │    │    │
│  │  │ │ Tables   │ │ │ │ Sessions │ │ │ │ • Sync Jobs              │ │    │    │
│  │  │ │ • users  │ │ │ │ • Tokens │ │ │ │ • Export Jobs            │ │    │    │
│  │  │ │ • work-  │ │ │ │ • Cache  │ │ │ │ • Notification Jobs      │ │    │    │
│  │  │ │   spaces │ │ │ │ • Rate   │ │ │ │ • Scheduled Tasks        │ │    │    │
│  │  │ │ • res-   │ │ │ │   Limit  │ │ │ └──────────────────────────┘ │    │    │
│  │  │ │   ources │ │ │ └──────────┘ │ │                                │    │    │
│  │  │ │ • sync_  │ │ │                │ │                                │    │    │
│  │  │ │   jobs   │ │ │                │ │                                │    │    │
│  │  │ │ • audit_ │ │ │                │ │                                │    │    │
│  │  │ │   log    │ │ │                │ │                                │    │    │
│  │  │ └──────────┘ │ │                │ │                                │    │    │
│  │  └──────────────┘ └──────────────────────────────────────────────────────┘    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                        │                                         │
│                                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                       EXTERNAL INTEGRATIONS                             │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐    │    │
│  │  │   Alyante    │ │   Webhook    │ │    Export/Import Service     │    │    │
│  │  │  Gestionale  │ │   Endpoints  │ │    (JSON/CSV/Excel/XML)      │    │    │
│  │  │     API      │ │              │ │                                │    │    │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo Structure

```
ts-api-nexus/
├── apps/
│   ├── web/                          # Next.js 15 frontend application
│   │   ├── app/
│   │   │   ├── (dashboard)/          # Route group: dashboard pages
│   │   │   │   ├── layout.tsx        # Dashboard layout con sidebar
│   │   │   │   ├── page.tsx          # Dashboard home page
│   │   │   │   ├── explorer/
│   │   │   │   │   └── page.tsx      # Explorer 2.0 page
│   │   │   │   ├── search/
│   │   │   │   │   └── page.tsx      # Advanced search page
│   │   │   │   ├── sync/
│   │   │   │   │   └── page.tsx      # Sync management page
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx      # Analytics dashboard
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx      # User settings
│   │   │   ├── (canvas)/             # Route group: drag & drop pages
│   │   │   │   ├── layout.tsx        # Canvas layout (full width)
│   │   │   │   ├── workflow/
│   │   │   │   │   ├── page.tsx      # Workflow builder list
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx  # Workflow editor canvas
│   │   │   │   └── mapper/
│   │   │   │       └── page.tsx      # Field mapper visual tool
│   │   │   ├── api/                  # API routes (Next.js native)
│   │   │   │   ├── trpc/
│   │   │   │   │   └── [trpc]/
│   │   │   │   │       └── route.ts  # tRPC endpoint
│   │   │   │   ├── graphql/
│   │   │   │   │   └── route.ts      # GraphQL endpoint
│   │   │   │   └── webhooks/
│   │   │   │       └── route.ts      # Webhook receiver
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── page.tsx              # Landing/redirect
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn/ui base components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   └── ...
│   │   │   ├── explorer/
│   │   │   │   ├── TreeView.tsx
│   │   │   │   ├── TreeNode.tsx
│   │   │   │   ├── TreeItem.tsx
│   │   │   │   └── ExplorerPanel.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardGrid.tsx
│   │   │   │   ├── WidgetCard.tsx
│   │   │   │   ├── KPICard.tsx
│   │   │   │   └── widgets/
│   │   │   │       ├── SyncStatusWidget.tsx
│   │   │   │       ├── ResourceCountWidget.tsx
│   │   │   │       └── ActivityFeedWidget.tsx
│   │   │   ├── canvas/
│   │   │   │   ├── WorkflowCanvas.tsx
│   │   │   │   ├── CanvasNode.tsx
│   │   │   │   ├── CanvasEdge.tsx
│   │   │   │   ├── NodePalette.tsx
│   │   │   │   ├── PropertyPanel.tsx
│   │   │   │   └── nodes/
│   │   │   │       ├── SourceNode.tsx
│   │   │   │       ├── TransformNode.tsx
│   │   │   │       ├── FilterNode.tsx
│   │   │   │       └── OutputNode.tsx
│   │   │   ├── tables/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── ColumnHeader.tsx
│   │   │   │   ├── Pagination.tsx
│   │   │   │   └── filters/
│   │   │   ├── forms/
│   │   │   │   ├── SearchForm.tsx
│   │   │   │   ├── FilterBuilder.tsx
│   │   │   │   └── fields/
│   │   │   ├── charts/
│   │   │   │   ├── LineChart.tsx
│   │   │   │   ├── BarChart.tsx
│   │   │   │   ├── PieChart.tsx
│   │   │   │   └── AreaChart.tsx
│   │   │   └── layout/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       ├── Footer.tsx
│   │   │       └── Breadcrumbs.tsx
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── client.ts         # API client (fetch wrapper)
│   │   │   │   ├── endpoints.ts      # Endpoint definitions
│   │   │   │   └── types.ts          # API response types
│   │   │   ├── store/
│   │   │   │   ├── index.ts          # Zustand store exports
│   │   │   │   ├── useAppStore.ts    # Global app state
│   │   │   │   ├── useExplorerStore.ts
│   │   │   │   ├── useSyncStore.ts
│   │   │   │   └── useSettingsStore.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useResources.ts   # TanStack Query hooks
│   │   │   │   ├── useSyncStatus.ts
│   │   │   │   ├── useWebSocket.ts
│   │   │   │   └── useDragDrop.ts
│   │   │   └── utils/
│   │   │       ├── cn.ts             # Class name utility
│   │   │       ├── formatters.ts     # Date/number formatters
│   │   │       └── validators.ts     # Zod schemas
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   ├── themes.css
│   │   │   └── animations.css
│   │   ├── types/
│   │   │   ├── api.ts
│   │   │   ├── resources.ts
│   │   │   └── ui.ts
│   │   └── public/
│   │       ├── icons/
│   │       └── images/
│   │
│   └── api/                          # Standalone Hono API server
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── routes/
│       │   │   ├── index.ts          # Route aggregator
│       │   │   ├── health.ts         # Health check endpoint
│       │   │   ├── resources.ts      # Resource CRUD
│       │   │   ├── sync.ts           # Sync job endpoints
│       │   │   ├── workflows.ts      # Workflow endpoints
│       │   │   └── webhooks.ts       # Webhook handlers
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT authentication
│       │   │   ├── cors.ts           # CORS handling
│       │   │   ├── rateLimit.ts      # Rate limiting
│       │   │   ├── logger.ts         # Request logging
│       │   │   └── errorHandler.ts   # Global error handler
│       │   ├── services/
│       │   │   ├── alyanteService.ts # Alyante API connector
│       │   │   ├── syncService.ts    # Sync orchestration
│       │   │   ├── cacheService.ts   # Redis cache operations
│       │   │   ├── workflowService.ts
│       │   │   └── notificationService.ts
│       │   ├── repositories/
│       │   │   ├── base.ts           # Base repository
│       │   │   ├── resourceRepo.ts
│       │   │   ├── syncJobRepo.ts
│       │   │   ├── workflowRepo.ts
│       │   │   └── auditLogRepo.ts
│       │   ├── queues/
│       │   │   ├── index.ts          # Queue definitions
│       │   │   ├── syncQueue.ts      # Sync job processor
│       │   │   ├── exportQueue.ts    # Export job processor
│       │   │   └── notificationQueue.ts
│       │   └── utils/
│       │       ├── logger.ts         # Pino logger
│       │       ├── config.ts         # Configuration loader
│       │       └── errors.ts         # Custom error classes
│       └── tests/
│           ├── unit/
│           ├── integration/
│           └── e2e/
│
├── packages/
│   ├── database/                     # Database package (Drizzle)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── schema/
│   │   │   │   ├── index.ts          # Schema exports
│   │   │   │   ├── users.ts          # Users table schema
│   │   │   │   ├── workspaces.ts
│   │   │   │   ├── resources.ts
│   │   │   │   ├── syncJobs.ts
│   │   │   │   ├── workflows.ts
│   │   │   │   ├── auditLog.ts
│   │   │   │   └── relations.ts      # Table relationships
│   │   │   ├── migrations/
│   │   │   │   └── meta/
│   │   │   └── seeds/
│   │   │       └── index.ts          # Seed data
│   │   └── drizzle.config.ts
│   │
│   ├── api-client/                   # TypeScript SDK
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── client.ts             # API client class
│   │   │   ├── types.ts              # Shared types
│   │   │   ├── resources.ts          # Resource API methods
│   │   │   ├── sync.ts               # Sync API methods
│   │   │   ├── workflows.ts          # Workflow API methods
│   │   │   └── hooks/
│   │   │       ├── useResources.ts   # React Query hooks
│   │   │       └── useSync.ts
│   │   └── package.json
│   │
│   ├── shared/                       # Shared utilities
│   │   ├── src/
│   │   │   ├── constants/
│   │   │   │   ├── api.ts
│   │   │   │   └── ui.ts
│   │   │   ├── utils/
│   │   │   │   ├── date.ts
│   │   │   │   ├── string.ts
│   │   │   │   └── array.ts
│   │   │   └── types/
│   │   │       ├── common.ts
│   │   │       └── api.ts
│   │   └── package.json
│   │
│   └── sync-engine/                  # Core sync logic
│       ├── src/
│       │   ├── index.ts
│       │   ├── jobs/
│       │   │   ├── baseJob.ts
│       │   │   ├── fullSyncJob.ts
│       │   │   ├── incrementalSyncJob.ts
│       │   │   └── resourceSyncJob.ts
│       │   ├── processors/
│       │   │   ├── alyanteFetcher.ts
│       │   │   ├── dataTransformer.ts
│       │   │   ├── batchProcessor.ts
│       │   │   └── conflictResolver.ts
│       │   └── queues/
│       │       ├── syncQueue.ts
│       │       └── priorityQueue.ts
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml            # Development compose file
│   ├── docker-compose.prod.yml       # Production compose file
│   ├── Dockerfile.web                # Frontend Docker image
│   ├── Dockerfile.api                # Backend API Docker image
│   └── postgres/
│       └── init.sql                  # Database initialization
│
├── scripts/
│   ├── setup.ts                      # Initial setup script
│   ├── migrate.ts                    # Database migration runner
│   ├── seed.ts                       # Database seeder
│   ├── build.ts                      # Custom build script
│   └── deploy.ts                     # Deployment script
│
├── docs/
│   ├── ARCHITECTURE.md               # Architecture documentation
│   ├── API.md                        # API documentation
│   ├── DEPLOYMENT.md                 # Deployment guide
│   ├── DEVELOPMENT.md                # Development guide
│   └── TROUBLESHOOTING.md            # Troubleshooting guide
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Continuous integration
│       ├── cd.yml                    # Continuous deployment
│       └── tests.yml                 # Test workflows
│
├── package.json                      # Root package (workspace)
├── pnpm-workspace.yaml               # PNPM workspace config
├── turbo.json                        # Turborepo config
├── tsconfig.json                     # Root TypeScript config
├── .env.example                      # Environment template
├── .gitignore
└── README.md
```

---

## 3. Schema Database Dettagliato

### 3.1 Tabelle Core

```sql
-- ============================================================================
-- UTENTI E AUTENTICAZIONE
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'user',
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ============================================================================
-- WORKSPACE E ORGANIZZAZIONE
-- ============================================================================

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  config JSONB DEFAULT '{}',
  theme VARCHAR(50) DEFAULT 'light',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- ============================================================================
-- RISORSE CACHE (con versioning e indicizzazione avanzata)
-- ============================================================================

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- Campi indicizzati per ricerca rapida (estratti da data)
  indexed_data JSONB DEFAULT '{}',
  
  -- Metadata
  source VARCHAR(50) DEFAULT 'alyante',
  sync_job_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(type, resource_id, workspace_id)
);

-- Indici per performance
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_workspace ON resources(workspace_id);
CREATE INDEX idx_resources_updated ON resources(updated_at DESC);
CREATE INDEX idx_resources_indexed ON resources USING GIN(indexed_data);
CREATE INDEX idx_resources_composite ON resources(type, workspace_id, updated_at DESC);

-- ============================================================================
-- SYNC JOBS AVANZATI
-- ============================================================================

CREATE TYPE sync_status AS ENUM (
  'pending',
  'queued',
  'running',
  'pausing',
  'paused',
  'resuming',
  'completing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'full', -- full, incremental, partial
  status sync_status DEFAULT 'pending',
  
  -- Progress tracking
  progress NUMERIC(5,2) DEFAULT 0,
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  
  -- Results
  errors JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  summary JSONB DEFAULT '{}',
  
  -- Configuration
  config JSONB DEFAULT '{}',
  resources JSONB DEFAULT '[]', -- Liste risorse da sincronizzare
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_workspace ON sync_jobs(workspace_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);

-- ============================================================================
-- WORKFLOW DEFINITIONS (per drag & drop builder)
-- ============================================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Definition (JSON del grafo nodi/connessioni)
  definition JSONB NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_published BOOLEAN DEFAULT FALSE,
  
  -- Scheduling
  schedule VARCHAR(100), -- Cron expression
  timezone VARCHAR(50) DEFAULT 'Europe/Rome',
  
  -- Execution tracking
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(50),
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- QUERY SALVATE E FILTRI
-- ============================================================================

CREATE TABLE saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Query definition
  resource_type VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  columns JSONB DEFAULT '[]',
  sorting JSONB DEFAULT '[]',
  
  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_queries_workspace ON saved_queries(workspace_id);
CREATE INDEX idx_saved_queries_type ON saved_queries(resource_type);

-- ============================================================================
-- DASHBOARD E WIDGET CONFIGURAZIONI
-- ============================================================================

CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Layout configuration
  layout JSONB NOT NULL, -- Grid layout con posizioni widget
  
  -- Settings
  is_default BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  
  -- Widget config
  type VARCHAR(100) NOT NULL, -- kpi, chart, table, etc.
  title VARCHAR(255),
  config JSONB NOT NULL,
  
  -- Position in grid
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 4,
  height INTEGER DEFAULT 4,
  
  -- Order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);

-- ============================================================================
-- AUDIT LOG COMPLETO
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES users(id),
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  
  -- Values (for tracking changes)
  old_value JSONB,
  new_value JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_workspace ON audit_log(workspace_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- ============================================================================
-- NOTIFICHE
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Links
  action_url VARCHAR(500),
  action_label VARCHAR(100),
  
  -- Metadata
  data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================================================
-- EXPORT JOBS
-- ============================================================================

CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Configuration
  resource_type VARCHAR(100) NOT NULL,
  format VARCHAR(50) NOT NULL, -- json, csv, excel, xml
  filters JSONB DEFAULT '{}',
  columns JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  progress NUMERIC(5,2) DEFAULT 0,
  
  -- Output
  file_path VARCHAR(500),
  file_size INTEGER,
  download_expires_at TIMESTAMPTZ,
  
  -- Errors
  errors JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
```

### 3.2 Viste Materializzate (per Performance)

```sql
-- Vista per statistiche risorse
CREATE MATERIALIZED VIEW mv_resource_stats AS
SELECT 
  r.workspace_id,
  r.type,
  COUNT(*) as total_count,
  MAX(r.updated_at) as last_updated,
  COUNT(DISTINCT r.resource_id) as unique_count
FROM resources r
GROUP BY r.workspace_id, r.type;

CREATE UNIQUE INDEX idx_mv_resource_stats ON mv_resource_stats(workspace_id, type);

-- Vista per statistiche sync
CREATE MATERIALIZED VIEW mv_sync_stats AS
SELECT 
  workspace_id,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  MAX(completed_at) as last_sync_at
FROM sync_jobs
GROUP BY workspace_id;

CREATE UNIQUE INDEX idx_mv_sync_stats ON mv_sync_stats(workspace_id);

-- Refresh programmato (ogni 5 minuti)
-- CREATE OR REPLACE FUNCTION refresh_materialized_views()
-- RETURNS void AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resource_stats;
--   REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sync_stats;
-- END;
-- $$ LANGUAGE plpgsql;
```

---

## 4. Funzionalità Innovative Dettagliate

### 4.1 Drag & Drop Workflow Builder

**Descrizione:** Un canvas interattivo per creare flussi di lavoro visivi trascinando nodi e creando connessioni.

**Tipi di Nodi:**

| Tipo Nodo | Icona | Input | Output | Descrizione |
|-----------|-------|-------|--------|-------------|
| Source | 📥 | 0 | 1 | Punto di ingresso dati (API, DB, File) |
| Transform | ⚙️ | 1 | 1 | Trasformazione/mappatura dati |
| Filter | 🔍 | 1 | 1 | Filtraggio condizioni |
| Merge | 🔀 | 2+ | 1 | Unione flussi multipli |
| Split | 🔗 | 1 | 2+ | Divisione flusso |
| Aggregator | 📊 | 1 | 1 | Aggregazione/statistiche |
| Output | 📤 | 1 | 0 | Destinazione finale (DB, File, API) |

**Esempio Workflow JSON:**
```json
{
  "id": "workflow-123",
  "name": "Sync Clienti con Filtro",
  "nodes": [
    {
      "id": "node-1",
      "type": "source",
      "position": { "x": 100, "y": 200 },
      "data": {
        "label": "Alyante API - Clienti",
        "resourceType": "clienti",
        "config": {
          "endpoint": "/ClienteFornitoreMG",
          "filters": { "tipo": "cliente" }
        }
      }
    },
    {
      "id": "node-2",
      "type": "filter",
      "position": { "x": 400, "y": 200 },
      "data": {
        "label": "Filtra Attivi",
        "config": {
          "conditions": [
            { "field": "flgAttivo", "operator": "equals", "value": true }
          ]
        }
      }
    },
    {
      "id": "node-3",
      "type": "output",
      "position": { "x": 700, "y": 200 },
      "data": {
        "label": "Salva in Cache",
        "config": {
          "destination": "cache_clienti",
          "mode": "upsert",
          "keyField": "cliFor"
        }
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2" },
    { "id": "edge-2", "source": "node-2", "target": "node-3" }
  ]
}
```

### 4.2 Dashboard Builder con Widget Drag & Drop

**Grid System:** Layout a griglia 12 colonne con ridimensionamento widget.

**Tipi Widget Disponibili:**

| Widget | Descrizione | Config Options |
|--------|-------------|----------------|
| KPI Card | Mostra singolo valore con trend | metric, comparison, format |
| Sync Status | Stato sincronizzazione in tempo reale | jobId, showProgress |
| Resource Count | Conteggio risorse per tipo | resourceTypes |
| Activity Feed | Ultime attività | limit, filters |
| Line Chart | Andamento temporale | metric, timeRange, groupBy |
| Bar Chart | Confronto categorie | metric, categoryField |
| Pie Chart | Distribuzione percentuali | metric, segmentField |
| Data Table | Tabella dati con sorting | resourceType, columns, filters |
| Quick Actions | Pulsanti azioni rapide | actions |

### 4.3 Advanced Search con Fuzzy Matching

**Feature:**
- Ricerca full-text su tutti i campi indicizzati
- Fuzzy matching con algoritmo Levenshtein
- Autocomplete con suggerimenti
- Filtri combinati salvabili come query
- Ricerca faccettata (facet search)

**Esempio Query Avanzata:**
```typescript
const searchParams = {
  resourceType: 'clienti',
  query: 'rossi milano',
  filters: {
    flgAttivo: true,
    provincia: 'MI'
  },
  fuzzy: {
    enabled: true,
    threshold: 0.8
  },
  facets: ['provincia', 'tipoCf'],
  sortBy: 'ragioneSociale',
  sortOrder: 'ASC',
  page: 1,
  pageSize: 50
};
```

### 4.4 Real-time Sync con WebSocket

**Eventi WebSocket:**

```typescript
// Client → Server
{
  type: 'subscribe',
  payload: {
    channels: ['sync:progress', 'notifications']
  }
}

// Server → Client
{
  type: 'sync:progress',
  payload: {
    jobId: 'job-123',
    status: 'running',
    progress: 45.5,
    currentResource: 'cache_articoli',
    processedItems: 1500,
    totalItems: 3300,
    estimatedCompletion: '2026-03-28T18:30:00Z'
  }
}
```

### 4.5 Export Multi-Formato

**Formati Supportati:**

| Formato | Estensione | Use Case |
|---------|------------|----------|
| JSON | .json | Scambio dati, backup |
| CSV | .csv | Excel, import in altri sistemi |
| Excel | .xlsx | Report, analisi |
| XML | .xml | Integrazione legacy |
| PDF | .pdf | Report stampabili |

**Configurazione Export:**
```typescript
const exportConfig = {
  resourceType: 'clienti',
  format: 'excel',
  columns: ['cliFor', 'ragioneSociale', 'partitaIva', 'sede'],
  filters: { flgAttivo: true },
  sorting: { field: 'ragioneSociale', order: 'ASC' },
  options: {
    includeHeaders: true,
    sheetName: 'Clienti',
    dateFormat: 'DD/MM/YYYY'
  }
};
```

---

## 5. Piano di Sviluppo Fase per Fase

### Timeline Complessiva: 18 Settimane (~4-5 mesi)

```
Settimana  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
           │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │
Fase 1     ██████
Fase 2          ██████
Fase 3               ██████
Fase 4                    ██████
Fase 5                         ██████████
Fase 6                                   ██████
Fase 7                                        ██████████
Fase 8                                                     ██████
```

### Fase 1: Fondamenta (Settimane 1-2)

**Obiettivo:** Setup infrastruttura base e ambiente development.

**Task:**
```
□ Setup monorepo con PNPM workspace
□ Configurazione Turborepo per build caching
□ Docker Compose per development (PostgreSQL, Redis)
□ Schema database PostgreSQL con Drizzle ORM
□ Script migrazione database
□ Auth base con JWT e sessioni
□ Logger Pino configurato
□ ESLint + Prettier + Husky
□ TypeScript config condiviso
```

**Deliverable:**
- Monorepo funzionante
- Database schema applicato
- Auth base operativa
- Docker development attivo

### Fase 2: Core API (Settimane 3-4)

**Obiettivo:** Implementare API backend e integrazione Alyante.

**Task:**
```
□ Hono API server setup
□ Alyante API connector con retry logic
□ Sync engine base (full/incremental)
□ Cache layer Redis
□ Queue system BullMQ
□ WebSocket gateway
□ Health check endpoints
□ Rate limiting middleware
□ Error handling globale
```

**Deliverable:**
- API REST funzionanti
- Integrazione Alyante operativa
- Sync jobs processabili
- WebSocket per real-time

### Fase 3: Frontend Base (Settimane 5-6)

**Obiettivo:** Setup frontend e componenti base.

**Task:**
```
□ Next.js 15 App Router setup
□ Shadcn/ui installation e customizzazione
□ Zustand store configuration
□ TanStack Query setup
□ Layout principale (sidebar, header)
□ Navigation system
□ Theme system (dark/light)
□ Authentication UI (login/logout)
```

**Deliverable:**
- Frontend navigabile
- UI components base
- Auth flow completo
- Theme switching

### Fase 4: Explorer 2.0 (Settimane 7-8)

**Obiettivo:** Implementare explorer avanzato.

**Task:**
```
□ Tree component con virtual scrolling
□ Lazy loading nodi
□ Ricerca fuzzy integrata
□ Context menu per nodi
□ Multi-select con shift/ctrl
□ Bookmark/preferiti system
□ Cronologia navigazione
□ Drag & drop riordino nodi
□ Keyboard shortcuts
```

**Deliverable:**
- Explorer fully functional
- Performance ottimizzate
- UX avanzata

### Fase 5: Drag & Drop Canvas (Settimane 9-11)

**Obiettivo:** Implementare workflow builder.

**Task:**
```
□ dnd-kit integration
□ Canvas component con zoom/pan
□ Node palette laterale
□ CanvasNode component base
□ Connection lines (react-flow style)
□ Property panel per nodi
□ Save/load workflow
□ Validation grafo
□ Execute workflow
□ Node types: Source, Filter, Transform, Output
```

**Deliverable:**
- Workflow builder operativo
- 4+ tipi di nodi funzionanti
- Save/execute workflow

### Fase 6: Dashboard Analytics (Settimane 12-13)

**Obiettivo:** Implementare dashboard con widget.

**Task:**
```
□ Grid layout system (react-grid-layout)
□ Widget drag & drop
□ KPI Card component
□ Sync Status widget
□ Chart components (Recharts)
□ Data Table widget
□ Widget settings panel
□ Save/load dashboard layout
□ Real-time updates via WebSocket
```

**Deliverable:**
- Dashboard builder
- 5+ widget types
- Real-time updates

### Fase 7: Advanced Features (Settimane 14-16)

**Obiettivo:** Funzionalità avanzate.

**Task:**
```
□ Export multi-formato (JSON/CSV/Excel/XML)
□ Query builder visuale
□ Template system
□ Schedule jobs (cron)
□ Notification system
□ Audit log viewer
□ User preferences avanzate
□ Workspace multipli
□ Search history
```

**Deliverable:**
- Export funzionante
- Schedule jobs
- Notification system

### Fase 8: Polish & Testing (Settimane 17-18)

**Obiettivo:** Testing e ottimizzazione.

**Task:**
```
□ Unit tests (Vitest) - 80% coverage
□ Integration tests
□ E2E tests (Playwright)
□ Performance optimization
□ Accessibility audit (WCAG 2.1)
□ Security review
□ Documentation completa
□ Deployment guide
```

**Deliverable:**
- Test suite completa
- Documentazione
- Pronto per produzione

---

## 6. Componenti UI Chiave

### 6.1 Workflow Canvas Component

```typescript
// apps/web/components/canvas/WorkflowCanvas.tsx
'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { CanvasNode } from './CanvasNode';
import { NodePalette } from './NodePalette';
import { PropertyPanel } from './PropertyPanel';
import { ConnectionLine } from './ConnectionLine';
import { useWorkflowStore } from '@/lib/store/useWorkflowStore';

export function WorkflowCanvas({ workflowId }: { workflowId: string }) {
  const { nodes, edges, selectedNode, addNode, updateNode, deleteNode, addEdge } = 
    useWorkflowStore();
  
  const handleDragEnd = (event: DragEndEvent) => {
    // Handle node drop on canvas
  };
  
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-full">
        <NodePalette />
        <div className="flex-1 relative overflow-hidden">
          <svg className="absolute inset-0 pointer-events-none">
            {edges.map(edge => (
              <ConnectionLine key={edge.id} edge={edge} />
            ))}
          </svg>
          {nodes.map(node => (
            <CanvasNode
              key={node.id}
              node={node}
              isSelected={selectedNode?.id === node.id}
              onSelect={() => selectNode(node)}
              onDelete={() => deleteNode(node.id)}
            />
          ))}
        </div>
        {selectedNode && <PropertyPanel node={selectedNode} />}
      </div>
    </DndContext>
  );
}
```

### 6.2 Explorer Tree Component

```typescript
// apps/web/components/explorer/ExplorerTree.tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useExplorerStore } from '@/lib/store/useExplorerStore';
import { TreeNode } from './TreeNode';

export function ExplorerTree() {
  const { expandedNodes, nodes, toggleNode } = useExplorerStore();
  
  const virtualizer = useVirtualizer({
    count: nodes.length,
    getScrollElement: () => document.getElementById('explorer-scroll'),
    estimateSize: () => 40,
    overscan: 5
  });
  
  return (
    <div id="explorer-scroll" className="h-full overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <TreeNode
            key={nodes[virtualRow.index].id}
            node={nodes[virtualRow.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 7. API Design

### 7.1 REST API Endpoints

```typescript
// Resources
GET    /api/v2/resources/:type           // List resources
POST   /api/v2/resources/:type/search    // Search with filters
GET    /api/v2/resources/:type/:id       // Get single resource
POST   /api/v2/resources/bulk            // Bulk operations

// Sync
POST   /api/v2/sync/jobs                 // Start sync job
GET    /api/v2/sync/jobs                 // List sync jobs
GET    /api/v2/sync/jobs/:id             // Get job status
POST   /api/v2/sync/jobs/:id/cancel      // Cancel job
GET    /api/v2/sync/history              // Sync history

// Workflows
GET    /api/v2/workflows                 // List workflows
POST   /api/v2/workflows                 // Create workflow
GET    /api/v2/workflows/:id             // Get workflow
PUT    /api/v2/workflows/:id             // Update workflow
DELETE /api/v2/workflows/:id             // Delete workflow
POST   /api/v2/workflows/:id/execute     // Execute workflow

// Export
POST   /api/v2/export                    // Start export job
GET    /api/v2/export/:id                // Get export status
GET    /api/v2/export/:id/download       // Download export file

// Dashboard
GET    /api/v2/dashboards                // List dashboards
POST   /api/v2/dashboards                // Create dashboard
PUT    /api/v2/dashboards/:id            // Update dashboard
DELETE /api/v2/dashboards/:id            // Delete dashboard

// Analytics
GET    /api/v2/analytics/summary         // Dashboard summary
GET    /api/v2/analytics/sync-stats      // Sync statistics
GET    /api/v2/analytics/resource-stats  // Resource statistics
```

### 7.2 GraphQL Schema

```graphql
type Query {
  # Resources
  resources(type: ResourceType!, filters: JSON, pagination: PaginationInput): ResourceConnection!
  resource(type: ResourceType!, id: String!): Resource
  
  # Sync
  syncJobs(status: SyncStatus, limit: Int): [SyncJob!]!
  syncJob(id: ID!): SyncJob
  syncHistory(limit: Int): [SyncJob!]!
  
  # Workflows
  workflows(active: Boolean): [Workflow!]!
  workflow(id: ID!): Workflow
  
  # Analytics
  analytics: Analytics!
}

type Mutation {
  # Sync
  startSync(input: SyncInput!): SyncJob!
  cancelSync(id: ID!): SyncJob!
  
  # Workflows
  createWorkflow(input: WorkflowInput!): Workflow!
  updateWorkflow(id: ID!, input: WorkflowInput!): Workflow!
  deleteWorkflow(id: ID!): Boolean!
  executeWorkflow(id: ID!): WorkflowExecution!
  
  # Export
  createExport(input: ExportInput!): ExportJob!
  
  # Dashboard
  saveDashboard(input: DashboardInput!): Dashboard!
}

type Subscription {
  syncProgress(jobId: ID!): SyncProgress!
  notifications: Notification!
}
```

---

## 8. Stima Risorse e Costi

### 8.1 Risorse Umane

| Ruolo | Settimane | Ore Totali |
|-------|-----------|------------|
| Senior Full Stack Dev | 18 | 720h |
| UI/UX Designer | 4 | 160h |
| QA Engineer | 4 | 160h |
| DevOps Engineer | 2 | 80h |
| **Totale** | **28 settimane** | **1120 ore** |

### 8.2 Infrastruttura (Mensile)

| Servizio | Costo Stimato |
|----------|---------------|
| Server (4 vCPU, 8GB RAM) | €50-100/mese |
| PostgreSQL managed | €30-60/mese |
| Redis managed | €15-30/mese |
| Storage (100GB) | €10-20/mese |
| **Totale** | **€105-210/mese** |

---

## 9. Metriche di Successo

### 9.1 Performance Target

| Metrica | Target | Misurazione |
|---------|--------|-------------|
| Page Load Time | < 2s | Lighthouse |
| API Response Time | < 100ms (p95) | Monitoring |
| Sync Throughput | > 1000 record/sec | Sync logs |
| WebSocket Latency | < 50ms | Custom metrics |
| Lighthouse Score | > 90 | Lighthouse CI |

### 9.2 Quality Target

| Metrica | Target |
|---------|--------|
| Test Coverage | > 80% |
| E2E Test Pass Rate | > 95% |
| Accessibility (WCAG) | AA compliant |
| Security Vulnerabilities | 0 critical |

---

## 10. Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Cambiamenti API Alyante | Medio | Alto | Adapter layer, test contrattuali |
| Performance PostgreSQL su grandi volumi | Basso | Medio | Indicizzazione, partizionamento, query optimization |
| Complessità drag & drop | Medio | Medio | Librerie mature (dnd-kit), prototipazione |
| Scope creep | Alto | Alto | Roadmap definita, change management |
| Dipendenze esterne | Medio | Basso | Lock versions, audit regolari |

---

## 11. Conclusioni e Raccomandazioni

### 11.1 Vantaggi Rispetto all'Esistente

| Aspetto | TS-API Attuale | TS-API Nexus |
|---------|----------------|--------------|
| UI/UX | Base, funzionale | Moderna, animata, drag & drop |
| Performance | Buone | Eccellenti (10x target) |
| Real-time | Limitato | Completo (WebSocket) |
| Estendibilità | Media | Alta (modulare) |
| Testing | Manuale | Automatizzato (80%+) |
| Documentazione | Buona | Completa |

### 11.2 Raccomandazioni Finali

1. **Iniziare con MVP**: Implementare prima le funzionalità core (Fasi 1-4)
2. **Iterare rapidamente**: Release frequenti per feedback
3. **Testare presto**: Setup test suite dalla Fase 1
4. **Documentare durante**: Non lasciare documentazione per ultima
5. **Monitorare sempre**: Implementare monitoring dalla Fase 2

---

**Documento approvato da:** _Da definire_  
**Data approvazione:** _Da definire_  
**Prossima revisione:** Dopo Fase 4 (Settimana 8)

---

## Appendice A - Glossario

| Termine | Definizione |
|---------|-------------|
| **Nexus** | Nome in codice per TS-API Next Generation |
| **dnd-kit** | Libreria React per drag & drop accessibile |
| **Shadcn/ui** | Collection di componenti UI riutilizzabili |
| **Drizzle ORM** | ORM TypeScript type-safe |
| **BullMQ** | Libreria queue per Node.js basata su Redis |
| **TanStack Query** | Libreria per data fetching e caching |
| **Virtual scrolling** | Tecnica per renderizzare liste lunghe efficientemente |
| **WebSocket** | Protocollo comunicazione bidirezionale real-time |

## Appendice B - Riferimenti

- Next.js Documentation: https://nextjs.org/docs
- dnd-kit Documentation: https://docs.dndkit.com
- Shadcn/ui: https://ui.shadcn.com
- Drizzle ORM: https://orm.drizzle.team
- TanStack Query: https://tanstack.com/query
- BullMQ: https://docs.bullmq.io