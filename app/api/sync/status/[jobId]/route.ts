import { NextRequest, NextResponse } from "next/server";
import { getSyncStatus } from "../../../_syncEngine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    if (!jobId || !jobId.trim()) {
      return NextResponse.json({ error: "jobId obbligatorio" }, { status: 400 });
    }

    const job = await getSyncStatus(jobId.trim());
    if (!job) {
      return NextResponse.json({ error: "Job non trovato" }, { status: 404 });
    }

    return NextResponse.json({
      job,
      jobId: job.id,
      status: job.status,
      phase: job.phase,
      progressPct: job.progressPct,
      processed: job.processed,
      inserted: job.inserted,
      updated: job.updated,
      errors: job.errors,
      message: job.message,
      startedAt: job.startedAt,
      endedAt: job.endedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
