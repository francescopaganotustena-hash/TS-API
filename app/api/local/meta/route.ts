import { NextResponse } from "next/server";
import { getLastSyncInfo } from "../../_syncStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const meta = await getLastSyncInfo();
    return NextResponse.json({
      meta,
      lastSyncedAt: meta.lastSyncAt,
      message: meta.message,
      lastStatus: meta.lastStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
