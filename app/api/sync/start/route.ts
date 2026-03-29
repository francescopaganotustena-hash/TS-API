import { NextRequest, NextResponse } from "next/server";
import { listSyncJobs, patchSyncJob } from "../../_syncStore";
import { startSyncJob } from "../../_syncEngine";
import { isSyncResource, type SyncScope } from "../../_syncTypes";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 1000;
const DEFAULT_SYNC_MODE = "full";
const DEFAULT_OVERLAP_HOURS = 24;
const ACTIVE_JOB_STALE_MS = 10 * 60 * 1000;

function readBooleanEnv(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function readSyncMode(value: unknown): "full" | "incremental" {
  if (value === "incremental") return "incremental";
  return DEFAULT_SYNC_MODE;
}

function readScope(body: Record<string, unknown>): SyncScope {
  const rawScope = body.scope;
  const fallbackResource = typeof body.resource === "string" && isSyncResource(body.resource) ? body.resource : undefined;

  if (!rawScope || typeof rawScope !== "object") {
    if (fallbackResource) {
      return { type: "resource", resource: fallbackResource, trigger: "manual" };
    }
    return { type: "full", trigger: "manual" };
  }

  const scopeObj = rawScope as Record<string, unknown>;
  const type = scopeObj.type === "resource" ? "resource" : "full";
  const resource =
    typeof scopeObj.resource === "string" && isSyncResource(scopeObj.resource)
      ? scopeObj.resource
      : fallbackResource;

  if (type === "resource" && resource) {
    return {
      type: "resource",
      resource,
      trigger: scopeObj.trigger === "read-through" ? "read-through" : "manual",
    };
  }

  return { type: "full", trigger: scopeObj.trigger === "read-through" ? "read-through" : "manual" };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ambiente = readString(body.ambiente, "1");
    const utente = readString(body.utente, "TeamSa");
    const azienda = readString(body.azienda, "1");
    const pageSize = readNumber(body.pageSize, DEFAULT_PAGE_SIZE, 25, 1000);
    const maxPages = readNumber(body.maxPages, DEFAULT_MAX_PAGES, 1, 5000);
    const requestedSyncMode = readSyncMode(body.syncMode);
    const overlapHours = readNumber(body.overlapHours, DEFAULT_OVERLAP_HOURS, 1, 168);
    const scope = readScope(body);
    const incrementalEnabled = readBooleanEnv(process.env.SYNC_INCREMENTAL_ENABLED);
    const syncMode = requestedSyncMode === "incremental" && incrementalEnabled ? "incremental" : "full";
    const warning =
      requestedSyncMode === "incremental" && !incrementalEnabled
        ? "Sincronizzazione incrementale richiesta ma disabilitata dal flag SYNC_INCREMENTAL_ENABLED: eseguo full sync."
        : undefined;

    if (body.resource && typeof body.resource === "string" && !isSyncResource(body.resource)) {
      return NextResponse.json({ error: "resource non valido" }, { status: 400 });
    }

    const now = Date.now();
    const recentJobs = await listSyncJobs(10);
    const activeJobs = recentJobs.filter((job) => job.status === "running" || job.status === "queued");

    for (const job of activeJobs) {
      const touchedAtMs = Date.parse(job.updatedAt ?? job.startedAt);
      if (!Number.isFinite(touchedAtMs)) continue;
      if (now - touchedAtMs <= ACTIVE_JOB_STALE_MS) continue;

      await patchSyncJob(job.id, {
        status: "failed",
        phase: "idle",
        endedAt: new Date().toISOString(),
        errors: Math.max(1, job.errors ?? 0),
        message: "Job precedente marcato come interrotto per timeout operativo",
      });
    }

    const remainingActiveJobs = (await listSyncJobs(10)).filter((job) => job.status === "running" || job.status === "queued");
    if (remainingActiveJobs.length > 0) {
      return NextResponse.json(
        { error: "Esiste gia una sincronizzazione in corso", job: remainingActiveJobs[0] },
        { status: 409 }
      );
    }

    const job = await startSyncJob({ ambiente, utente, azienda, pageSize, maxPages, syncMode, overlapHours, scope });
    return NextResponse.json({
      job,
      jobId: job.id,
      status: job.status,
      phase: job.phase,
      progressPct: job.progressPct,
      message: job.message,
      syncMode,
      scope,
      warning,
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
