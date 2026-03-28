import { NextRequest, NextResponse } from "next/server";
import { listSyncJobs, patchSyncJob } from "../../_syncStore";
import { startSyncJob } from "../../_syncEngine";
import { isSyncResource } from "../../_syncTypes";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 500;
const ACTIVE_JOB_STALE_MS = 10 * 60 * 1000;

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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ambiente = readString(body.ambiente, "1");
    const utente = readString(body.utente, "TeamSa");
    const azienda = readString(body.azienda, "1");
    const pageSize = readNumber(body.pageSize, DEFAULT_PAGE_SIZE, 25, 1000);
    const maxPages = readNumber(body.maxPages, DEFAULT_MAX_PAGES, 1, 1000);

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

    const job = await startSyncJob({ ambiente, utente, azienda, pageSize, maxPages });
    return NextResponse.json({
      job,
      jobId: job.id,
      status: job.status,
      phase: job.phase,
      progressPct: job.progressPct,
      message: job.message,
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
