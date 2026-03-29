"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Row = Record<string, unknown>;

type DdtLine = {
  riga: string;
  articolo: string;
  descrizione: string;
  qta: number;
  um: string;
  importo: number;
};

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = asText(value).replace(/\s/g, "").replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "short" }).format(new Date(parsed));
}

function getByPath(source: Row, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Row)[part];
  }
  return current;
}

export default function DdtSimulatoPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [header, setHeader] = useState<Row | null>(null);
  const [lines, setLines] = useState<Row[]>([]);
  const [numReg, setNumReg] = useState("");
  const [paramReady, setParamReady] = useState(false);

  useEffect(() => {
    const value = searchParams.get("numReg")?.trim() ?? "";
    setNumReg(value);
    setParamReady(true);
  }, [searchParams]);

  useEffect(() => {
    if (!paramReady) return;
    if (!numReg) {
      setLoading(false);
      setError("Parametro numReg mancante");
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordiniRes, righeRes] = await Promise.all([
          fetch(`/api/local/ordini?numReg=${encodeURIComponent(numReg)}&pageSize=1&pageNumber=0`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
          fetch(`/api/local/righeOrdine?numReg=${encodeURIComponent(numReg)}&pageSize=500&pageNumber=0`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }),
        ]);

        const ordiniPayload = (await ordiniRes.json()) as { data?: Row[]; error?: string };
        const righePayload = (await righeRes.json()) as { data?: Row[]; error?: string };

        if (!ordiniRes.ok) {
          throw new Error(ordiniPayload.error || "Errore nel caricamento testata DDT");
        }
        if (!righeRes.ok) {
          throw new Error(righePayload.error || "Errore nel caricamento righe DDT");
        }

        const head = Array.isArray(ordiniPayload.data) ? ordiniPayload.data[0] ?? null : null;
        if (!head) {
          throw new Error("DDT non trovato nel database locale");
        }

        setHeader(head);
        setLines(Array.isArray(righePayload.data) ? righePayload.data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [numReg, paramReady]);

  const parsedLines = useMemo<DdtLine[]>(() => {
    return lines.map((row, idx) => {
      const articolo = asText(row.codartMg66) || asText(row.codiceArticoloMG);
      return {
        riga: asText(row.progrRiga) || String(idx + 1),
        articolo,
        descrizione: asText(row.descart) || asText(row.estdescart) || "Voce",
        qta: asNumber(row.qta1 || row.qta2 || 0),
        um: asText(row.um1) || asText(row.um2),
        importo: asNumber(row.importo || row.costotot || 0),
      };
    });
  }, [lines]);

  const totale = useMemo(() => parsedLines.reduce((sum, line) => sum + line.importo, 0), [parsedLines]);
  const numero = asText(header?.numdoc) || asText(header?.numReg);
  const dataDoc = asText(header?.datadoc) || asText(header?.data);
  const destinatarioNome =
    asText(getByPath((header ?? {}) as Row, "clienteFornitoreMG.anagrafica.ragioneSociale")) || "Destinatario";
  const destinatarioCodice =
    asText(getByPath((header ?? {}) as Row, "clienteFornitoreMG.cliFor")) ||
    asText((header ?? {})["cliforfatt"]) ||
    asText((header ?? {})["cliForDest"]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-950">DDT Simulato</h1>
              <p className="mt-1 text-sm text-slate-500">Documento di trasporto simulato (fornitori)</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>Numero: <span className="font-semibold text-slate-900">{numero || "-"}</span></div>
              <div>Data: <span className="font-semibold text-slate-900">{dataDoc ? formatDate(dataDoc) : "-"}</span></div>
              <div>Registro: <span className="font-semibold text-slate-900">{numReg || "-"}</span></div>
            </div>
          </div>
        </header>

        {loading && <p className="py-10 text-sm text-slate-500">Caricamento dati DDT in corso...</p>}
        {error && <p className="py-10 text-sm text-rose-600">{error}</p>}

        {!loading && !error && (
          <>
            <section className="grid gap-4 py-6 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fornitore</h2>
                <p className="mt-2 font-medium text-slate-900">Azienda (simulata)</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destinatario</h2>
                <p className="mt-2 font-medium text-slate-900">{destinatarioNome}</p>
                <p className="text-sm text-slate-600">Codice cli/for: {destinatarioCodice || "-"}</p>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Riga</th>
                    <th className="px-3 py-2 text-left">Articolo</th>
                    <th className="px-3 py-2 text-left">Descrizione</th>
                    <th className="px-3 py-2 text-right">Q.ta</th>
                    <th className="px-3 py-2 text-left">UM</th>
                    <th className="px-3 py-2 text-right">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedLines.map((line) => (
                    <tr key={line.riga} className="border-t border-slate-100">
                      <td className="px-3 py-2">{line.riga}</td>
                      <td className="px-3 py-2">{line.articolo || "-"}</td>
                      <td className="px-3 py-2">{line.descrizione}</td>
                      <td className="px-3 py-2 text-right">{line.qta.toLocaleString("it-IT")}</td>
                      <td className="px-3 py-2">{line.um || "-"}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatMoney(line.importo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="ml-auto mt-6 w-full max-w-sm rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-semibold text-slate-900">Totale DDT</span>
                <span className="font-bold text-slate-950">{formatMoney(totale)}</span>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
