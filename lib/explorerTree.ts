import type { ResourceType } from "./api";

export type ExplorerResource = ResourceType;

export type ExplorerNodeType = "folder" | "item";
export type ExplorerBadgeVariant = "info" | "success" | "warning" | "danger" | "neutral";

export interface ExplorerDetailField {
  label: string;
  value: string;
  mono?: boolean;
}

export interface ExplorerTreeNode {
  id: string;
  label: string;
  type: ExplorerNodeType;
  resourceType: ExplorerResource;
  sublabel?: string;
  rightMeta?: string;
  amount?: string;
  badge?: string;
  badgeVariant?: ExplorerBadgeVariant;
  children?: ExplorerTreeNode[];
  data?: Record<string, unknown>;
  details?: ExplorerDetailField[];
}

export interface ResourceStat {
  resourceType: ExplorerResource;
  label: string;
  count: number;
}

export interface ResourceStats {
  total: number;
  items: ResourceStat[];
}

export type DocumentClassKey = "fatture" | "ordini" | "ddt" | "altriDocumenti";

export interface DocumentClassification {
  key: DocumentClassKey;
  label: string;
  itemLabel: string;
}

export interface DocumentDisplayInfo extends DocumentClassification {
  label: string;
  meta: string;
  rightMeta?: string;
  code?: string;
  tipodoc?: string;
}

type AnyRecord = Record<string, unknown>;

const RESOURCE_ORDER: ExplorerResource[] = ["clienti", "fornitori", "articoli", "ordini", "righeOrdine"];

const RESOURCE_LABELS: Record<ExplorerResource, string> = {
  clienti: "Clienti",
  fornitori: "Fornitori",
  articoli: "Articoli",
  ordini: "Ordini",
  righeOrdine: "Righe Ordine",
};

const DOCUMENT_CLASS_ORDER: DocumentClassKey[] = ["fatture", "ordini", "ddt", "altriDocumenti"];

const DOCUMENT_CLASS_INFO: Record<DocumentClassKey, DocumentClassification> = {
  fatture: { key: "fatture", label: "Fatture", itemLabel: "Fattura" },
  ordini: { key: "ordini", label: "Ordini", itemLabel: "Ordine" },
  ddt: { key: "ddt", label: "DDT", itemLabel: "DDT" },
  altriDocumenti: { key: "altriDocumenti", label: "Altri documenti", itemLabel: "Documento" },
};

const CHILD_GROUP_LABELS: Record<string, string> = {
  children: "Elementi",
  documenti: "Documenti",
  docs: "Documenti",
  doc: "Documenti",
  ordini: "Documenti",
  destinatari: "Destinatari",
  righe: "Righe",
  linee: "Righe",
  rows: "Righe",
  dettagli: "Dettagli",
  items: "Elementi",
};

const CHILD_RESOURCE_MAP: Record<string, ExplorerResource | null> = {
  documenti: "ordini",
  docs: "ordini",
  doc: "ordini",
  ordini: "ordini",
  righe: "righeOrdine",
  linee: "righeOrdine",
  rows: "righeOrdine",
  dettagli: "righeOrdine",
};

const DETAIL_FIELD_TEMPLATES: Record<ExplorerResource, Array<{ label: string; paths: string[]; mono?: boolean }>> = {
  clienti: [
    { label: "Codice", paths: ["cliFor", "codice", "id"], mono: true },
    { label: "Ragione sociale", paths: ["ragioneSociale", "anagrafica.ragioneSociale", "denominazione"] },
    { label: "Partita IVA", paths: ["anagrafica.partiva", "partiva", "partitaIva"], mono: true },
    { label: "Codice fiscale", paths: ["anagrafica.codiceFiscale", "codiceFiscale"], mono: true },
    { label: "Citta", paths: ["anagrafica.citta", "citta"] },
    { label: "Email", paths: ["anagrafica.indemail", "email"] },
    { label: "Stato", paths: ["flgAttivo", "stato", "status"] },
  ],
  fornitori: [
    { label: "Codice", paths: ["cliFor", "codice", "id"], mono: true },
    { label: "Ragione sociale", paths: ["ragioneSociale", "anagrafica.ragioneSociale", "denominazione"] },
    { label: "Partita IVA", paths: ["anagrafica.partiva", "partiva", "partitaIva"], mono: true },
    { label: "Codice fiscale", paths: ["anagrafica.codiceFiscale", "codiceFiscale"], mono: true },
    { label: "Citta", paths: ["anagrafica.citta", "citta"] },
    { label: "Email", paths: ["anagrafica.indemail", "email"] },
    { label: "Stato", paths: ["flgAttivo", "stato", "status"] },
  ],
  articoli: [
    { label: "Codice articolo", paths: ["codiceArticoloMG", "codice", "id"], mono: true },
    { label: "Codice interno", paths: ["codinterno", "codiceInterno"], mono: true },
    { label: "Descrizione", paths: ["descrizione", "currentDescription", "datoDescrizione.descart", "datoDescrizione.descartest"] },
    { label: "Ditta", paths: ["ditta", "dittaCg18"], mono: true },
    { label: "Esaurito", paths: ["flgArtesaur", "esaurito"] },
    { label: "Ultimo aggiornamento", paths: ["dtultagganag", "updatedAt"] },
  ],
  ordini: [
    { label: "Numero documento", paths: ["numdoc", "numeroDocumento", "id"], mono: true },
    { label: "NumReg", paths: ["numReg", "numreg"], mono: true },
    { label: "Tipo documento", paths: ["tipodoc", "tipoDocumento"] },
    { label: "Sezionale", paths: ["sezdoc", "sezionale"] },
    { label: "Data", paths: ["datadoc", "data"] },
    { label: "Cliente/Fornitore", paths: ["clienteFornitoreMG.cliFor", "cliforfatt", "cliForDest"] },
    { label: "Ditta", paths: ["ditta"] },
  ],
  righeOrdine: [
    { label: "Riga", paths: ["progrRiga", "riga", "id"], mono: true },
    { label: "Numero registro", paths: ["numReg", "numreg"], mono: true },
    { label: "Codice articolo", paths: ["codartMg66", "codiceArticoloMG", "codiceArticolo"], mono: true },
    { label: "Descrizione", paths: ["descart", "estdescart", "descrizione"] },
    { label: "Quantita", paths: ["qta1", "qta2", "quantita"], mono: true },
    { label: "UM", paths: ["um1", "um2", "um"], mono: true },
    { label: "Prezzo", paths: ["prezzo1", "prezzo2", "prezzo"], mono: true },
    { label: "Totale", paths: ["importo", "costotot", "totale"], mono: true },
  ],
};

export function buildExplorerTree(resourceType: ExplorerResource, rows: unknown[]): ExplorerTreeNode[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  if (resourceType === "ordini") {
    return groupDocumentsByClass(rows as Record<string, unknown>[], "ordini");
  }

  return rows
    .map((row, index) => {
      if (!isRecord(row)) return null;
      return buildRootNode(resourceType, row, index);
    })
    .filter((node): node is ExplorerTreeNode => Boolean(node));
}

export function filterExplorerTree(nodes: ExplorerTreeNode[], query: string): ExplorerTreeNode[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return nodes;

  return nodes
    .map((node) => filterTreeNode(node, normalizedQuery))
    .filter((node): node is ExplorerTreeNode => Boolean(node));
}

export function buildResourceStats(dataByResource: Partial<Record<ExplorerResource, unknown>>): ResourceStats {
  const items = RESOURCE_ORDER.map((resourceType) => {
    const source = dataByResource[resourceType];
    const count = countCollection(source);
    return {
      resourceType,
      label: RESOURCE_LABELS[resourceType],
      count,
    };
  });

  return {
    total: items.reduce((sum, item) => sum + item.count, 0),
    items,
  };
}

export function buildNodeDetails(node: ExplorerTreeNode): ExplorerDetailField[] {
  const existing = uniqueDetails(node.details ?? []);
  if (existing.length > 0) return existing;

  const fields: ExplorerDetailField[] = [];
  const data = node.data ?? {};

  pushField(fields, "ID", node.id, true);
  pushField(fields, "Etichetta", node.label);
  if (node.sublabel) pushField(fields, "Sottoetichetta", node.sublabel);
  if (node.badge) pushField(fields, "Badge", node.badge);
  pushField(fields, "Tipo", node.type);
  pushField(fields, "Risorsa", RESOURCE_LABELS[node.resourceType]);

  const templates = DETAIL_FIELD_TEMPLATES[node.resourceType] ?? [];
  for (const template of templates) {
    pushField(fields, template.label, firstText(data, template.paths), template.mono);
  }

  const nestedCount = node.children?.length ?? 0;
  if (nestedCount > 0) {
    pushField(fields, "Figli", String(nestedCount), true);
  }

  const extraKeys = collectExtraDetailPairs(data, templates);
  for (const entry of extraKeys) {
    pushField(fields, entry.label, entry.value, entry.mono);
  }

  return uniqueDetails(fields);
}

export function classifyDocumentType(tipodoc?: string): DocumentClassification {
  const normalized = normalizeDocumentTypeCode(tipodoc);

  if (!normalized) {
    return DOCUMENT_CLASS_INFO.altriDocumenti;
  }

  if (
    normalized.startsWith("FT") ||
    normalized.startsWith("FA") ||
    normalized.startsWith("FV") ||
    normalized.startsWith("FAT")
  ) {
    return DOCUMENT_CLASS_INFO.fatture;
  }

  if (normalized.startsWith("ORD") || normalized === "OC" || normalized.startsWith("OC")) {
    return DOCUMENT_CLASS_INFO.ordini;
  }

  if (normalized.startsWith("DDT") || normalized === "DE" || normalized.startsWith("DE")) {
    return DOCUMENT_CLASS_INFO.ddt;
  }

  return DOCUMENT_CLASS_INFO.altriDocumenti;
}

export function describeDocumentType(tipodoc?: string): string {
  return classifyDocumentType(tipodoc).label;
}

export function formatDocumentDisplay(row: AnyRecord): DocumentDisplayInfo {
  const tipodoc = firstText(row, ["tipodoc", "tipoDocumento", "docType", "tipo_doc"]);
  const sezdoc = firstText(row, ["sezdoc", "sezionale", "sezione"]);
  const numdoc = firstText(row, ["numdoc", "numeroDocumento", "numero", "docNumber"]);
  const numReg = firstText(row, ["numReg", "numreg", "registro"]);
  const datadoc = firstText(row, ["datadoc", "data", "documentDate"]);
  const cliFor = firstText(row, ["cliforfatt", "cliForDest", "clienteFornitoreMG.cliFor"]);
  const amount = formatAmount(row);

  const classification = classifyDocumentType(tipodoc ?? undefined);
  const code = buildDocumentCode(tipodoc ?? undefined, sezdoc ?? undefined, numdoc ?? undefined, numReg ?? undefined);
  const label = buildDocumentLabel(classification, code);
  const metaParts = [
    datadoc ? `Data ${datadoc}` : null,
    cliFor ? `Cliente/Fornitore ${cliFor}` : null,
    numReg ? `Registro ${numReg}` : null,
  ].filter(Boolean) as string[];
  const meta = metaParts.join(" | ");
  const rightMeta = amount ?? numReg ?? datadoc ?? undefined;

  return {
    ...classification,
    label,
    meta,
    rightMeta,
    code,
    tipodoc: tipodoc ?? undefined,
  };
}

export function groupDocumentsByClass(rows: Record<string, unknown>[], parentId: string): ExplorerTreeNode[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const buckets = new Map<DocumentClassKey, ExplorerTreeNode[]>();

  for (const key of DOCUMENT_CLASS_ORDER) {
    buckets.set(key, []);
  }

  rows.forEach((row, index) => {
    if (!isRecord(row)) return;

    const display = formatDocumentDisplay(row);
    const childId = buildDocumentIdentity(parentId, display, row, index);
    const childNode: ExplorerTreeNode = {
      id: childId,
      label: display.label,
      type: "item",
      resourceType: "ordini",
      sublabel: display.meta || undefined,
      rightMeta: display.rightMeta,
      badge: display.tipodoc,
      badgeVariant: "info",
      data: row,
      details: buildDocumentDetails(row, display),
    };

    const bucket = buckets.get(display.key);
    bucket?.push(childNode);
  });

  return DOCUMENT_CLASS_ORDER.reduce<ExplorerTreeNode[]>((output, key) => {
    const children = buckets.get(key) ?? [];
    if (children.length === 0) return output;

    const classification = DOCUMENT_CLASS_INFO[key];
    output.push({
      id: `${parentId}:${key}`,
      label: classification.label,
      type: "folder",
      resourceType: "ordini",
      badge: String(children.length),
      badgeVariant: "info",
      children,
      data: {
        classKey: key,
        classLabel: classification.label,
        count: children.length,
      },
    });

    return output;
  }, []);
}

function buildRootNode(resourceType: ExplorerResource, row: AnyRecord, index: number): ExplorerTreeNode | null {
  const code = getResourceCode(resourceType, row) ?? fallbackId(resourceType, index);
  const label = getResourceLabel(resourceType, row, code);
  const sublabel = getResourceSublabel(resourceType, row, code);
  const badge = getResourceBadge(resourceType, row);
  const badgeVariant = getResourceBadgeVariant(badge);
  const children = buildNestedChildren(resourceType, row, `${resourceType}:${code}`);

  return {
    id: `${resourceType}:${code}`,
    label,
    type: children.length > 0 ? "folder" : "item",
    resourceType,
    sublabel,
    badge,
    badgeVariant,
    children: children.length > 0 ? children : undefined,
    data: row,
  };
}

function buildNestedChildren(
  resourceType: ExplorerResource,
  row: AnyRecord,
  parentId: string
): ExplorerTreeNode[] {
  const nodes: ExplorerTreeNode[] = [];
  const seenKeys = new Set<string>();

  for (const key of Object.keys(row)) {
    const value = row[key];
    if (!Array.isArray(value) || value.length === 0) continue;
    if (!value.some(isRecord)) continue;
    if (seenKeys.has(key)) continue;

    const label = CHILD_GROUP_LABELS[key.toLowerCase()] ?? titleCase(key);
    const childResourceType = CHILD_RESOURCE_MAP[key.toLowerCase()] ?? resourceType;
    const childNodes = value
      .map((item, index) => {
        if (!isRecord(item)) return null;
        return buildNestedNode(childResourceType, item, `${parentId}:${key}:${index}`, key);
      })
      .filter((node): node is ExplorerTreeNode => Boolean(node));

    if (childNodes.length === 0) continue;
    seenKeys.add(key);

    nodes.push({
      id: `${parentId}:${key}`,
      label,
      type: "folder",
      resourceType: childResourceType,
      badge: String(childNodes.length),
      badgeVariant: "info",
      children: childNodes,
      data: {
        group: key,
        count: childNodes.length,
      },
    });
  }

  return nodes;
}

function buildNestedNode(
  resourceType: ExplorerResource,
  row: AnyRecord,
  id: string,
  groupKey?: string
): ExplorerTreeNode {
  const code = getResourceCode(resourceType, row) ?? fallbackId(resourceType, 0);
  const label = getResourceLabel(resourceType, row, code, groupKey);
  const sublabel = getResourceSublabel(resourceType, row, code, groupKey);
  const badge = getResourceBadge(resourceType, row);
  const badgeVariant = getResourceBadgeVariant(badge);
  const children = buildNestedChildren(resourceType, row, id);
  const nodeType: ExplorerNodeType = children.length > 0 ? "folder" : "item";

  return {
    id,
    label,
    type: nodeType,
    resourceType,
    sublabel,
    badge,
    badgeVariant,
    children: children.length > 0 ? children : undefined,
    data: row,
  };
}

function buildDocumentDetails(row: AnyRecord, display: DocumentDisplayInfo): ExplorerDetailField[] {
  const fields: ExplorerDetailField[] = [];
  pushField(fields, "Classificazione", display.label);
  pushField(fields, "Codice", display.code);
  pushField(fields, "Tipo documento", display.itemLabel);
  pushField(fields, "Tipo origine", display.tipodoc);
  pushField(fields, "Data", firstText(row, ["datadoc", "data", "documentDate"]));
  pushField(fields, "Registro", firstText(row, ["numReg", "numreg", "registro"]), true);
  pushField(fields, "Sezionale", firstText(row, ["sezdoc", "sezionale"]));
  pushField(fields, "Numero", firstText(row, ["numdoc", "numeroDocumento", "numero"]), true);
  pushField(fields, "Cliente/Fornitore", firstText(row, ["cliforfatt", "cliForDest", "clienteFornitoreMG.cliFor"]));
  pushField(fields, "Importo", formatAmount(row));
  return uniqueDetails(fields);
}

function filterTreeNode(node: ExplorerTreeNode, query: string): ExplorerTreeNode | null {
  const selfMatches = nodeMatchesQuery(node, query);
  const filteredChildren = (node.children ?? [])
    .map((child) => filterTreeNode(child, query))
    .filter((child): child is ExplorerTreeNode => Boolean(child));

  if (selfMatches) {
    return {
      ...node,
      children: node.children?.length ? node.children : undefined,
    };
  }

  if (filteredChildren.length === 0) return null;

  return {
    ...node,
    children: filteredChildren,
  };
}

function nodeMatchesQuery(node: ExplorerTreeNode, query: string): boolean {
  const haystacks = [node.id, node.label, node.sublabel ?? "", node.badge ?? "", node.resourceType];
  const dataBlob = safeStringify(node.data);
  if (dataBlob) haystacks.push(dataBlob);
  if (node.details?.length) {
    for (const detail of node.details) {
      haystacks.push(detail.label, detail.value);
    }
  }

  return haystacks.some((value) => value.toLowerCase().includes(query));
}

function getResourceCode(resourceType: ExplorerResource, row: AnyRecord): string | null {
  const candidates: Record<ExplorerResource, string[][]> = {
    clienti: [["cliFor"], ["codice"], ["id"]],
    fornitori: [["cliFor"], ["codice"], ["id"]],
    articoli: [["codiceArticoloMG"], ["codice"], ["id"]],
    ordini: [["numdoc"], ["numReg"], ["id"]],
    righeOrdine: [["progrRiga"], ["numReg"], ["codartMg66"], ["id"]],
  };

  for (const paths of candidates[resourceType]) {
    const value = firstText(row, paths);
    if (value) return value;
  }

  return null;
}

function getResourceLabel(
  resourceType: ExplorerResource,
  row: AnyRecord,
  code: string,
  groupKey?: string
): string {
  switch (resourceType) {
    case "clienti":
    case "fornitori": {
      const name =
        firstText(row, [
          "ragioneSociale",
          "denominazione",
          "nome",
          "anagrafica.ragioneSociale",
          "anagrafica.denominazione",
        ]) ?? "";
      if (name) return name;
      return code;
    }
    case "articoli": {
      const description = firstText(row, [
        "descrizione",
        "currentDescription",
        "datoDescrizione.descart",
        "datoDescrizione.descartest",
      ]);
      if (description) return code ? `${code} - ${description}` : description;
      return code;
    }
    case "ordini": {
      const doc = formatDocumentDisplay(row);
      if (doc.label) return doc.label;
      if (groupKey && groupKey !== "children") return `${titleCase(groupKey)} ${code}`.trim();
      return code;
    }
    case "righeOrdine": {
      const desc = firstText(row, ["descart", "descrizione", "estdescart"]);
      const article = firstText(row, ["codartMg66", "codiceArticoloMG", "codiceArticolo"]);
      if (desc && article) return `${article} - ${desc}`;
      if (desc) return desc;
      if (article) return article;
      return code;
    }
    default:
      return code;
  }
}

function getResourceSublabel(
  resourceType: ExplorerResource,
  row: AnyRecord,
  code: string,
  groupKey?: string
): string | undefined {
  switch (resourceType) {
    case "clienti":
    case "fornitori": {
      return code;
    }
    case "articoli":
      return firstText(row, ["codinterno", "ditta", "dittaCg18"]) ?? code;
    case "ordini": {
      const display = formatDocumentDisplay(row);
      if (display.meta) return display.meta;
      if (groupKey && groupKey !== "children") return titleCase(groupKey);
      return code;
    }
    case "righeOrdine":
      return firstText(row, ["qta1", "qta2", "quantita"]) ?? firstText(row, ["um1", "um2", "um"]) ?? undefined;
    default:
      return code;
  }
}

function getResourceBadge(resourceType: ExplorerResource, row: AnyRecord): string | undefined {
  switch (resourceType) {
    case "clienti":
    case "fornitori":
      return getStatusLabel(row) ?? undefined;
    case "articoli":
      return firstText(row, ["flgArtesaur", "esaurito"]) ?? undefined;
    case "ordini":
      return classifyDocumentType(firstText(row, ["tipodoc", "tipoDocumento"]) ?? undefined).label;
    case "righeOrdine":
      return undefined;
    default:
      return undefined;
  }
}

function getResourceBadgeVariant(badge: string | undefined): ExplorerBadgeVariant {
  if (!badge) return "neutral";

  const normalized = badge.toLowerCase();
  if (["attivo", "active", "sospeso", "inattivo", "non attivo", "ok", "yes", "1"].includes(normalized)) {
    return normalized === "sospeso" || normalized === "inattivo" || normalized === "non attivo"
      ? "warning"
      : "success";
  }

  if (/^\d+$/.test(normalized)) return "info";
  return "neutral";
}

function getStatusLabel(row: AnyRecord): string | undefined {
  const raw = firstText(row, ["flgAttivo", "status", "stato", "attivo"]);
  if (!raw) return undefined;

  const normalized = raw.toLowerCase();
  if (["1", "true", "yes", "attivo", "active"].includes(normalized)) return "Attivo";
  if (["0", "false", "no", "sospeso", "inattivo", "inactive"].includes(normalized)) return "Sospeso";
  return raw;
}

function countCollection(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (!isRecord(value)) return 0;

  for (const key of ["data", "items", "rows", "value", "results"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested.length;
  }

  return 0;
}

function buildDocumentIdentity(
  parentId: string,
  display: DocumentDisplayInfo,
  row: AnyRecord,
  index: number
): string {
  const base = display.code || display.tipodoc || firstText(row, ["numReg", "numdoc", "numeroDocumento"]);
  return `${parentId}:${display.key}:${base ?? index + 1}:${index}`;
}

function buildDocumentCode(
  tipodoc?: string,
  sezdoc?: string,
  numdoc?: string,
  numReg?: string
): string | undefined {
  const parts = [tipodoc, sezdoc, numdoc].filter(Boolean) as string[];
  if (parts.length > 0) {
    return parts.join("/");
  }

  if (numReg) return numReg;
  return undefined;
}

function buildDocumentLabel(classification: DocumentClassification, code?: string): string {
  if (!code) return classification.label;
  return `${classification.itemLabel} ${code}`;
}

function formatAmount(row: AnyRecord): string | undefined {
  const raw = firstText(row, ["importo", "costotot", "totale", "amount"]);
  if (!raw) return undefined;

  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return raw;

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeDocumentTypeCode(value?: string): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function firstText(source: AnyRecord, paths: string[]): string | null {
  for (const path of paths) {
    const value = getValueByPath(source, path);
    const text = toText(value);
    if (text) return text;
  }
  return null;
}

function getValueByPath(source: AnyRecord, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }

  return current;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (value instanceof Date) return value.toISOString();
  return String(value).trim() || null;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fallbackId(resourceType: ExplorerResource, index: number): string {
  return `${resourceType}-${index + 1}`;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pushField(fields: ExplorerDetailField[], label: string, value: string | null | undefined, mono = false): void {
  const text = toText(value);
  if (!text) return;
  fields.push({ label, value: text, mono });
}

function uniqueDetails(fields: ExplorerDetailField[]): ExplorerDetailField[] {
  const seen = new Set<string>();
  const output: ExplorerDetailField[] = [];

  for (const field of fields) {
    const key = `${field.label}::${field.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(field);
  }

  return output;
}

function collectExtraDetailPairs(
  data: AnyRecord,
  templates: Array<{ label: string; paths: string[]; mono?: boolean }>
): ExplorerDetailField[] {
  const usedPaths = new Set(templates.flatMap((template) => template.paths));
  const pairs: ExplorerDetailField[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (usedPaths.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) continue;
    if (isRecord(value)) continue;

    const text = toText(value);
    if (!text) continue;

    const label = titleCase(key);
    pairs.push({
      label,
      value: text,
      mono: typeof value === "number" || typeof value === "boolean" || /^\d+([.,]\d+)?$/.test(text),
    });
  }

  return pairs;
}
