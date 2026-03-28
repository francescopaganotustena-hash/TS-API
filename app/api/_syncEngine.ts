import {
  type SyncJob,
  type SyncJobConfig,
  type SyncResource,
  SYNC_RESOURCES,
  getResourceLabel,
} from "./_syncTypes";
import { fetchGestionaleData, type ResourceType } from "../../lib/api";
import {
  getSyncJob,
  patchSyncJob,
  readAllLocalData,
  saveSyncJob,
  updateSyncMeta,
  writeLocalResource,
} from "./_syncStore";

type SearchItem = {
  propertyName: string;
  value: string;
  comparer: number;
  operator: number;
};

const ENTITY_MAP: Record<SyncResource, string> = {
  clienti: "cliente",
  fornitori: "fornitore",
  articoli: "Articolo",
  ordini: "Documento",
  righeOrdine: "RigaDocumento",
};

const DEFAULT_TIMEOUT_MS = 300_000;
interface GestionaleHeadersOptions {
  authScope: string;
  username?: string;
  password?: string;
}

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
}

function getGestionaleHeaders(options: GestionaleHeadersOptions): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Authorization-Scope": options.authScope,
  };

  if (options.username && options.password) {
    const credentials = Buffer.from(`${options.username}:${options.password}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  }

  return headers;
}

function buildSearchItems(filters: Record<string, string>): SearchItem[] {
  return Object.entries(filters)
    .map(([key, value]) => ({ propertyName: key, value: value.trim(), comparer: 20, operator: 1 }))
    .filter((item) => item.value.length > 0);
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Timeout gestionale")), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGestionalePage(params: {
  baseUrl: string;
  entityName: string;
  ambiente: string;
  utente: string;
  azienda: string;
  pageNumber: number;
  pageSize: number;
  filters: Record<string, string>;
  authScope: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
}): Promise<Record<string, unknown>[]> {
  const resourceByEntity: Partial<Record<string, ResourceType>> = {
    cliente: "clienti",
    fornitore: "fornitori",
    Articolo: "articoli",
    Documento: "ordini",
    RigaDocumento: "righeOrdine",
  };
  const mappedResource = resourceByEntity[params.entityName];
  if (mappedResource) {
    const response = await fetchGestionaleData({
      ambiente: params.ambiente,
      utente: params.utente,
      azienda: params.azienda,
      resourceType: mappedResource,
      filters: params.filters,
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      extendedMode: true,
    });
    return response.data;
  }

  const url = new URL(`${params.baseUrl}/v1/${encodeURIComponent(params.ambiente)}/${params.entityName}`);
  url.searchParams.set("_op", "search");
  url.searchParams.set("utente", params.utente);
  url.searchParams.set("azienda", params.azienda);

  const response = await fetchJsonWithTimeout(
    url.toString(),
    {
      method: "POST",
      headers: getGestionaleHeaders({
        authScope: params.authScope,
        username: params.username,
        password: params.password,
      }),
      body: JSON.stringify({
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        items: buildSearchItems(params.filters),
      }),
    },
    params.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Errore dal gestionale: ${response.status} - ${errorText}`);
  }

  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.value)) return obj.value as Record<string, unknown>[];
  }
  return [];
}

async function fetchAllPages(params: {
  baseUrl: string;
  entityName: string;
  ambiente: string;
  utente: string;
  azienda: string;
  pageSize: number;
  filters: Record<string, string>;
  maxPages: number;
  authScope: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
  onProgress?: (pageNumber: number, rowsFetched: number) => Promise<void> | void;
}): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let reachedPageLimitWithPotentialMoreData = false;

  for (let pageNumber = 0; pageNumber < params.maxPages; pageNumber += 1) {
    const pageRows = await fetchGestionalePage({
      baseUrl: params.baseUrl,
      entityName: params.entityName,
      ambiente: params.ambiente,
      utente: params.utente,
      azienda: params.azienda,
      pageNumber,
      pageSize: params.pageSize,
      filters: params.filters,
      authScope: params.authScope,
      username: params.username,
      password: params.password,
      timeoutMs: params.timeoutMs,
    });

    rows.push(...pageRows);
    await params.onProgress?.(pageNumber, rows.length);

    if (pageRows.length < params.pageSize) {
      break;
    }

    if (pageNumber === params.maxPages - 1) {
      reachedPageLimitWithPotentialMoreData = true;
    }
  }

  if (reachedPageLimitWithPotentialMoreData) {
    throw new Error(
      `Limite pagine raggiunto (${params.maxPages}) per ${params.entityName}: possibile troncamento dati. Aumentare maxPages e rilanciare la sincronizzazione.`
    );
  }

  return rows;
}

function getProgressByPhase(phaseIndex: number, phaseCount: number, phaseFraction: number): number {
  const base = phaseIndex / phaseCount;
  const width = 1 / phaseCount;
  return Math.max(0, Math.min(99, Math.round((base + phaseFraction * width) * 100)));
}

async function updateJobProgress(jobId: string, patch: Partial<SyncJob>): Promise<void> {
  await patchSyncJob(jobId, patch);
}

async function syncResourcePhase(params: {
  jobId: string;
  phaseIndex: number;
  phaseCount: number;
  resource: SyncResource;
  config: SyncJobConfig;
  baseUrl: string;
  authScope: string;
  username?: string;
  password?: string;
}): Promise<{ count: number }> {
  const { resource } = params;
  const entityName = ENTITY_MAP[resource];
  const filters: Record<string, string> = {};

  await updateJobProgress(params.jobId, {
    phase: resource,
    progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, 0),
    message: `Sincronizzazione ${getResourceLabel(resource)}...`,
  });

  const rows = await fetchAllPages({
    baseUrl: params.baseUrl,
    entityName,
    ambiente: params.config.ambiente,
    utente: params.config.utente,
    azienda: params.config.azienda,
    pageSize: params.config.pageSize,
    filters,
    maxPages: params.config.maxPages,
    authScope: params.authScope,
    username: params.username,
    password: params.password,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    onProgress: async (pageNumber, totalRows) => {
      const phaseFraction = Math.min(0.9, (pageNumber + 1) / Math.max(1, params.config.maxPages));
      await updateJobProgress(params.jobId, {
        progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, phaseFraction),
        processed: totalRows,
        message: `Sincronizzazione ${getResourceLabel(resource)} pagina ${pageNumber + 1}`,
      });
    },
  });

  const snapshot = await writeLocalResource(resource, rows);

  await updateJobProgress(params.jobId, {
    processed: snapshot.count,
    inserted: snapshot.count,
    updated: 0,
    progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, 1),
    message: `${getResourceLabel(resource)} sincronizzati: ${snapshot.count}`,
  });

  return { count: snapshot.count };
}

export async function startSyncJob(config: SyncJobConfig): Promise<SyncJob> {
  const baseUrl = process.env.GESTIONALE_API_URL;
  if (!baseUrl) {
    throw new Error("GESTIONALE_API_URL non configurato");
  }

  const job: SyncJob = {
    id: `sync_${Date.now()}`,
    status: "queued",
    phase: "idle",
    progressPct: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    message: "Job creato",
  };

  await saveSyncJob(job);

  void runSyncJob(job.id, config, baseUrl).catch(async (error) => {
    await patchSyncJob(job.id, {
      status: "failed",
      phase: "idle",
      endedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Errore sconosciuto",
      errors: 1,
      progressPct: 100,
    });
    await updateSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastJobId: job.id,
      lastStatus: "failed",
      message: error instanceof Error ? error.message : "Errore sconosciuto",
    });
  });

  return job;
}

async function runSyncJob(jobId: string, config: SyncJobConfig, baseUrl: string): Promise<void> {
  const authScope = process.env.GESTIONALE_AUTH_SCOPE || "1";
  const username = process.env.GESTIONALE_USERNAME;
  const password = process.env.GESTIONALE_PASSWORD;
  const phaseCount = SYNC_RESOURCES.length;
  let totalProcessed = 0;
  let totalInserted = 0;
  const totalUpdated = 0;

  await patchSyncJob(jobId, {
    status: "running",
    phase: "idle",
    message: "Sincronizzazione avviata",
    progressPct: 1,
  });

  try {
    for (let index = 0; index < SYNC_RESOURCES.length; index += 1) {
      const resource = SYNC_RESOURCES[index];
      const { count } = await syncResourcePhase({
        jobId,
        phaseIndex: index,
        phaseCount,
        resource,
        config,
        baseUrl: normalizeBaseUrl(baseUrl),
        authScope,
        username,
        password,
      });

      totalProcessed += count;
      totalInserted += count;
      await patchSyncJob(jobId, {
        processed: totalProcessed,
        inserted: totalInserted,
        updated: totalUpdated,
      });
    }

    const finishedAt = new Date().toISOString();
    await patchSyncJob(jobId, {
      status: "success",
      phase: "idle",
      progressPct: 100,
      endedAt: finishedAt,
      message: "Sincronizzazione completata con successo",
    });

    const localData = await readAllLocalData();
    const meta = await updateSyncMeta({
      lastSyncAt: finishedAt,
      lastSuccessAt: finishedAt,
      lastJobId: jobId,
      lastStatus: "success",
      message: "Sincronizzazione completata con successo",
    });

    for (const resource of SYNC_RESOURCES) {
      meta.resources[resource] = {
        updatedAt: localData.resources[resource]?.updatedAt ?? null,
        count: localData.resources[resource]?.count ?? 0,
      };
    }

    await updateSyncMeta(meta);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    await patchSyncJob(jobId, {
      status: "failed",
      phase: "idle",
      progressPct: 100,
      endedAt: new Date().toISOString(),
      message,
      errors: 1,
    });
    await updateSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastJobId: jobId,
      lastStatus: "failed",
      message,
    });
    throw error;
  }
}

export async function getSyncStatus(jobId: string): Promise<SyncJob | null> {
  return getSyncJob(jobId);
}
