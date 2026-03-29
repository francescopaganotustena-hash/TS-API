import { NextRequest, NextResponse } from "next/server";
import { fetchGestionaleData, type ResourceType } from "../../../../lib/api";
import { isSyncResource, type SyncResource } from "../../_syncTypes";
import {
  listSyncJobs,
  patchSyncJob,
  queryLocalResource,
  readLocalData,
  saveSyncJob,
  writeLocalResource,
} from "../../_syncStore";

export const dynamic = "force-dynamic";

type OnDemandSyncState = "running" | "completed" | "failed";
type OnDemandJobHandle = {
  jobId: string;
};

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_CONTEXT = {
  ambiente: "1",
  utente: "TeamSa",
  azienda: "1",
};
const ON_DEMAND_ATTACH_WAIT_MS = Number(process.env.SYNC_ON_DEMAND_ATTACH_WAIT_MS ?? "3000");
const ON_DEMAND_PAGE_SIZE = Number(process.env.SYNC_ON_DEMAND_PAGE_SIZE ?? "100");
const ON_DEMAND_MAX_PAGES = Number(process.env.SYNC_ON_DEMAND_MAX_PAGES ?? "1000");
const ON_DEMAND_LOCK_TTL_MS = Number(process.env.SYNC_ON_DEMAND_LOCK_TTL_MS ?? "30000");

const RESOURCE_TTL_MS: Record<SyncResource, number> = {
  clienti: 24 * 60 * 60 * 1000,
  fornitori: 24 * 60 * 60 * 1000,
  articoli: 6 * 60 * 60 * 1000,
  ordini: 15 * 60 * 1000,
  righeOrdine: 15 * 60 * 1000,
};

const onDemandLocks = new Map<SyncResource, { jobId: string; startedAt: number }>();

function readBooleanEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function readStringParam(searchParams: URLSearchParams, key: string, fallback: string): string {
  const value = searchParams.get(key);
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function getResourceTtlMs(resource: SyncResource): number {
  return RESOURCE_TTL_MS[resource];
}

function isFresh(updatedAt: string | null, resource: SyncResource): boolean {
  if (!updatedAt) return false;
  const parsed = Date.parse(updatedAt);
  if (!Number.isFinite(parsed)) return false;
  return Date.now() - parsed <= getResourceTtlMs(resource);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readActiveResourceLock(resource: SyncResource): string | null {
  const lock = onDemandLocks.get(resource);
  if (!lock) return null;
  if (Date.now() - lock.startedAt > ON_DEMAND_LOCK_TTL_MS) {
    onDemandLocks.delete(resource);
    return null;
  }
  return lock.jobId;
}

async function findActiveJobId(resource: SyncResource): Promise<string | null> {
  const lockedJobId = readActiveResourceLock(resource);
  if (lockedJobId) return lockedJobId;

  const jobs = await listSyncJobs(10);
  const active = jobs.find((job) => (job.status === "running" || job.status === "queued") && job.phase === resource);
  return active?.id ?? null;
}

async function waitForJobSettlement(jobId: string, timeoutMs: number): Promise<"running" | "completed" | "failed" | "missing"> {
  const deadline = Date.now() + Math.max(250, timeoutMs);
  let latestStatus: "running" | "completed" | "failed" | "missing" = "running";

  while (Date.now() < deadline) {
    const jobs = await listSyncJobs(10);
    const job = jobs.find((item) => item.id === jobId);
    if (!job) {
      latestStatus = "missing";
      break;
    }

    if (job.status === "success") return "completed";
    if (job.status === "failed" || job.status === "cancelled") return "failed";

    latestStatus = "running";
    await sleep(400);
  }

  return latestStatus;
}

async function fetchAllRemoteRows(params: {
  resource: SyncResource;
  ambiente: string;
  utente: string;
  azienda: string;
  pageSize: number;
  maxPages: number;
  onProgress?: (pageNumber: number, rowsFetched: number) => Promise<void> | void;
}): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];

  for (let pageNumber = 0; pageNumber < params.maxPages; pageNumber += 1) {
    const response = await fetchGestionaleData({
      ambiente: params.ambiente,
      utente: params.utente,
      azienda: params.azienda,
      resourceType: params.resource as ResourceType,
      filters: {},
      pageNumber,
      pageSize: params.pageSize,
      extendedMode: true,
    });

    rows.push(...response.data);
    await params.onProgress?.(pageNumber, rows.length);

    if (response.data.length < params.pageSize) {
      break;
    }
  }

  return rows;
}

async function runResourceSyncJob(jobId: string, resource: SyncResource, context: { ambiente: string; utente: string; azienda: string }): Promise<void> {
  try {
    await patchSyncJob(jobId, {
      status: "running",
      phase: resource,
      progressPct: 1,
      message: `Sync on-demand ${resource} avviata`,
    });

    const rows = await fetchAllRemoteRows({
      resource,
      ambiente: context.ambiente,
      utente: context.utente,
      azienda: context.azienda,
      pageSize: ON_DEMAND_PAGE_SIZE,
      maxPages: ON_DEMAND_MAX_PAGES,
      onProgress: async (pageNumber, rowsFetched) => {
        await patchSyncJob(jobId, {
          progressPct: Math.min(90, 10 + pageNumber * 5),
          processed: rowsFetched,
          message: `Sync on-demand ${resource} pagina ${pageNumber + 1}`,
        });
      },
    });

    const snapshot = await writeLocalResource(resource, rows);

    await patchSyncJob(jobId, {
      status: "success",
      phase: "idle",
      progressPct: 100,
      processed: snapshot.count,
      inserted: snapshot.count,
      updated: 0,
      endedAt: new Date().toISOString(),
      message: `Sync on-demand ${resource} completata: ${snapshot.count}`,
    });
  } catch (error) {
    await patchSyncJob(jobId, {
      status: "failed",
      phase: "idle",
      progressPct: 100,
      endedAt: new Date().toISOString(),
      errors: 1,
      message: error instanceof Error ? error.message : `Errore on-demand ${resource}`,
    });
    throw error;
  } finally {
    for (const [lockedResource, lock] of Array.from(onDemandLocks.entries())) {
      if (lock.jobId === jobId) {
        onDemandLocks.delete(lockedResource);
      }
    }
  }
}

async function getOrStartResourceSync(resource: SyncResource, context: { ambiente: string; utente: string; azienda: string }): Promise<OnDemandJobHandle> {
  const existingJobId = await findActiveJobId(resource);
  if (existingJobId) {
    return { jobId: existingJobId };
  }

  const jobId = `ondemand_${resource}_${Date.now()}`;
  onDemandLocks.set(resource, { jobId, startedAt: Date.now() });

  const job = {
    id: jobId,
    status: "queued" as const,
    phase: resource,
    progressPct: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    message: `Sync on-demand ${resource} in coda`,
  };

  try {
    await saveSyncJob(job);
  } catch (error) {
    onDemandLocks.delete(resource);
    throw error;
  }

  void runResourceSyncJob(jobId, resource, context).catch(() => undefined);

  return { jobId };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    if (!resource || !isSyncResource(resource)) {
      return NextResponse.json({ error: "resource non valido" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const pageNumberRaw = searchParams.get("pageNumber");
    const pageSizeRaw = searchParams.get("pageSize");
    const pageNumber = pageNumberRaw ? Number(pageNumberRaw) : 0;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : DEFAULT_PAGE_SIZE;
    const normalizedPageNumber = Number.isFinite(pageNumber) ? Math.max(0, Math.floor(pageNumber)) : 0;
    const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : DEFAULT_PAGE_SIZE;

    const ambiente = readStringParam(searchParams, "ambiente", DEFAULT_CONTEXT.ambiente);
    const utente = readStringParam(searchParams, "utente", DEFAULT_CONTEXT.utente);
    const azienda = readStringParam(searchParams, "azienda", DEFAULT_CONTEXT.azienda);
    const onDemandEnabled = readBooleanEnv(process.env.SYNC_ON_DEMAND_ENABLED);

    const reservedKeys = new Set([
      "pageNumber",
      "pageSize",
      "ambiente",
      "utente",
      "azienda",
      "extendedMode",
      "onDemandSync",
      "onDemandJobId",
      "onDemandState",
    ]);
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (reservedKeys.has(key)) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      filters[key] = trimmed;
    });

    let onDemandSync: OnDemandSyncState | undefined;
    let onDemandJobId: string | undefined;

    if (onDemandEnabled) {
      const snapshot = await readLocalData(resource);
      const stale = !isFresh(snapshot.updatedAt, resource);
      if (stale) {
        const { jobId } = await getOrStartResourceSync(resource, { ambiente, utente, azienda });
        onDemandJobId = jobId;
        const settlement = await waitForJobSettlement(jobId, ON_DEMAND_ATTACH_WAIT_MS);

        if (settlement === "completed") {
          onDemandSync = "completed";
        } else if (settlement === "failed") {
          onDemandSync = "failed";
        } else {
          onDemandSync = "running";
        }
      }
    }

    const result = await queryLocalResource(resource, filters, normalizedPageNumber, normalizedPageSize);

    const responseBody: Record<string, unknown> = {
      resource,
      count: result.count,
      updatedAt: result.updatedAt,
      data: result.data,
    };

    if (onDemandSync) {
      responseBody.onDemandSync = onDemandSync;
      if (onDemandJobId) {
        responseBody.onDemandJobId = onDemandJobId;
      }
    }

    return NextResponse.json(responseBody, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
