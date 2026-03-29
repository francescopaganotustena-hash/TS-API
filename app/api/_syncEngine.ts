import {
  type SyncJob,
  type SyncJobConfig,
  type SyncMode,
  type SyncScope,
  type SyncResource,
  SYNC_RESOURCES,
  getResourceLabel,
  isResourceSyncScope,
} from "./_syncTypes";
import { fetchGestionaleData, type ResourceType } from "../../lib/api";
import {
  getLastSyncInfo,
  getSyncJob,
  patchSyncJob,
  readAllLocalData,
  readLocalData,
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

const INCREMENTAL_FILTER_FIELDS: Record<SyncResource, string> = {
  clienti: "dtultagganag",
  fornitori: "dtultagganag",
  articoli: "dtultagganag",
  ordini: "datadoc",
  righeOrdine: "datadoc",
};

const RESOURCE_TTL_MINUTES: Record<SyncResource, number> = {
  clienti: 24 * 60,
  fornitori: 24 * 60,
  articoli: 6 * 60,
  ordini: 15,
  righeOrdine: 15,
};

const RESOURCE_SCOPE_JOB_PREFIX = "sync_resource";

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_INCREMENTAL_OVERLAP_HOURS = 24;
const cancellationRequests = new Set<string>();
interface GestionaleHeadersOptions {
  authScope: string;
  username?: string;
  password?: string;
}

class SyncCancellationError extends Error {
  constructor(message = "Sincronizzazione annullata") {
    super(message);
    this.name = "SyncCancellationError";
  }
}

function requestCancellation(jobId: string): void {
  cancellationRequests.add(jobId);
}

function clearCancellation(jobId: string): void {
  cancellationRequests.delete(jobId);
}

function isCancellationRequested(jobId: string): boolean {
  return cancellationRequests.has(jobId);
}

function throwIfCancelled(jobId: string): void {
  if (isCancellationRequested(jobId)) {
    throw new SyncCancellationError("Sincronizzazione annullata su richiesta utente");
  }
}

function isIncrementalEnabled(): boolean {
  const value = process.env.SYNC_INCREMENTAL_ENABLED?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function getResourceTtlMinutes(resource: SyncResource): number {
  return RESOURCE_TTL_MINUTES[resource];
}

export function buildResourceScopedJobId(resource: SyncResource): string {
  return `${RESOURCE_SCOPE_JOB_PREFIX}_${resource}_${Date.now()}`;
}

export function isResourceScopedJobId(jobId: string): boolean {
  return jobId.startsWith(`${RESOURCE_SCOPE_JOB_PREFIX}_`);
}

export function isJobForResourceScope(job: SyncJob, resource: SyncResource): boolean {
  return isResourceScopedJobId(job.id) && job.phase === resource;
}

function resolveSyncScope(config: SyncJobConfig): SyncScope {
  const scope = config.scope ?? { type: "full" };
  if (isResourceSyncScope(scope)) {
    return scope;
  }
  return { type: "full" };
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

function buildSearchItems(filters: Record<string, string>, comparer = 20): SearchItem[] {
  return Object.entries(filters)
    .map(([key, value]) => ({ propertyName: key, value: value.trim(), comparer, operator: 1 }))
    .filter((item) => item.value.length > 0);
}

function buildSearchItem(propertyName: string, value: string, comparer: number): SearchItem {
  return { propertyName, value: value.trim(), comparer, operator: 1 };
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
  items?: SearchItem[];
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
  if (mappedResource && (!params.items || params.items.length === 0)) {
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
        items: params.items ?? buildSearchItems(params.filters),
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
  items?: SearchItem[];
  maxPages: number;
  authScope: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
  onProgress?: (pageNumber: number, rowsFetched: number) => Promise<void> | void;
  shouldCancel?: () => boolean;
}): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let reachedPageLimitWithPotentialMoreData = false;

  for (let pageNumber = 0; pageNumber < params.maxPages; pageNumber += 1) {
    if (params.shouldCancel?.()) {
      throw new SyncCancellationError("Sincronizzazione annullata su richiesta utente");
    }

    const pageRows = await fetchGestionalePage({
      baseUrl: params.baseUrl,
      entityName: params.entityName,
      ambiente: params.ambiente,
      utente: params.utente,
      azienda: params.azienda,
      pageNumber,
      pageSize: params.pageSize,
      filters: params.filters,
      items: params.items,
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

function getIncrementalThresholdIso(lastSuccessAt: string, overlapHours: number): string | null {
  const parsed = Date.parse(lastSuccessAt);
  if (!Number.isFinite(parsed)) return null;
  const overlapMs = Math.max(1, overlapHours) * 60 * 60 * 1000;
  return new Date(parsed - overlapMs).toISOString();
}

function buildIncrementalSearchItems(resource: SyncResource, thresholdIso: string): SearchItem[] {
  const propertyName = INCREMENTAL_FILTER_FIELDS[resource];
  return [buildSearchItem(propertyName, thresholdIso, 12)];
}

function normalizeRowValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function buildResourceKey(resource: SyncResource, row: Record<string, unknown>): string {
  const valueFor = (...keys: string[]): string => {
    for (const key of keys) {
      const value = row[key];
      const normalized = normalizeRowValue(value);
      if (normalized.length > 0) return normalized.toLowerCase();
    }
    return "";
  };

  switch (resource) {
    case "clienti":
    case "fornitori": {
      const key = valueFor("cliFor", "idCliFor", "cli_for", "id_cli_for");
      if (key) return `${resource}:${key}`;
      break;
    }
    case "articoli": {
      const key = valueFor("codiceArticoloMG", "codice_articolo", "codiceArticolo", "codartMg66");
      if (key) return `${resource}:${key}`;
      break;
    }
    case "ordini": {
      const key = valueFor("numReg", "num_reg", "numdoc");
      if (key) return `${resource}:${key}`;
      break;
    }
    case "righeOrdine": {
      const numReg = valueFor("numReg", "num_reg");
      const progrRiga = valueFor("progrRiga", "progr_riga");
      if (numReg || progrRiga) return `${resource}:${numReg}:${progrRiga}`;
      break;
    }
  }

  const guid = valueFor("guid", "id");
  if (guid) return `${resource}:${guid}`;

  return `${resource}:${JSON.stringify(row)}`;
}

function mergeIncrementalRows(
  resource: SyncResource,
  currentRows: Record<string, unknown>[],
  deltaRows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const merged = new Map<string, Record<string, unknown>>();

  currentRows.forEach((row) => {
    merged.set(buildResourceKey(resource, row), row);
  });

  for (const row of deltaRows) {
    merged.set(buildResourceKey(resource, row), row);
  }

  return Array.from(merged.values());
}

function getProgressByPhase(phaseIndex: number, phaseCount: number, phaseFraction: number): number {
  const base = phaseIndex / phaseCount;
  const width = 1 / phaseCount;
  return Math.max(0, Math.min(99, Math.round((base + phaseFraction * width) * 100)));
}

async function updateJobProgress(jobId: string, patch: Partial<SyncJob>): Promise<void> {
  await patchSyncJob(jobId, patch);
}

type SyncRunContext = {
  syncMode: SyncMode;
  baselineLastSuccessAt: string | null;
  baselineByResource?: Partial<Record<SyncResource, string | null>>;
  overlapHours: number;
};

function isValidBaseline(value: string | null | undefined): value is string {
  if (!value) return false;
  return Number.isFinite(Date.parse(value));
}

async function syncResourceFullPhase(params: {
  jobId: string;
  phaseIndex: number;
  phaseCount: number;
  resource: SyncResource;
  config: SyncJobConfig;
  baseUrl: string;
  authScope: string;
  username?: string;
  password?: string;
  modeLabel?: string;
}): Promise<{ count: number }> {
  throwIfCancelled(params.jobId);
  const { resource } = params;
  const entityName = ENTITY_MAP[resource];
  const filters: Record<string, string> = {};
  const modeLabel = params.modeLabel ?? "completa";

  await updateJobProgress(params.jobId, {
    phase: resource,
    progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, 0),
    message: `Sincronizzazione ${modeLabel} ${getResourceLabel(resource)}...`,
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
    shouldCancel: () => isCancellationRequested(params.jobId),
    onProgress: async (pageNumber, totalRows) => {
      const phaseFraction = Math.min(0.9, (pageNumber + 1) / Math.max(1, params.config.maxPages));
      await updateJobProgress(params.jobId, {
        progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, phaseFraction),
        processed: totalRows,
        message: `Sincronizzazione ${modeLabel} ${getResourceLabel(resource)} pagina ${pageNumber + 1}`,
      });
    },
  });

  throwIfCancelled(params.jobId);
  const snapshot = await writeLocalResource(resource, rows);

  await updateJobProgress(params.jobId, {
    processed: snapshot.count,
    inserted: snapshot.count,
    updated: 0,
    progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, 1),
    message: `${getResourceLabel(resource)} sincronizzati (${modeLabel}): ${snapshot.count}`,
  });

  return { count: snapshot.count };
}

async function syncResourceIncrementalPhase(params: {
  jobId: string;
  phaseIndex: number;
  phaseCount: number;
  resource: SyncResource;
  config: SyncJobConfig;
  runContext: SyncRunContext;
  baseUrl: string;
  authScope: string;
  username?: string;
  password?: string;
}): Promise<{ count: number }> {
  throwIfCancelled(params.jobId);
  const baseline =
    params.runContext.baselineByResource?.[params.resource] ?? params.runContext.baselineLastSuccessAt;
  const thresholdIso = baseline
    ? getIncrementalThresholdIso(baseline, params.runContext.overlapHours)
    : null;

  if (!thresholdIso) {
    await updateJobProgress(params.jobId, {
      message: `Incrementale non disponibile per ${getResourceLabel(params.resource)}: baseline assente, uso full`,
    });
    return syncResourceFullPhase({
      jobId: params.jobId,
      phaseIndex: params.phaseIndex,
      phaseCount: params.phaseCount,
      resource: params.resource,
      config: params.config,
      baseUrl: params.baseUrl,
      authScope: params.authScope,
      username: params.username,
      password: params.password,
      modeLabel: "full (fallback)",
    });
  }

  const entityName = ENTITY_MAP[params.resource];
  const incrementalItems = buildIncrementalSearchItems(params.resource, thresholdIso);

  await updateJobProgress(params.jobId, {
    phase: params.resource,
    progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, 0),
    message: `Sincronizzazione incrementale ${getResourceLabel(params.resource)}...`,
  });

  try {
    const deltaRows = await fetchAllPages({
      baseUrl: params.baseUrl,
      entityName,
      ambiente: params.config.ambiente,
      utente: params.config.utente,
      azienda: params.config.azienda,
      pageSize: params.config.pageSize,
      filters: {},
      items: incrementalItems,
      maxPages: params.config.maxPages,
      authScope: params.authScope,
      username: params.username,
      password: params.password,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      shouldCancel: () => isCancellationRequested(params.jobId),
      onProgress: async (pageNumber, totalRows) => {
        const phaseFraction = Math.min(0.9, (pageNumber + 1) / Math.max(1, params.config.maxPages));
        await updateJobProgress(params.jobId, {
          progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, phaseFraction),
          processed: totalRows,
          message: `Sincronizzazione incrementale ${getResourceLabel(params.resource)} pagina ${pageNumber + 1}`,
        });
      },
    });

    throwIfCancelled(params.jobId);
    const localSnapshot = await readLocalData(params.resource);
    const mergedRows = mergeIncrementalRows(params.resource, localSnapshot.rows, deltaRows);
    throwIfCancelled(params.jobId);
    const snapshot = await writeLocalResource(params.resource, mergedRows);

    await updateJobProgress(params.jobId, {
      processed: deltaRows.length,
      inserted: deltaRows.length,
      updated: 0,
      progressPct: getProgressByPhase(params.phaseIndex, params.phaseCount, 1),
      message: `${getResourceLabel(params.resource)} incrementali: ${deltaRows.length} delta, ${snapshot.count} totali`,
    });

    return { count: deltaRows.length };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Errore sconosciuto";
    await updateJobProgress(params.jobId, {
      message: `Incrementale non disponibile per ${getResourceLabel(params.resource)}: ${detail}. Uso full per la risorsa`,
    });
    return syncResourceFullPhase({
      jobId: params.jobId,
      phaseIndex: params.phaseIndex,
      phaseCount: params.phaseCount,
      resource: params.resource,
      config: params.config,
      baseUrl: params.baseUrl,
      authScope: params.authScope,
      username: params.username,
      password: params.password,
      modeLabel: "full (fallback)",
    });
  }
}

async function syncResourcePhase(params: {
  jobId: string;
  phaseIndex: number;
  phaseCount: number;
  resource: SyncResource;
  config: SyncJobConfig;
  runContext: SyncRunContext;
  baseUrl: string;
  authScope: string;
  username?: string;
  password?: string;
}): Promise<{ count: number }> {
  if (params.runContext.syncMode === "incremental") {
    return syncResourceIncrementalPhase(params);
  }

  return syncResourceFullPhase(params);
}

async function runResourceScopedSyncJob(jobId: string, config: SyncJobConfig, baseUrl: string): Promise<void> {
  const scope = resolveSyncScope(config);
  if (!isResourceSyncScope(scope)) {
    throw new Error("Scope risorsa non valido");
  }

  const authScope = process.env.GESTIONALE_AUTH_SCOPE || "1";
  const username = process.env.GESTIONALE_USERNAME;
  const password = process.env.GESTIONALE_PASSWORD;
  const resource = scope.resource;
  const phaseCount = 1;
  const syncMeta = await getLastSyncInfo();
  const requestedMode: SyncMode = config.syncMode === "incremental" && isIncrementalEnabled() ? "incremental" : "full";
  const resourceBaselineAt = syncMeta.resources[resource]?.updatedAt ?? null;
  const preferredBaseline = resourceBaselineAt ?? syncMeta.lastSuccessAt;
  const baselineLastSuccessAt = requestedMode === "incremental" && isValidBaseline(preferredBaseline) ? preferredBaseline : null;
  const runMode: SyncMode = requestedMode === "incremental" && baselineLastSuccessAt ? "incremental" : "full";
  const runContext: SyncRunContext = {
    syncMode: runMode,
    baselineLastSuccessAt,
    baselineByResource: { [resource]: baselineLastSuccessAt },
    overlapHours: config.overlapHours ?? DEFAULT_INCREMENTAL_OVERLAP_HOURS,
  };
  const startMessage =
    runMode === "incremental"
      ? `Sincronizzazione risorsa ${getResourceLabel(resource)} avviata in modalita incrementale`
      : `Sincronizzazione risorsa ${getResourceLabel(resource)} avviata in modalita full`;
  const startNote =
    requestedMode === "incremental" && !baselineLastSuccessAt
      ? " (baseline assente, eseguo full)"
      : requestedMode !== runMode
        ? " (rollback a full via flag)"
        : "";

  await patchSyncJob(jobId, {
    status: "running",
    phase: resource,
    message: `${startMessage}${startNote}`,
    progressPct: 1,
  });

  try {
    const { count } = await syncResourcePhase({
      jobId,
      phaseIndex: 0,
      phaseCount,
      resource,
      config,
      runContext,
      baseUrl: normalizeBaseUrl(baseUrl),
      authScope,
      username,
      password,
    });

    const finishedAt = new Date().toISOString();
    await patchSyncJob(jobId, {
      status: "success",
      phase: "idle",
      progressPct: 100,
      endedAt: finishedAt,
      message:
        runMode === "incremental"
          ? `Sincronizzazione incrementale di ${getResourceLabel(resource)} completata con successo`
          : `Sincronizzazione completa di ${getResourceLabel(resource)} completata con successo`,
    });

    const localData = await readLocalData(resource);
    const meta = await updateSyncMeta({
      lastSyncAt: finishedAt,
      lastJobId: jobId,
      lastStatus: "success",
      message:
        runMode === "incremental"
          ? `Sincronizzazione incrementale di ${getResourceLabel(resource)} completata con successo`
          : `Sincronizzazione completa di ${getResourceLabel(resource)} completata con successo`,
    });

    meta.resources[resource] = {
      updatedAt: localData.updatedAt,
      count: localData.count || count,
    };

    await updateSyncMeta(meta);
    clearCancellation(jobId);
  } catch (error) {
    if (error instanceof SyncCancellationError) {
      const endedAt = new Date().toISOString();
      await patchSyncJob(jobId, {
        status: "cancelled",
        phase: "idle",
        progressPct: 100,
        endedAt,
        message: error.message,
      });
      await updateSyncMeta({
        lastSyncAt: endedAt,
        lastJobId: jobId,
        lastStatus: "cancelled",
        message: error.message,
      });
      clearCancellation(jobId);
      return;
    }

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
    clearCancellation(jobId);
    return;
  }
}

export async function startScopedSyncJob(config: SyncJobConfig): Promise<SyncJob> {
  const baseUrl = process.env.GESTIONALE_API_URL;
  if (!baseUrl) {
    throw new Error("GESTIONALE_API_URL non configurato");
  }

  const scope = resolveSyncScope(config);
  const jobId = isResourceSyncScope(scope) ? buildResourceScopedJobId(scope.resource) : `sync_${Date.now()}`;
  const job: SyncJob = {
    id: jobId,
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

export async function startSyncJob(config: SyncJobConfig): Promise<SyncJob> {
  return startScopedSyncJob(config);
}

async function runSyncJob(jobId: string, config: SyncJobConfig, baseUrl: string): Promise<void> {
  const scope = resolveSyncScope(config);
  if (isResourceSyncScope(scope)) {
    await runResourceScopedSyncJob(jobId, config, baseUrl);
    return;
  }

  const authScope = process.env.GESTIONALE_AUTH_SCOPE || "1";
  const username = process.env.GESTIONALE_USERNAME;
  const password = process.env.GESTIONALE_PASSWORD;
  const phaseCount = SYNC_RESOURCES.length;
  const syncMeta = await getLastSyncInfo();
  const requestedMode: SyncMode = config.syncMode === "incremental" && isIncrementalEnabled() ? "incremental" : "full";
  const baselineByResource: Partial<Record<SyncResource, string | null>> = {};
  let incrementalEligibleResources = 0;
  for (const resource of SYNC_RESOURCES) {
    const candidate = syncMeta.resources[resource]?.updatedAt ?? syncMeta.lastSuccessAt ?? null;
    const validCandidate = isValidBaseline(candidate) ? candidate : null;
    baselineByResource[resource] = validCandidate;
    if (validCandidate) incrementalEligibleResources += 1;
  }

  const baselineLastSuccessAt = requestedMode === "incremental" && isValidBaseline(syncMeta.lastSuccessAt)
    ? syncMeta.lastSuccessAt
    : null;
  const runMode: SyncMode =
    requestedMode === "incremental" && incrementalEligibleResources > 0 ? "incremental" : "full";
  const runContext: SyncRunContext = {
    syncMode: runMode,
    baselineLastSuccessAt,
    baselineByResource,
    overlapHours: config.overlapHours ?? DEFAULT_INCREMENTAL_OVERLAP_HOURS,
  };
  let totalProcessed = 0;
  let totalInserted = 0;
  const totalUpdated = 0;
  const startMessage =
    runMode === "incremental"
      ? `Sincronizzazione avviata in modalità incrementale`
      : "Sincronizzazione avviata in modalità full";
  const startNote =
    requestedMode === "incremental" && incrementalEligibleResources === 0
      ? " (baseline assente su tutte le risorse, eseguo full)"
      : requestedMode !== runMode
        ? " (rollback a full via flag)"
        : "";

  await patchSyncJob(jobId, {
    status: "running",
    phase: "idle",
    message: `${startMessage}${startNote}`,
    progressPct: 1,
  });

  try {
    throwIfCancelled(jobId);
    for (let index = 0; index < SYNC_RESOURCES.length; index += 1) {
      throwIfCancelled(jobId);
      const resource = SYNC_RESOURCES[index];
      const { count } = await syncResourcePhase({
        jobId,
        phaseIndex: index,
        phaseCount,
        resource,
        config,
        runContext,
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
      message:
        runMode === "incremental"
          ? "Sincronizzazione incrementale completata con successo"
          : "Sincronizzazione completa completata con successo",
    });

    const localData = await readAllLocalData();
    const meta = await updateSyncMeta({
      lastSyncAt: finishedAt,
      lastSuccessAt: finishedAt,
      lastJobId: jobId,
      lastStatus: "success",
      message:
        runMode === "incremental"
          ? "Sincronizzazione incrementale completata con successo"
          : "Sincronizzazione completa completata con successo",
    });

    for (const resource of SYNC_RESOURCES) {
      meta.resources[resource] = {
        updatedAt: localData.resources[resource]?.updatedAt ?? null,
        count: localData.resources[resource]?.count ?? 0,
      };
    }

    await updateSyncMeta(meta);
    clearCancellation(jobId);
  } catch (error) {
    if (error instanceof SyncCancellationError) {
      const endedAt = new Date().toISOString();
      await patchSyncJob(jobId, {
        status: "cancelled",
        phase: "idle",
        progressPct: 100,
        endedAt,
        message: error.message,
      });
      await updateSyncMeta({
        lastSyncAt: endedAt,
        lastJobId: jobId,
        lastStatus: "cancelled",
        message: error.message,
      });
      clearCancellation(jobId);
      return;
    }

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
    clearCancellation(jobId);
    throw error;
  }
}

export async function getSyncStatus(jobId: string): Promise<SyncJob | null> {
  return getSyncJob(jobId);
}

export async function cancelSyncJob(jobId: string): Promise<SyncJob | null> {
  const current = await getSyncJob(jobId);
  if (!current) return null;

  if (current.status === "success" || current.status === "failed" || current.status === "cancelled") {
    return current;
  }

  requestCancellation(jobId);
  return patchSyncJob(jobId, {
    message: "Annullamento sincronizzazione richiesto...",
  });
}
