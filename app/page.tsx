"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import DataTable from "@/components/DataTable";
import { getResourceEntityName, ResourceType } from "@/lib/api";

interface SearchContext {
  ambiente: string;
  utente: string;
  azienda: string;
  pageSize: number;
}

interface DrilldownClient {
  cliFor: string;
  ragioneSociale?: string;
}

interface DocumentFilters {
  tipodoc: string;
  sezdoc: string;
  numdoc: string;
}

interface SelectedOrder {
  numReg?: string;
  numdoc?: string;
  sezdoc?: string;
  tipodoc?: string;
}

const DEFAULT_CONTEXT: SearchContext = {
  ambiente: "1",
  utente: "TeamSa",
  azienda: "1",
  pageSize: 100,
};

export default function Home() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>("");
  const [activeResourceType, setActiveResourceType] = useState<ResourceType>("clienti");
  const [searchContext, setSearchContext] = useState<SearchContext>(DEFAULT_CONTEXT);

  const [selectedClient, setSelectedClient] = useState<DrilldownClient | null>(null);
  const [documentFilters, setDocumentFilters] = useState<DocumentFilters>({ tipodoc: "", sezdoc: "", numdoc: "" });
  const [clientDocuments, setClientDocuments] = useState<Record<string, unknown>[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [lastDocumentsQuery, setLastDocumentsQuery] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null);
  const [orderRows, setOrderRows] = useState<Record<string, unknown>[]>([]);
  const [isOrderRowsLoading, setIsOrderRowsLoading] = useState(false);
  const [orderRowsError, setOrderRowsError] = useState<string | null>(null);
  const [lastOrderRowsQuery, setLastOrderRowsQuery] = useState<string>("");

  const cleanFilters = (filters: Record<string, string>): Record<string, string> => {
    const output: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      const trimmed = value?.trim();
      if (trimmed) output[key] = trimmed;
    });
    return output;
  };

  const loadClientDocuments = async (client: DrilldownClient, extraFilters?: Partial<DocumentFilters>) => {
    const effectiveFilters: DocumentFilters = {
      tipodoc: extraFilters?.tipodoc ?? documentFilters.tipodoc,
      sezdoc: extraFilters?.sezdoc ?? documentFilters.sezdoc,
      numdoc: extraFilters?.numdoc ?? documentFilters.numdoc,
    };

    setSelectedClient(client);
    setSelectedOrder(null);
    setIsDocumentsLoading(true);
    setDocumentsError(null);
    setClientDocuments([]);
    setOrderRows([]);
    setOrderRowsError(null);
    setLastOrderRowsQuery("");

    const filters = cleanFilters({
      cliforfatt: client.cliFor,
      tipodoc: effectiveFilters.tipodoc,
      sezdoc: effectiveFilters.sezdoc,
      numdoc: effectiveFilters.numdoc,
    });

    setLastDocumentsQuery(
      `POST /api/v1/${searchContext.ambiente}/${getResourceEntityName("ordini")}?_op=search&utente=${searchContext.utente}&azienda=${searchContext.azienda}&cliforfatt=${client.cliFor}`
    );

    try {
      const response = await fetch("/api/dati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: "ordini",
          filters,
          pageSize: searchContext.pageSize,
          extendedMode: true,
        }),
      });

      const result = (await response.json()) as { data?: Record<string, unknown>[]; error?: string };
      if (!response.ok || result.error) {
        throw new Error(result.error || `Errore: ${response.statusText}`);
      }

      setClientDocuments(result.data || []);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : "Errore sconosciuto");
      setClientDocuments([]);
    } finally {
      setIsDocumentsLoading(false);
    }
  };

  const handleSearch = async (params: {
    ambiente: string;
    utente: string;
    azienda: string;
    resourceType: ResourceType;
    filters: Record<string, string>;
    pageSize: number;
    extendedMode: boolean;
  }) => {
    setIsLoading(true);
    setError(null);
    setActiveResourceType(params.resourceType);
    setSelectedClient(null);
    setClientDocuments([]);
    setDocumentsError(null);
    setSelectedOrder(null);
    setOrderRows([]);
    setOrderRowsError(null);
    setLastOrderRowsQuery("");
    setSearchContext({
      ambiente: params.ambiente,
      utente: params.utente,
      azienda: params.azienda,
      pageSize: params.pageSize,
    });

    setLastQuery(
      `POST /api/v1/${params.ambiente}/${getResourceEntityName(params.resourceType)}?_op=search&utente=${params.utente}&azienda=${params.azienda}`
    );

    try {
      const response = await fetch("/api/dati", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ambiente: params.ambiente,
          utente: params.utente,
          azienda: params.azienda,
          resourceType: params.resourceType,
          filters: params.filters,
          pageSize: params.pageSize,
          extendedMode: params.extendedMode,
        }),
      });

      const result = (await response.json()) as { data?: Record<string, unknown>[]; error?: string };

      if (!response.ok || result.error) {
        throw new Error(result.error || `Errore: ${response.statusText}`);
      }

      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectClientTest = async (params: {
    ambiente: string;
    clienteId: string;
    utente: string;
    azienda: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setActiveResourceType("clienti");
    setSearchContext({
      ambiente: params.ambiente,
      utente: params.utente,
      azienda: params.azienda,
      pageSize: DEFAULT_CONTEXT.pageSize,
    });
    setLastQuery(
      `GET /api/v1/${params.ambiente}/cliente/${params.clienteId}?utente=${params.utente}&azienda=${params.azienda}`
    );

    try {
      const url = new URL("/api/dati", window.location.origin);
      url.searchParams.set("ambiente", params.ambiente);
      url.searchParams.set("clienteId", params.clienteId);
      url.searchParams.set("utente", params.utente);
      url.searchParams.set("azienda", params.azienda);

      const response = await fetch(url.toString(), { method: "GET" });
      const result = (await response.json()) as { data?: Record<string, unknown>[]; error?: string };

      if (!response.ok || result.error) {
        throw new Error(result.error || `Errore: ${response.statusText}`);
      }

      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenClientDocuments = async (client: DrilldownClient) => {
    setDocumentFilters({ tipodoc: "", sezdoc: "", numdoc: "" });
    setSelectedOrder(null);
    setOrderRows([]);
    setOrderRowsError(null);
    setLastOrderRowsQuery("");
    await loadClientDocuments(client, { tipodoc: "", sezdoc: "", numdoc: "" });
  };

  const handleOpenOrderRows = async (order: SelectedOrder) => {
    const numReg = order.numReg?.trim();
    if (!numReg) {
      setOrderRows([]);
      setOrderRowsError("Impossibile aprire le righe: il documento non espone il campo numReg.");
      setSelectedOrder(order);
      return;
    }

    setSelectedOrder(order);
    setIsOrderRowsLoading(true);
    setOrderRowsError(null);
    setOrderRows([]);
    setLastOrderRowsQuery(
      `POST /api/v1/${searchContext.ambiente}/${getResourceEntityName("righeOrdine")}?_op=search&utente=${searchContext.utente}&azienda=${searchContext.azienda}&numReg=${numReg}`
    );

    try {
      const response = await fetch("/api/dati", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: "righeOrdine",
          filters: { numReg },
          pageSize: searchContext.pageSize,
          extendedMode: false,
        }),
      });

      const result = (await response.json()) as { data?: Record<string, unknown>[]; error?: string };
      if (!response.ok || result.error) {
        throw new Error(result.error || `Errore: ${response.statusText}`);
      }

      setOrderRows(result.data || []);
    } catch (err) {
      setOrderRowsError(err instanceof Error ? err.message : "Errore sconosciuto");
      setOrderRows([]);
    } finally {
      setIsOrderRowsLoading(false);
    }
  };

  const handleDocumentFilterChange = (key: keyof DocumentFilters, value: string) => {
    setDocumentFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDocumentFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    await loadClientDocuments(selectedClient);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TS-API Portal</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 mb-6 text-sm">
          Ricerca da Swagger: Clienti/Fornitori (ClienteFornitoreMG), Articoli (Articolo), Ordini (Documento).
        </div>
        {lastQuery && (
          <p className="text-sm text-gray-600 mb-4">
            Ultima chiamata: <span className="font-medium">{lastQuery}</span>
          </p>
        )}
        <SearchForm onSearch={handleSearch} onDirectClientTest={handleDirectClientTest} isLoading={isLoading} />
        <DataTable
          data={data}
          resourceType={activeResourceType}
          isLoading={isLoading}
          error={error}
          onClientDocuments={activeResourceType === "clienti" ? handleOpenClientDocuments : undefined}
          onOrderRows={activeResourceType === "ordini" ? handleOpenOrderRows : undefined}
        />

        {selectedClient && (
          <section className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">
              Documenti cliente {selectedClient.cliFor}
              {selectedClient.ragioneSociale ? ` - ${selectedClient.ragioneSociale}` : ""}
            </h2>
            {lastDocumentsQuery && (
              <p className="text-sm text-gray-600 mb-4">
                Query documenti: <span className="font-medium">{lastDocumentsQuery}</span>
              </p>
            )}

            <form onSubmit={handleDocumentFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                type="text"
                value={documentFilters.tipodoc}
                onChange={(e) => handleDocumentFilterChange("tipodoc", e.target.value)}
                placeholder="Tipo doc (es. FTV)"
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                value={documentFilters.sezdoc}
                onChange={(e) => handleDocumentFilterChange("sezdoc", e.target.value)}
                placeholder="Sezionale (es. 00)"
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                value={documentFilters.numdoc}
                onChange={(e) => handleDocumentFilterChange("numdoc", e.target.value)}
                placeholder="Numero doc"
                className="w-full p-2 border rounded"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isDocumentsLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Filtra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setSelectedOrder(null);
                    setClientDocuments([]);
                    setOrderRows([]);
                    setDocumentsError(null);
                    setOrderRowsError(null);
                    setLastDocumentsQuery("");
                    setLastOrderRowsQuery("");
                  }}
                  className="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700"
                >
                  Chiudi
                </button>
              </div>
            </form>

            <DataTable
              data={clientDocuments}
              resourceType="ordini"
              isLoading={isDocumentsLoading}
              error={documentsError}
              onOrderRows={handleOpenOrderRows}
            />
          </section>
        )}

        {selectedOrder && (
          <section className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">
              Righe documento
              {selectedOrder.tipodoc ? ` ${selectedOrder.tipodoc}` : ""}
              {selectedOrder.sezdoc ? `/${selectedOrder.sezdoc}` : ""}
              {selectedOrder.numdoc ? ` n. ${selectedOrder.numdoc}` : ""}
            </h2>
            <p className="text-sm text-gray-600 mb-2">
              numReg: <span className="font-medium">{selectedOrder.numReg || "-"}</span>
            </p>
            {lastOrderRowsQuery && (
              <p className="text-sm text-gray-600 mb-4">
                Query righe: <span className="font-medium">{lastOrderRowsQuery}</span>
              </p>
            )}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder(null);
                  setOrderRows([]);
                  setOrderRowsError(null);
                  setLastOrderRowsQuery("");
                }}
                className="bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700"
              >
                Chiudi righe
              </button>
            </div>
            <DataTable
              data={orderRows}
              resourceType="righeOrdine"
              isLoading={isOrderRowsLoading}
              error={orderRowsError}
            />
          </section>
        )}
      </div>
    </main>
  );
}
