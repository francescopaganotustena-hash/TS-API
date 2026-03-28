import { NextRequest, NextResponse } from "next/server";
import { fetchDirectClient, fetchGestionaleData, SearchParams } from "@/lib/api";

const MIN_PAGE_SIZE = 100;

function isResourceType(value: string): value is SearchParams["resourceType"] {
  return ["clienti", "fornitori", "articoli", "ordini", "righeOrdine"].includes(value);
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchParams = await request.json();

    if (!body.ambiente || !body.utente || !body.azienda || !body.resourceType || !isResourceType(body.resourceType)) {
      return NextResponse.json(
        { error: "ambiente, utente, azienda e resourceType sono obbligatori" },
        { status: 400 }
      );
    }

    const data = await fetchGestionaleData(body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Errore nella chiamata al gestionale:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}

// GET di supporto:
// - Ricerca: /api/dati?ambiente=1&utente=TeamSa&azienda=1&resourceType=articoli&codiceArticoloMG=ABC
// - Test diretto cliente: /api/dati?ambiente=1&clienteId=2&utente=TeamSa&azienda=1
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const ambiente = searchParams.get("ambiente");
  const utente = searchParams.get("utente");
  const azienda = searchParams.get("azienda");
  const clienteId = searchParams.get("clienteId");
  const resourceType = searchParams.get("resourceType");

  if (!ambiente || !utente || !azienda) {
    return NextResponse.json(
      { error: "ambiente, utente e azienda sono obbligatori" },
      { status: 400 }
    );
  }

  try {
    if (clienteId) {
      const data = await fetchDirectClient({ ambiente, clienteId, utente, azienda });
      return NextResponse.json(data);
    }

    if (!resourceType) {
      return NextResponse.json(
        { error: "resourceType è obbligatorio quando clienteId non è presente" },
        { status: 400 }
      );
    }

    if (!isResourceType(resourceType)) {
      return NextResponse.json({ error: "resourceType non valido" }, { status: 400 });
    }

    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!["ambiente", "utente", "azienda", "clienteId", "resourceType", "pageNumber", "pageSize"].includes(key)) {
        filters[key] = value;
      }
    });

    const pageNumberRaw = searchParams.get("pageNumber");
    const pageSizeRaw = searchParams.get("pageSize");
    const extendedModeRaw = searchParams.get("extendedMode");
    const pageNumber = pageNumberRaw ? Number(pageNumberRaw) : 0;
    const pageSize = pageSizeRaw ? Number(pageSizeRaw) : MIN_PAGE_SIZE;
    const extendedMode = extendedModeRaw === "1" || extendedModeRaw === "true";

    const data = await fetchGestionaleData({
      ambiente,
      utente,
      azienda,
      resourceType,
      filters,
      pageNumber: Number.isFinite(pageNumber) ? Math.max(0, pageNumber) : 0,
      pageSize: Number.isFinite(pageSize) ? Math.max(MIN_PAGE_SIZE, pageSize) : MIN_PAGE_SIZE,
      extendedMode,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Errore nella chiamata al gestionale:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
