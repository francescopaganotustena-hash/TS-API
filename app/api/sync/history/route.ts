import { NextRequest, NextResponse } from "next/server";
import { listSyncJobs } from "../../_syncStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const parsed = limitRaw ? Number(limitRaw) : 20;
    const limit = Number.isFinite(parsed) ? Math.min(100, Math.max(1, Math.floor(parsed))) : 20;
    const jobs = await listSyncJobs(limit);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
