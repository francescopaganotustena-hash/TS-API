"use client";

import { useEffect, useMemo, useState } from "react";
import { getResourceTableColumns, ResourceType } from "@/lib/api";

interface DataTableProps {
  data: Record<string, unknown>[];
  resourceType: ResourceType;
  isLoading?: boolean;
  error?: string | null;
  onClientDocuments?: (client: { cliFor: string; ragioneSociale?: string }) => void;
  onOrderRows?: (order: { numReg?: string; numdoc?: string; sezdoc?: string; tipodoc?: string }) => void;
}

function getValueByPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseSortableValue(value: unknown): number | string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.getTime();

  const text = String(value).trim();
  if (!text) return null;

  const asNumber = Number(text.replace(",", "."));
  if (Number.isFinite(asNumber) && /^-?\d+([.,]\d+)?$/.test(text)) {
    return asNumber;
  }

  const asDate = Date.parse(text);
  if (!Number.isNaN(asDate)) return asDate;

  return text.toLocaleLowerCase("it-IT");
}

function getFirstColumnValue(row: Record<string, unknown>, paths: string[]): unknown {
  return paths
    .map((path) => getValueByPath(row, path))
    .find((value) => value !== undefined && value !== null && value !== "");
}

export default function DataTable({ data, resourceType, isLoading, error, onClientDocuments, onOrderRows }: DataTableProps) {
  const configuredColumns = getResourceTableColumns(resourceType);
  const columns = data && data.length > 0
    ? (
    configuredColumns.length > 0
      ? configuredColumns
      : Object.keys(data[0] || {}).map((col) => ({ key: col, label: col, paths: [col] }))
    )
    : configuredColumns;

  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    setSortKey(columns[0]?.key ?? "");
    setSortDirection("asc");
  }, [resourceType, columns]);

  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const selectedColumn = columns.find((col) => col.key === sortKey) ?? columns[0];
    if (!selectedColumn) return data;

    const copy = [...data];
    copy.sort((a, b) => {
      const rawA = getFirstColumnValue(a, selectedColumn.paths);
      const rawB = getFirstColumnValue(b, selectedColumn.paths);
      const valA = parseSortableValue(rawA);
      const valB = parseSortableValue(rawB);

      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      let cmp = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        cmp = valA - valB;
      } else {
        cmp = String(valA).localeCompare(String(valB), "it-IT", { numeric: true, sensitivity: "base" });
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [columns, data, sortDirection, sortKey]);

  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(columnKey);
    setSortDirection("asc");
  };

  if (isLoading) {
    return <div className="panel text-center py-8 text-slate-600">Caricamento in corso...</div>;
  }

  if (error) {
    return <div className="panel text-red-700 border-red-200 bg-red-50 py-4 px-4">Errore: {error}</div>;
  }

  if (!data || data.length === 0) {
    return <div className="panel text-slate-500 py-8 px-4">Nessun dato disponibile. Esegui una ricerca.</div>;
  }

  const showClientActions = resourceType === "clienti" && typeof onClientDocuments === "function";
  const showOrderActions = resourceType === "ordini" && typeof onOrderRows === "function";

  return (
    <div className="panel overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100/80">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              >
                <button
                  type="button"
                  onClick={() => handleSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                  title="Ordina per questa colonna"
                >
                  <span>{col.label}</span>
                  <span className="text-[10px]">{sortKey === col.key ? (sortDirection === "asc" ? "ASC" : "DESC") : "-"}</span>
                </button>
              </th>
            ))}
            {(showClientActions || showOrderActions) && (
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Azioni
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {sortedData.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/55"}>
              {columns.map((col) => {
                const rawValue = getFirstColumnValue(row, col.paths);
                return (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {formatCellValue(rawValue)}
                  </td>
                );
              })}
              {(showClientActions || showOrderActions) && (
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {showClientActions && (
                    <button
                      type="button"
                      className="bg-slate-800 text-white px-3 py-1 rounded-lg hover:bg-slate-900"
                      onClick={() => {
                        const cliForValue = getFirstColumnValue(row, ["cliFor"]);
                        if (cliForValue === undefined || cliForValue === null) return;
                        const ragioneSociale = getFirstColumnValue(row, ["anagrafica.ragioneSociale", "ragioneSociale"]);
                        onClientDocuments?.({
                          cliFor: String(cliForValue),
                          ragioneSociale:
                            ragioneSociale !== undefined && ragioneSociale !== null ? String(ragioneSociale) : undefined,
                        });
                      }}
                    >
                      Documenti
                    </button>
                  )}
                  {showOrderActions && (
                    <button
                      type="button"
                      className="bg-emerald-700 text-white px-3 py-1 rounded-lg hover:bg-emerald-800"
                      onClick={() => {
                        const numReg = getFirstColumnValue(row, ["numReg"]);
                        const numdoc = getFirstColumnValue(row, ["numdoc"]);
                        const sezdoc = getFirstColumnValue(row, ["sezdoc"]);
                        const tipodoc = getFirstColumnValue(row, ["tipodoc"]);

                        onOrderRows?.({
                          numReg: numReg !== undefined && numReg !== null ? String(numReg) : undefined,
                          numdoc: numdoc !== undefined && numdoc !== null ? String(numdoc) : undefined,
                          sezdoc: sezdoc !== undefined && sezdoc !== null ? String(sezdoc) : undefined,
                          tipodoc: tipodoc !== undefined && tipodoc !== null ? String(tipodoc) : undefined,
                        });
                      }}
                    >
                      Righe
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
