"use client";

import { useEffect, useState } from "react";
import { getResourceLabel, getResourceSearchFields, ResourceType } from "@/lib/api";

interface SearchFormProps {
  onSearch: (params: {
    ambiente: string;
    utente: string;
    azienda: string;
    resourceType: ResourceType;
    filters: Record<string, string>;
    pageSize: number;
    extendedMode: boolean;
  }) => void;
  onDirectClientTest: (params: {
    ambiente: string;
    clienteId: string;
    utente: string;
    azienda: string;
  }) => void;
  isLoading?: boolean;
}

const RESOURCE_TYPES: ResourceType[] = ["clienti", "fornitori", "articoli", "ordini"];
const MIN_PAGE_SIZE = 100;

export default function SearchForm({ onSearch, onDirectClientTest, isLoading }: SearchFormProps) {
  const [ambiente, setAmbiente] = useState("1");
  const [utente, setUtente] = useState("TeamSa");
  const [azienda, setAzienda] = useState("1");
  const [resourceType, setResourceType] = useState<ResourceType>("clienti");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(MIN_PAGE_SIZE);
  const [extendedMode, setExtendedMode] = useState(false);

  const searchFields = getResourceSearchFields(resourceType, true);

  useEffect(() => {
    setFilters({});
  }, [resourceType]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasExtendedFilters = searchFields.some((field) => {
      if (field.safe) return false;
      const value = filters[field.key];
      return typeof value === "string" && value.trim() !== "";
    });
    const effectiveExtendedMode = extendedMode || hasExtendedFilters;

    onSearch({
      ambiente,
      utente,
      azienda,
      resourceType,
      filters,
      pageSize: Math.max(MIN_PAGE_SIZE, pageSize || MIN_PAGE_SIZE),
      extendedMode: effectiveExtendedMode,
    });
  };

  const handleQuickClientTest = () => {
    onDirectClientTest({
      ambiente,
      clienteId: "2",
      utente,
      azienda,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ambiente *</label>
          <input
            type="text"
            value={ambiente}
            onChange={(e) => setAmbiente(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Utente *</label>
          <input
            type="text"
            value={utente}
            onChange={(e) => setUtente(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Azienda *</label>
          <input
            type="text"
            value={azienda}
            onChange={(e) => setAzienda(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Risorsa *</label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as ResourceType)}
            className="w-full p-2 border rounded"
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {getResourceLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Page size</label>
          <input
            type="number"
            min={MIN_PAGE_SIZE}
            max={1000}
            value={pageSize}
            onChange={(e) => setPageSize(Math.max(MIN_PAGE_SIZE, Number(e.target.value) || MIN_PAGE_SIZE))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          id="extended-mode"
          type="checkbox"
          checked={extendedMode}
          onChange={(e) => setExtendedMode(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="extended-mode" className="text-sm font-medium">
          Ricerca estesa (campi avanzati + fallback automatico)
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filtri ricerca ({getResourceLabel(resourceType)})</label>
        <p className="text-xs text-gray-500 mb-3">
          I filtri sono sempre visibili. I campi avanzati (es. nome/ragione sociale e descrizione articolo)
          attivano automaticamente la ricerca estesa se compilati.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
              <input
                type="text"
                value={filters[field.key] || ""}
                onChange={(e) => handleFilterChange(field.key, e.target.value)}
                className="w-full p-2 border rounded"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Caricamento..." : `Cerca ${getResourceLabel(resourceType)}`}
        </button>
        <button
          type="button"
          onClick={handleQuickClientTest}
          disabled={isLoading}
          className="bg-slate-700 text-white px-6 py-2 rounded hover:bg-slate-800 disabled:opacity-50"
        >
          Test diretto cliente (id 2)
        </button>
      </div>
    </form>
  );
}
