import { NextRequest, NextResponse } from "next/server";
import { isSyncResource } from "../../_syncTypes";
import { readLocalData } from "../../_syncStore";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    if (!resource || !isSyncResource(resource)) {
      return NextResponse.json({ error: "resource non valido" }, { status: 400 });
    }

    const snapshot = await readLocalData(resource);
    const searchParams = request.nextUrl.searchParams;
    const pageNumberRaw = searchParams.get("pageNumber");
    const pageSizeRaw = searchParams.get("pageSize");
    const pageNumber = pageNumberRaw ? Number(pageNumberRaw) : 0;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : snapshot.rows.length || 100;
    const normalizedPageNumber = Number.isFinite(pageNumber) ? Math.max(0, Math.floor(pageNumber)) : 0;
    const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 100;

    const reservedKeys = new Set(["pageNumber", "pageSize", "ambiente", "utente", "azienda", "extendedMode"]);
    const filters: Array<{ key: string; value: string }> = [];
    searchParams.forEach((value, key) => {
      if (reservedKeys.has(key)) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      filters.push({ key, value: trimmed.toLowerCase() });
    });

    const filteredRows = filters.length
      ? snapshot.rows.filter((row) =>
          filters.every((filter) => {
            const haystack = JSON.stringify(row).toLowerCase();
            return haystack.includes(filter.value);
          })
        )
      : snapshot.rows;

    const start = normalizedPageNumber * normalizedPageSize;
    const pagedRows = filteredRows.slice(start, start + normalizedPageSize);

    return NextResponse.json({
      resource,
      count: filteredRows.length,
      updatedAt: snapshot.updatedAt,
      data: pagedRows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
