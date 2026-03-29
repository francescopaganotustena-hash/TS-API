export type SyncResource = "clienti" | "fornitori" | "articoli" | "ordini" | "righeOrdine";
export type SyncMode = "full" | "incremental";
export type SyncScopeType = "full" | "resource";
export type SyncTrigger = "manual" | "read-through";

export interface SyncScope {
  type: SyncScopeType;
  resource?: SyncResource;
  trigger?: SyncTrigger;
}

export type SyncJobStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export type SyncJobPhase = SyncResource | "idle";

export interface SyncJob {
  id: string;
  status: SyncJobStatus;
  phase: SyncJobPhase;
  progressPct: number;
  processed: number;
  inserted: number;
  updated: number;
  errors: number;
  startedAt: string;
  updatedAt?: string;
  endedAt?: string;
  message?: string;
}

export interface SyncJobConfig {
  ambiente: string;
  utente: string;
  azienda: string;
  pageSize: number;
  maxPages: number;
  syncMode: SyncMode;
  overlapHours?: number;
  scope?: SyncScope;
}

export interface LocalResourceSnapshot {
  resource: SyncResource;
  updatedAt: string | null;
  count: number;
  rows: Record<string, unknown>[];
}

export interface LocalDataFile {
  updatedAt: string | null;
  resources: Record<SyncResource, LocalResourceSnapshot>;
}

export interface SyncMeta {
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastJobId: string | null;
  lastStatus: SyncJobStatus | null;
  message: string | null;
  resources: Record<SyncResource, { updatedAt: string | null; count: number }>;
}

export const SYNC_RESOURCES: SyncResource[] = ["clienti", "fornitori", "articoli", "ordini", "righeOrdine"];

export function isSyncResource(value: string): value is SyncResource {
  return SYNC_RESOURCES.includes(value as SyncResource);
}

export function getResourceLabel(resource: SyncResource): string {
  switch (resource) {
    case "clienti":
      return "Clienti";
    case "fornitori":
      return "Fornitori";
    case "articoli":
      return "Articoli";
    case "ordini":
      return "Ordini";
    case "righeOrdine":
      return "Righe ordine";
  }
}

export function isResourceSyncScope(scope?: SyncScope): scope is SyncScope & { type: "resource"; resource: SyncResource } {
  return !!scope && scope.type === "resource" && !!scope.resource;
}
