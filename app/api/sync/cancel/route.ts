import { NextRequest, NextResponse } from "next/server";
import { cancelSyncJob } from "../../_syncEngine";
import { listSyncJobs } from "../../_syncStore";

export const dynamic = "force-dynamic";

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    let jobId = readString(body.jobId);

    if (!jobId) {
      const activeJob = (await listSyncJobs(10)).find((job) => job.status === "running" || job.status === "queued");
      jobId = activeJob?.id ?? null;
    }

    if (!jobId) {
      return NextResponse.json({ error: "Nessuna sincronizzazione attiva da annullare" }, { status: 404 });
    }

    const job = await cancelSyncJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job non trovato" }, { status: 404 });
    }

    return NextResponse.json({
      job,
      jobId: job.id,
      status: job.status,
      phase: job.phase,
      progressPct: job.progressPct,
      message: job.message ?? "Richiesta di annullamento inviata",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
