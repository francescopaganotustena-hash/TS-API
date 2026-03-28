/**
 * Client Alyante:
 * - Ricerca entity Swagger via _op=search
 * - Chiamata diretta cliente per test rapido
 */

const GESTIONALE_API_URL = process.env.GESTIONALE_API_URL;
const GESTIONALE_USERNAME = process.env.GESTIONALE_USERNAME;
const GESTIONALE_PASSWORD = process.env.GESTIONALE_PASSWORD;
const GESTIONALE_AUTH_SCOPE = process.env.GESTIONALE_AUTH_SCOPE || "1";
const MIN_PAGE_SIZE = 100;
const REMOTE_SAFE_PAGE_SIZE = 50;

export type ResourceType = "clienti" | "fornitori" | "articoli" | "ordini" | "righeOrdine";

export interface SearchFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  comparer?: number;
  safe: boolean;
  apiFields?: string[];
  localPaths?: string[];
}

export interface TableColumnConfig {
  key: string;
  label: string;
  paths: string[];
}

export interface SearchParams {
  ambiente: string;
  utente: string;
  azienda: string;
  resourceType: ResourceType;
  filters: Record<string, string>;
  pageNumber?: number;
  pageSize?: number;
  extendedMode?: boolean;
}

export interface DirectClientParams {
  ambiente: string;
  clienteId: string;
  utente: string;
  azienda: string;
}

export interface ApiResponse {
  data: Record<string, unknown>[];
}

const RESOURCE_ENTITY_MAP: Record<ResourceType, string> = {
  clienti: "cliente",
  fornitori: "fornitore",
  articoli: "Articolo",
  ordini: "Documento",
  righeOrdine: "RigaDocumento",
};

const RESOURCE_SEARCH_FIELDS: Record<ResourceType, SearchFieldConfig[]> = {
  clienti: [
    { key: "cliFor", label: "Codice Cliente", placeholder: "es. 2", comparer: 0, safe: true },
    { key: "dittaCg18", label: "Ditta", placeholder: "es. 1", comparer: 0, safe: true },
    { key: "flgAttivo", label: "Attivo (1/0)", placeholder: "1", comparer: 0, safe: true },
    { key: "tipoCf", label: "Tipo CF (0 cliente, 1 fornitore)", placeholder: "0", comparer: 0, safe: true },
    {
      key: "nome",
      label: "Nome / Ragione Sociale (esteso)",
      placeholder: "es. ANTEA",
      comparer: 20,
      safe: false,
      apiFields: ["anagrafica.ragioneSociale", "ragioneSociale"],
      localPaths: ["anagrafica.ragioneSociale"],
    },
    {
      key: "partitaIva",
      label: "Partita IVA (esteso)",
      placeholder: "es. 12345678901",
      comparer: 20,
      safe: false,
      apiFields: ["anagrafica.partiva", "partiva"],
      localPaths: ["anagrafica.partiva"],
    },
    {
      key: "codiceFiscale",
      label: "Codice Fiscale (esteso)",
      placeholder: "es. RSSMRA...",
      comparer: 20,
      safe: false,
      apiFields: ["anagrafica.codiceFiscale", "codiceFiscale"],
      localPaths: ["anagrafica.codiceFiscale"],
    },
  ],
  fornitori: [
    { key: "cliFor", label: "Codice Fornitore", placeholder: "es. 45", comparer: 0, safe: true },
    { key: "dittaCg18", label: "Ditta", placeholder: "es. 1", comparer: 0, safe: true },
    { key: "flgAttivo", label: "Attivo (1/0)", placeholder: "1", comparer: 0, safe: true },
    { key: "tipoCf", label: "Tipo CF (0 cliente, 1 fornitore)", placeholder: "1", comparer: 0, safe: true },
    {
      key: "nome",
      label: "Nome / Ragione Sociale (esteso)",
      placeholder: "es. Fornitore SRL",
      comparer: 20,
      safe: false,
      apiFields: ["anagrafica.ragioneSociale", "ragioneSociale"],
      localPaths: ["anagrafica.ragioneSociale"],
    },
    {
      key: "partitaIva",
      label: "Partita IVA (esteso)",
      placeholder: "es. 12345678901",
      comparer: 20,
      safe: false,
      apiFields: ["anagrafica.partiva", "partiva"],
      localPaths: ["anagrafica.partiva"],
    },
    {
      key: "codiceFiscale",
      label: "Codice Fiscale (esteso)",
      placeholder: "es. RSSMRA...",
      comparer: 20,
      safe: false,
      apiFields: ["anagrafica.codiceFiscale", "codiceFiscale"],
      localPaths: ["anagrafica.codiceFiscale"],
    },
  ],
  articoli: [
    { key: "codiceArticoloMG", label: "Codice Articolo", placeholder: "es. APPACC...", comparer: 20, safe: true },
    { key: "ditta", label: "Ditta", placeholder: "es. 1", comparer: 0, safe: true },
    { key: "flgArtesaur", label: "Esaurito (1/0)", placeholder: "0", comparer: 0, safe: true },
    {
      key: "descrizione",
      label: "Descrizione Articolo (esteso)",
      placeholder: "es. Guarnizione",
      comparer: 20,
      safe: false,
      apiFields: ["currentDescription", "descrizione", "datoDescrizione.descart"],
      localPaths: ["descrizione", "currentDescription", "datoDescrizione.descart", "datoDescrizione.descartest"],
    },
  ],
  ordini: [
    { key: "numdoc", label: "Numero Documento", placeholder: "es. 10023", comparer: 0, safe: true },
    { key: "sezdoc", label: "Sezionale", placeholder: "es. A", comparer: 20, safe: true },
    { key: "tipodoc", label: "Tipo Documento", placeholder: "es. ORD", comparer: 20, safe: true },
    {
      key: "cliforfatt",
      label: "Codice Cliente/Fornitore (esteso)",
      placeholder: "es. 21",
      comparer: 0,
      safe: false,
      apiFields: ["clienteFornitoreMG.cliFor", "cliForDest", "cliforfatt"],
      localPaths: ["clienteFornitoreMG.cliFor", "clienteFornitoreMG.idCliFor", "cliForDest", "cliforfatt"],
    },
  ],
  righeOrdine: [
    { key: "numReg", label: "NumReg Documento", placeholder: "es. 12345", comparer: 0, safe: true },
    { key: "codartMg66", label: "Codice Articolo", placeholder: "es. ART001", comparer: 20, safe: true },
    { key: "descart", label: "Descrizione Riga", placeholder: "es. guarnizione", comparer: 20, safe: true },
  ],
};

const RESOURCE_TABLE_COLUMNS: Record<ResourceType, TableColumnConfig[]> = {
  clienti: [
    { key: "cliFor", label: "Codice", paths: ["cliFor"] },
    { key: "ragioneSociale", label: "Nome Cliente", paths: ["anagrafica.ragioneSociale"] },
    { key: "partitaIva", label: "Partita IVA", paths: ["anagrafica.partiva"] },
    { key: "codiceFiscale", label: "Codice Fiscale", paths: ["anagrafica.codiceFiscale"] },
    { key: "citta", label: "Citta", paths: ["anagrafica.citta"] },
    { key: "email", label: "Email", paths: ["anagrafica.indemail"] },
    { key: "attivo", label: "Attivo", paths: ["flgAttivo"] },
  ],
  fornitori: [
    { key: "cliFor", label: "Codice", paths: ["cliFor"] },
    { key: "ragioneSociale", label: "Nome Fornitore", paths: ["anagrafica.ragioneSociale"] },
    { key: "partitaIva", label: "Partita IVA", paths: ["anagrafica.partiva"] },
    { key: "codiceFiscale", label: "Codice Fiscale", paths: ["anagrafica.codiceFiscale"] },
    { key: "citta", label: "Citta", paths: ["anagrafica.citta"] },
    { key: "email", label: "Email", paths: ["anagrafica.indemail"] },
    { key: "attivo", label: "Attivo", paths: ["flgAttivo"] },
  ],
  articoli: [
    { key: "codiceArticoloMG", label: "Codice Articolo", paths: ["codiceArticoloMG"] },
    { key: "codinterno", label: "Codice Interno", paths: ["codinterno"] },
    {
      key: "descrizione",
      label: "Descrizione",
      paths: ["descrizione", "currentDescription", "datoDescrizione.descart", "datoDescrizione.descartest"],
    },
    { key: "ditta", label: "Ditta", paths: ["ditta"] },
    { key: "esaurito", label: "Esaurito", paths: ["flgArtesaur"] },
    { key: "ultimoAggiornamento", label: "Ultimo Agg.", paths: ["dtultagganag"] },
  ],
  ordini: [
    { key: "numdoc", label: "Numero", paths: ["numdoc"] },
    { key: "sezdoc", label: "Sezionale", paths: ["sezdoc"] },
    { key: "tipodoc", label: "Tipo", paths: ["tipodoc"] },
    { key: "datadoc", label: "Data", paths: ["datadoc"] },
    { key: "clienteFornitore", label: "Cli/For", paths: ["clienteFornitoreMG.cliFor", "cliforfatt", "cliForDest"] },
    { key: "ditta", label: "Ditta", paths: ["ditta"] },
  ],
  righeOrdine: [
    { key: "progrRiga", label: "Riga", paths: ["progrRiga"] },
    { key: "codartMg66", label: "Codice Articolo", paths: ["codartMg66"] },
    { key: "descart", label: "Descrizione", paths: ["descart", "estdescart"] },
    { key: "qta1", label: "Quantita", paths: ["qta1", "qta2"] },
    { key: "um1", label: "UM", paths: ["um1", "um2"] },
    { key: "prezzo1", label: "Prezzo", paths: ["prezzo1", "prezzo2"] },
    { key: "importo", label: "Totale", paths: ["importo", "costotot"] },
  ],
};

interface SearchItem {
  propertyName: string;
  value: string;
  comparer: number;
  operator: number;
}

interface ExtendedFilter {
  value: string;
  localPaths: string[];
  comparer: number;
}

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Authorization-Scope": GESTIONALE_AUTH_SCOPE,
  };

  if (GESTIONALE_USERNAME && GESTIONALE_PASSWORD) {
    const credentials = Buffer.from(`${GESTIONALE_USERNAME}:${GESTIONALE_PASSWORD}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  }

  return headers;
}

function normalizeResponse(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.value)) return obj.value as Record<string, unknown>[];
    return [obj];
  }

  return [];
}

async function getByPath(url: URL): Promise<Record<string, unknown> | null> {
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) return null;
  const payload = await parseJsonSafe(response);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return null;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
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

function extractArticleDescription(row: Record<string, unknown>): string | undefined {
  const direct = row.descrizione;
  if (typeof direct === "string" && direct.trim() !== "") return direct.trim();

  const currentDescription = row.currentDescription;
  if (typeof currentDescription === "string" && currentDescription.trim() !== "") {
    return currentDescription.trim();
  }
  if (currentDescription && typeof currentDescription === "object") {
    const nested = currentDescription as Record<string, unknown>;
    for (const key of ["descrizione", "description", "descart", "descartest"]) {
      const value = nested[key];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
  }

  const datoDescrizione = row.datoDescrizione;
  if (Array.isArray(datoDescrizione)) {
    for (const item of datoDescrizione) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      for (const key of ["descart", "descartest", "descrizione", "description"]) {
        const value = obj[key];
        if (typeof value === "string" && value.trim() !== "") return value.trim();
      }
    }
  } else if (datoDescrizione && typeof datoDescrizione === "object") {
    const obj = datoDescrizione as Record<string, unknown>;
    for (const key of ["descart", "descartest", "descrizione", "description"]) {
      const value = obj[key];
      if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
  }

  return undefined;
}

function buildSearchItems(
  resourceType: ResourceType,
  filters: Record<string, string>,
  extendedMode: boolean
): {
  allItems: SearchItem[];
  safeItems: SearchItem[];
  extendedFilters: ExtendedFilter[];
  safeUserItemsCount: number;
} {
  const fields = getResourceSearchFields(resourceType, true);
  const fieldByKey = new Map(fields.map((f) => [f.key, f]));

  const allItems: SearchItem[] = [];
  const safeItems: SearchItem[] = [];
  const extendedFilters: ExtendedFilter[] = [];
  let safeUserItemsCount = 0;

  for (const [key, rawValue] of Object.entries(filters)) {
    const value = rawValue?.trim();
    if (!value) continue;

    const field = fieldByKey.get(key);
    if (!field) continue;

    if (!field.safe && !extendedMode) continue;

    const comparer = field.comparer ?? 20;
    const apiField = field.apiFields?.[0] ?? field.key;
    const item: SearchItem = {
      propertyName: apiField,
      value,
      comparer,
      operator: 1,
    };

    allItems.push(item);
    if (field.safe) {
      safeItems.push(item);
      safeUserItemsCount++;
    } else {
      extendedFilters.push({
        value,
        localPaths: field.localPaths?.length ? field.localPaths : [apiField],
        comparer,
      });
    }
  }

  return { allItems, safeItems, extendedFilters, safeUserItemsCount };
}

function applyExtendedLocalFilter(rows: Record<string, unknown>[], filters: ExtendedFilter[]): Record<string, unknown>[] {
  if (!filters.length) return rows;

  const matchesByComparer = (candidate: string, filter: ExtendedFilter): boolean => {
    const source = candidate.toLowerCase().trim();
    const target = filter.value.toLowerCase().trim();

    switch (filter.comparer) {
      case 0:
        return source === target;
      case 30:
        return source.startsWith(target);
      case 40:
        return source.endsWith(target);
      default:
        return source.includes(target);
    }
  };

  return rows.filter((row) =>
    filters.every((filter) => {
      const matched = filter.localPaths.some((path) => {
        const value = getValueByPath(row, path);
        if (value === undefined || value === null) return false;
        return matchesByComparer(String(value), filter);
      });
      return matched;
    })
  );
}

async function enrichRows(
  rows: Record<string, unknown>[],
  resourceType: ResourceType,
  ambiente: string,
  utente: string,
  azienda: string
): Promise<Record<string, unknown>[]> {
  if (!GESTIONALE_API_URL || rows.length === 0) return rows;

  const baseUrl = normalizeBaseUrl(GESTIONALE_API_URL);

  if (resourceType === "clienti" || resourceType === "fornitori") {
    const detailEntity = resourceType === "clienti" ? "cliente" : "fornitore";
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const hasAnagrafica = row.anagrafica && typeof row.anagrafica === "object";
        const cliFor = row.cliFor;
        if (hasAnagrafica || cliFor === undefined || cliFor === null) return row;

        const url = new URL(
          `${baseUrl}/v1/${encodeURIComponent(ambiente)}/${detailEntity}/${encodeURIComponent(String(cliFor))}`
        );
        url.searchParams.append("utente", utente);
        url.searchParams.append("azienda", azienda);

        const detail = await getByPath(url);
        if (!detail) return row;
        return { ...row, ...detail };
      })
    );
    return enriched;
  }

  if (resourceType === "articoli") {
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const currentDescription = extractArticleDescription(row);
        if (currentDescription) {
          return { ...row, descrizione: currentDescription };
        }

        const codiceArticolo = row.codiceArticoloMG;
        if (codiceArticolo === undefined || codiceArticolo === null) return row;

        const url = new URL(
          `${baseUrl}/v1/${encodeURIComponent(ambiente)}/Articolo/${encodeURIComponent(String(codiceArticolo))}`
        );
        url.searchParams.append("utente", utente);
        url.searchParams.append("azienda", azienda);

        const article = await getByPath(url);
        if (!article) return row;
        const description = extractArticleDescription(article) ?? extractArticleDescription(row);

        return {
          ...row,
          currentDescription: article.currentDescription ?? row.currentDescription,
          datoDescrizione: article.datoDescrizione ?? row.datoDescrizione,
          descrizione: description ?? row.descrizione,
        };
      })
    );
    return enriched;
  }

  if (resourceType === "ordini") {
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const nestedCliFor = getValueByPath(row, "clienteFornitoreMG.cliFor");
        if (nestedCliFor !== undefined && nestedCliFor !== null && String(nestedCliFor).trim() !== "") {
          return row;
        }

        const documentId = row.numReg ?? row.guid ?? row.numdoc;
        if (documentId === undefined || documentId === null) return row;

        const url = new URL(
          `${baseUrl}/v1/${encodeURIComponent(ambiente)}/Documento/${encodeURIComponent(String(documentId))}`
        );
        url.searchParams.append("utente", utente);
        url.searchParams.append("azienda", azienda);

        const detail = await getByPath(url);
        if (!detail) return row;

        return {
          ...row,
          cliforfatt: detail.cliforfatt ?? row.cliforfatt,
          cliForDest: detail.cliForDest ?? row.cliForDest,
          clienteFornitoreMG: detail.clienteFornitoreMG ?? row.clienteFornitoreMG,
        };
      })
    );
    return enriched;
  }

  return rows;
}

async function executeSearch(url: URL, items: SearchItem[], pageNumber: number, pageSize: number): Promise<Response> {
  const body = {
    pageNumber,
    pageSize,
    items,
  };

  return fetch(url.toString(), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
}

async function executeSearchCollectRows(
  url: URL,
  items: SearchItem[],
  pageNumber: number,
  pageSize: number
): Promise<{ rows: Record<string, unknown>[]; errorStatus?: number; errorText?: string }> {
  if (pageSize <= REMOTE_SAFE_PAGE_SIZE) {
    const response = await executeSearch(url, items, pageNumber, pageSize);
    if (!response.ok) {
      return {
        rows: [],
        errorStatus: response.status,
        errorText: await response.text(),
      };
    }
    const payload = await parseJsonSafe(response);
    return { rows: normalizeResponse(payload) };
  }

  const normalizedPageNumber = Math.max(0, pageNumber);
  const offset = normalizedPageNumber * pageSize;
  const startRemotePage = Math.floor(offset / REMOTE_SAFE_PAGE_SIZE);
  const offsetInStartPage = offset % REMOTE_SAFE_PAGE_SIZE;
  const needed = offsetInStartPage + pageSize;

  const collected: Record<string, unknown>[] = [];
  let remotePage = startRemotePage;

  while (collected.length < needed) {
    const response = await executeSearch(url, items, remotePage, REMOTE_SAFE_PAGE_SIZE);
    if (!response.ok) {
      return {
        rows: [],
        errorStatus: response.status,
        errorText: await response.text(),
      };
    }

    const payload = await parseJsonSafe(response);
    const pageRows = normalizeResponse(payload);
    if (pageRows.length === 0) break;

    collected.push(...pageRows);
    if (pageRows.length < REMOTE_SAFE_PAGE_SIZE) break;
    remotePage += 1;
  }

  const rows = collected.slice(offsetInStartPage, offsetInStartPage + pageSize);
  return { rows };
}

function buildRowIdentity(row: Record<string, unknown>, fallbackIndex: number): string {
  const guid = row.guid;
  if (guid !== undefined && guid !== null) return `guid:${String(guid)}`;

  const cliFor = row.cliFor;
  if (cliFor !== undefined && cliFor !== null) return `cliFor:${String(cliFor)}`;

  const articolo = row.codiceArticoloMG;
  if (articolo !== undefined && articolo !== null) return `art:${String(articolo)}`;

  const numdoc = row.numdoc;
  const sezdoc = row.sezdoc;
  if (numdoc !== undefined && numdoc !== null) return `doc:${String(sezdoc ?? "")}:${String(numdoc)}`;

  return `row:${fallbackIndex}`;
}

function mergeDistinctRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const output: Record<string, unknown>[] = [];

  rows.forEach((row, idx) => {
    const key = buildRowIdentity(row, idx);
    if (seen.has(key)) return;
    seen.add(key);
    output.push(row);
  });

  return output;
}

async function fetchEntityById(
  baseUrl: string,
  ambiente: string,
  entity: "cliente" | "fornitore" | "Articolo",
  id: string,
  utente: string,
  azienda: string
): Promise<Record<string, unknown> | null> {
  const url = new URL(`${baseUrl}/v1/${encodeURIComponent(ambiente)}/${entity}/${encodeURIComponent(id)}`);
  url.searchParams.append("utente", utente);
  url.searchParams.append("azienda", azienda);
  return getByPath(url);
}

export async function fetchGestionaleData(params: SearchParams): Promise<ApiResponse> {
  if (!GESTIONALE_API_URL) {
    throw new Error("GESTIONALE_API_URL non configurato");
  }

  const {
    ambiente,
    utente,
    azienda,
    resourceType,
    filters,
    pageNumber = 0,
    pageSize = MIN_PAGE_SIZE,
    extendedMode = false,
  } = params;
  const normalizedPageSize = Math.max(MIN_PAGE_SIZE, pageSize || MIN_PAGE_SIZE);
  const hasUnsafeFilterValues = getResourceSearchFields(resourceType, true).some((field) => {
    if (field.safe) return false;
    const raw = filters[field.key];
    return typeof raw === "string" && raw.trim() !== "";
  });
  const effectiveExtendedMode = extendedMode || hasUnsafeFilterValues;

  const baseUrl = normalizeBaseUrl(GESTIONALE_API_URL);
  const entityName = RESOURCE_ENTITY_MAP[resourceType];

  // Fast path affidabili su endpoint id (i relativi campi non funzionano bene con _op=search)
  const cliForFilter = filters.cliFor?.trim();
  if ((resourceType === "clienti" || resourceType === "fornitori") && cliForFilter) {
    const detailEntity = resourceType === "clienti" ? "cliente" : "fornitore";
    const direct = await fetchEntityById(baseUrl, ambiente, detailEntity, cliForFilter, utente, azienda);
    if (!direct) return { data: [] };

    let directRows = [direct];
    directRows = await enrichRows(directRows, resourceType, ambiente, utente, azienda);

    // applichiamo eventuali filtri estesi/locali rimanenti sul singolo record
    const filtersWithoutCliFor = { ...filters };
    delete filtersWithoutCliFor.cliFor;
    const { extendedFilters } = buildSearchItems(resourceType, filtersWithoutCliFor, true);
    if (extendedFilters.length > 0) {
      directRows = applyExtendedLocalFilter(directRows, extendedFilters);
    }
    return { data: directRows };
  }

  const codiceArticoloFilter = filters.codiceArticoloMG?.trim();
  if (resourceType === "articoli" && codiceArticoloFilter) {
    const direct = await fetchEntityById(baseUrl, ambiente, "Articolo", codiceArticoloFilter, utente, azienda);
    if (!direct) return { data: [] };

    let directRows = [direct];
    directRows = await enrichRows(directRows, resourceType, ambiente, utente, azienda);

    const filtersWithoutCode = { ...filters };
    delete filtersWithoutCode.codiceArticoloMG;
    const { extendedFilters } = buildSearchItems(resourceType, filtersWithoutCode, true);
    if (extendedFilters.length > 0) {
      directRows = applyExtendedLocalFilter(directRows, extendedFilters);
    }
    return { data: directRows };
  }

  const url = new URL(`${baseUrl}/v1/${encodeURIComponent(ambiente)}/${entityName}`);
  url.searchParams.append("_op", "search");
  url.searchParams.append("utente", utente);
  url.searchParams.append("azienda", azienda);

  const { allItems, safeItems, extendedFilters, safeUserItemsCount } = buildSearchItems(
    resourceType,
    filters,
    effectiveExtendedMode
  );

  async function executeSafeFallback(): Promise<Record<string, unknown>[]> {
    // con filtri sicuri espliciti: fallback standard
    if (safeUserItemsCount > 0) {
      const safeResult = await executeSearchCollectRows(url, safeItems, pageNumber, normalizedPageSize);
      if (safeResult.errorStatus) {
        throw new Error(`Errore dal gestionale: ${safeResult.errorStatus} - ${safeResult.errorText ?? ""}`);
      }
      return safeResult.rows;
    }

    // senza filtri sicuri: fallback paginato su batch piccoli (API sensibile al pageSize alto)
    const batchSize = REMOTE_SAFE_PAGE_SIZE;
    const maxPages = 8;
    const fetchedRows: Record<string, unknown>[] = [];

    for (let pageOffset = 0; pageOffset < maxPages; pageOffset++) {
      const currentPage = pageNumber + pageOffset;
      const pagedResponse = await executeSearch(url, safeItems, currentPage, batchSize);
      if (!pagedResponse.ok) {
        const errorText = await pagedResponse.text();
        throw new Error(`Errore dal gestionale: ${pagedResponse.status} - ${errorText}`);
      }

      const payload = await parseJsonSafe(pagedResponse);
      const pageRows = normalizeResponse(payload);
      if (pageRows.length === 0) break;

      fetchedRows.push(...pageRows);
      if (pageRows.length < batchSize) break;
    }

    return mergeDistinctRows(fetchedRows);
  }

  const result = await executeSearchCollectRows(url, allItems, pageNumber, normalizedPageSize);
  let usedFallback = false;
  let rows: Record<string, unknown>[] = [];

  if (result.errorStatus) {
    if (effectiveExtendedMode && extendedFilters.length > 0) {
      rows = await executeSafeFallback();
      usedFallback = true;
    } else {
      throw new Error(`Errore dal gestionale: ${result.errorStatus} - ${result.errorText ?? ""}`);
    }
  } else {
    rows = result.rows;

    // Alcuni endpoint con campi non supportati ritornano 200 + lista vuota (invece di 400):
    // in modalità estesa facciamo fallback anche in questo caso.
    if (effectiveExtendedMode && extendedFilters.length > 0 && rows.length === 0) {
      rows = await executeSafeFallback();
      usedFallback = true;
    }
  }

  rows = await enrichRows(rows, resourceType, ambiente, utente, azienda);

  if (extendedFilters.length > 0) {
      rows = applyExtendedLocalFilter(rows, extendedFilters);
    if (usedFallback && safeUserItemsCount === 0) {
      rows = rows.slice(0, normalizedPageSize);
    }
  }

  return { data: rows };
}

export async function fetchDirectClient(params: DirectClientParams): Promise<ApiResponse> {
  if (!GESTIONALE_API_URL) {
    throw new Error("GESTIONALE_API_URL non configurato");
  }

  const { ambiente, clienteId, utente, azienda } = params;

  const baseUrl = normalizeBaseUrl(GESTIONALE_API_URL);
  const url = new URL(
    `${baseUrl}/v1/${encodeURIComponent(ambiente)}/cliente/${encodeURIComponent(clienteId)}`
  );
  url.searchParams.append("utente", utente);
  url.searchParams.append("azienda", azienda);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Errore dal gestionale: ${response.status} - ${errorText}`);
  }

  const payload = await parseJsonSafe(response);
  return { data: normalizeResponse(payload) };
}

export function getResourceLabel(resourceType: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    clienti: "Clienti",
    fornitori: "Fornitori",
    articoli: "Articoli",
    ordini: "Ordini",
    righeOrdine: "Righe Ordine",
  };
  return labels[resourceType];
}

export function getResourceEntityName(resourceType: ResourceType): string {
  return RESOURCE_ENTITY_MAP[resourceType];
}

export function getResourceSearchFields(resourceType: ResourceType, includeExtended = false): SearchFieldConfig[] {
  const all = RESOURCE_SEARCH_FIELDS[resourceType];
  return includeExtended ? all : all.filter((field) => field.safe);
}

export function getResourceTableColumns(resourceType: ResourceType): TableColumnConfig[] {
  return RESOURCE_TABLE_COLUMNS[resourceType];
}
