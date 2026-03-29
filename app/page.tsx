"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ResourceType } from "@/lib/api";
import {
  buildExplorerTree,
  classifyDocumentType,
  buildNodeDetails,
  buildResourceStats,
  groupDocumentsByClass,
  type ExplorerBadgeVariant,
  type ExplorerTreeNode,
} from "@/lib/explorerTree";
import { ResourceSidebar } from "@/components/explorer/ResourceSidebar";
import { TreeExplorer } from "@/components/explorer/TreeExplorer";
import { DetailPanel } from "@/components/explorer/DetailPanel";
import type { DetailField, ExplorerResource, ExplorerStatus, TreeNode } from "@/components/explorer/types";

type MainResource = "clienti" | "fornitori" | "articoli" | "ordini";
type Row = Record<string, unknown>;
type DataByResource = Partial<Record<MainResource, Row[]>>;
type PartyNameIndex = {
  clienti: Map<string, string>;
  fornitori: Map<string, string>;
};

interface SearchContext {
  ambiente: string;
  utente: string;
  azienda: string;
  pageSize: number;
  maxPages: number;
}

const DEFAULT_CONTEXT: SearchContext = {
  ambiente: "1",
  utente: "TeamSa",
  azienda: "1",
  pageSize: 100,
  maxPages: 1000,
};

const RESOURCE_META: Record<MainResource, { title: string; description: string; searchPlaceholder: string }> = {
  clienti: {
    title: "Clienti",
    description: "Anagrafiche clienti con documenti e destinatari",
    searchPlaceholder: "Cerca in clienti...",
  },
  fornitori: {
    title: "Fornitori",
    description: "Anagrafiche fornitori e documenti di acquisto",
    searchPlaceholder: "Cerca in fornitori...",
  },
  articoli: {
    title: "Articoli",
    description: "Catalogo articoli con descrizioni e codici",
    searchPlaceholder: "Cerca in articoli...",
  },
  ordini: {
    title: "Ordini",
    description: "Documenti classificati per tipologia",
    searchPlaceholder: "Cerca in ordini...",
  },
};

function buildSearchFilters(resource: MainResource, rawQuery: string): Record<string, string> {
  const query = rawQuery.trim();
  if (!query) return {};

  const isNumeric = /^\d+$/.test(query);

  if (resource === "clienti" || resource === "fornitori") {
    if (isNumeric) return { cliFor: query };
    return { nome: query };
  }

  if (resource === "articoli") {
    if (/^[a-zA-Z0-9._/-]+$/.test(query) && query.length >= 3) {
      return { codiceArticoloMG: query };
    }
    return { descrizione: query };
  }

  if (resource === "ordini") {
    if (isNumeric) return { numdoc: query };
    return { tipodoc: query };
  }

  return {};
}

function asText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function isInvoiceNode(node: TreeNode | null): boolean {
  if (!node || !node.raw || typeof node.raw !== "object") return false;
  const raw = node.raw as Row;
  const tipodoc = asText(getByPath(raw, "tipodoc")) ?? asText(getByPath(raw, "tipoDocumento"));
  const typeInfo = classifyDocumentType(tipodoc);
  return typeInfo.key === "fatture";
}

function isOrderNode(node: TreeNode | null): boolean {
  if (!node || !node.raw || typeof node.raw !== "object") return false;
  const raw = node.raw as Row;
  const tipodoc = asText(getByPath(raw, "tipodoc")) ?? asText(getByPath(raw, "tipoDocumento"));
  const typeInfo = classifyDocumentType(tipodoc);
  return typeInfo.key === "ordini";
}

function isDdtNode(node: TreeNode | null): boolean {
  if (!node || !node.raw || typeof node.raw !== "object") return false;
  const raw = node.raw as Row;
  const tipodoc = asText(getByPath(raw, "tipodoc")) ?? asText(getByPath(raw, "tipoDocumento"));
  const typeInfo = classifyDocumentType(tipodoc);
  return typeInfo.key === "ddt";
}

function getNodeNumReg(node: TreeNode | null): string | undefined {
  if (!node || !node.raw || typeof node.raw !== "object") return undefined;
  const raw = node.raw as Row;
  return asText(getByPath(raw, "numReg")) ?? asText(getByPath(raw, "numreg"));
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

async function parseJsonOrText<T>(response: Response): Promise<T | string | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
}

function formatCode(prefix: "CLI" | "FOR", value?: string): string | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return `${prefix}-${String(numeric).padStart(3, "0")}`;
  return `${prefix}-${value}`;
}

function toDisplayDate(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return trimmed;
  return new Intl.DateTimeFormat("it-IT").format(new Date(parsed));
}

function statusFromRow(row: Row): { text?: string; tone?: ExplorerStatus } {
  const raw = asText(getByPath(row, "flgAttivo")) ?? asText(getByPath(row, "status"));
  if (!raw) return {};
  const normalized = raw.toLowerCase();
  if (["1", "true", "attivo", "active"].includes(normalized)) {
    return { text: "Attivo", tone: "active" };
  }
  return { text: "Sospeso", tone: "warning" };
}

function badgeToneToStatusTone(variant?: ExplorerBadgeVariant): ExplorerStatus {
  switch (variant) {
    case "success":
      return "active";
    case "warning":
      return "warning";
    case "danger":
      return "error";
    default:
      return "neutral";
  }
}

function mapLibNode(node: ExplorerTreeNode): TreeNode {
  const isNumericBadge = !!node.badge && /^\d+$/.test(node.badge);
  return {
    id: node.id,
    label: node.label,
    sublabel: node.sublabel,
    rightMeta: node.rightMeta,
    amount: node.amount,
    status: !isNumericBadge ? node.badge : undefined,
    statusTone: !isNumericBadge ? badgeToneToStatusTone(node.badgeVariant) : undefined,
    badge: isNumericBadge ? node.badge : undefined,
    badgeTone: isNumericBadge ? "neutral" : undefined,
    count: node.children?.length,
    raw: node.data,
    children: node.children?.map(mapLibNode),
  };
}

function mapLibNodes(nodes: ExplorerTreeNode[]): TreeNode[] {
  return nodes.map(mapLibNode);
}

function normalizePartyCode(value?: string): string {
  if (!value) return "";
  const stripped = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return stripped.replace(/^0+/, "") || stripped;
}

function getInitialDocumentClassFolders(parentId: string): TreeNode[] {
  const makePlaceholder = (folderId: string): TreeNode => ({
    id: `${folderId}:placeholder`,
    label: "Nessun documento locale ancora disponibile",
    sublabel: "Sincronizza per caricare i documenti",
    badge: "0",
    badgeTone: "neutral",
    children: [],
  });

  return [
    {
      id: `${parentId}:fatture`,
      label: "Fatture",
      badge: "0",
      badgeTone: "neutral",
      children: [makePlaceholder(`${parentId}:fatture`)],
    },
    {
      id: `${parentId}:ordini`,
      label: "Ordini",
      badge: "0",
      badgeTone: "neutral",
      children: [makePlaceholder(`${parentId}:ordini`)],
    },
    {
      id: `${parentId}:ddt`,
      label: "DDT",
      badge: "0",
      badgeTone: "neutral",
      children: [makePlaceholder(`${parentId}:ddt`)],
    },
    {
      id: `${parentId}:altriDocumenti`,
      label: "Altri documenti",
      badge: "0",
      badgeTone: "neutral",
      children: [makePlaceholder(`${parentId}:altriDocumenti`)],
    },
  ];
}

function filterDocsByOwner(rows: Row[], ownerCode: string): Row[] {
  const wanted = normalizePartyCode(ownerCode);
  if (!wanted) return rows;

  return rows.filter((row) => {
    const candidates = [
      asText(getByPath(row, "cliforfatt")),
      asText(getByPath(row, "cliForDest")),
      asText(getByPath(row, "clienteFornitoreMG.cliFor")),
    ].filter(Boolean) as string[];

    return candidates.some((candidate) => normalizePartyCode(candidate) === wanted);
  });
}

function mapPartyNodes(resource: "clienti" | "fornitori", rows: Row[]): TreeNode[] {
  const prefix = resource === "clienti" ? "CLI" : "FOR";

  return rows.map((row, index) => {
    const cliFor = asText(getByPath(row, "cliFor")) ?? String(index + 1);
    const label =
      asText(getByPath(row, "anagrafica.ragioneSociale")) ??
      asText(getByPath(row, "ragioneSociale")) ??
      `${resource === "clienti" ? "Cliente" : "Fornitore"} ${cliFor}`;

    const code = formatCode(prefix, cliFor);
    const state = statusFromRow(row);
    const piva = asText(getByPath(row, "anagrafica.partiva")) ?? asText(getByPath(row, "partiva"));
    const citta = asText(getByPath(row, "anagrafica.citta")) ?? asText(getByPath(row, "citta"));
    const destinatariRaw = (getByPath(row, "destinatari") ?? getByPath(row, "anagrafica.destinatari")) as unknown;
    const destinatari = Array.isArray(destinatariRaw) ? destinatariRaw : [];
    const secondary = [piva ? `P.IVA ${piva}` : undefined, citta].filter(Boolean).join(" | ");

    return {
      id: `${resource}:${cliFor}`,
      label,
      sublabel: secondary || undefined,
      rightMeta: code,
      status: state.text,
      statusTone: state.tone ?? "neutral",
      raw: {
        ...row,
        ownerLabel: label,
        ownerCode: cliFor,
      },
      children: [
        {
          id: `${resource}:${cliFor}:documenti`,
          label: "Documenti",
          sublabel: "Fatture, ordini, DDT e altri documenti",
          badge: "0",
          badgeTone: "neutral",
          raw: {
            section: "Documenti",
            ownerLabel: label,
            ownerCode: cliFor,
          },
          children: getInitialDocumentClassFolders(`${resource}:${cliFor}:documenti`),
        },
        {
          id: `${resource}:${cliFor}:destinatari`,
          label: "Destinatari",
          sublabel: "Indirizzi e riferimenti associati",
          badge: String(destinatari.length),
          badgeTone: "neutral",
          raw: {
            section: "Destinatari",
            ownerLabel: label,
            ownerCode: cliFor,
            destinatari,
          },
          children: [],
        },
      ],
    };
  });
}

function mapArticleNodes(rows: Row[]): TreeNode[] {
  return rows.map((row, index) => {
    const code = asText(getByPath(row, "codiceArticoloMG")) ?? `ART-${index + 1}`;
    const description =
      asText(getByPath(row, "descrizione")) ??
      asText(getByPath(row, "currentDescription")) ??
      asText(getByPath(row, "datoDescrizione.descart")) ??
      "Articolo";
    const ditta = asText(getByPath(row, "ditta")) ?? asText(getByPath(row, "dittaCg18"));
    const esaurito = asText(getByPath(row, "flgArtesaur")) === "1";

    return {
      id: `articoli:${code}:${index}`,
      label: description,
      sublabel: [ditta ? `Ditta ${ditta}` : undefined, esaurito ? "Esaurito" : "Disponibile"]
        .filter(Boolean)
        .join(" | "),
      rightMeta: code,
      status: esaurito ? "Esaurito" : "Disponibile",
      statusTone: esaurito ? "warning" : "active",
      raw: row,
      children: [],
    };
  });
}

function normalizeDocumentNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((node) => ({
    ...node,
    sublabel: node.sublabel
      ?.replace(/Data ([^|]+)\s*\|/, (_, datePart: string) => {
        const formatted = toDisplayDate(datePart.trim()) ?? datePart.trim();
        return `Data ${formatted} |`;
      })
      .replace(/\|\s*$/, "")
      .trim(),
    children: node.children ? normalizeDocumentNodes(node.children) : undefined,
  }));
}

function resolvePartyCode(row: Row): string | undefined {
  return (
    asText(getByPath(row, "cliforfatt")) ??
    asText(getByPath(row, "cliForDest")) ??
    asText(getByPath(row, "clienteFornitoreMG.cliFor"))
  );
}

function resolvePartyName(row: Row): string | undefined {
  return (
    asText(getByPath(row, "anagrafica.ragioneSociale")) ??
    asText(getByPath(row, "ragioneSociale")) ??
    asText(getByPath(row, "denominazione")) ??
    asText(getByPath(row, "nome"))
  );
}

function buildPartyNameIndex(dataByResource: DataByResource): PartyNameIndex {
  const clienti = new Map<string, string>();
  const fornitori = new Map<string, string>();

  const addFromRows = (rows: Row[] | undefined, target: Map<string, string>) => {
    if (!rows?.length) return;
    for (const row of rows) {
      const name = resolvePartyName(row);
      if (!name) continue;
      const codeCandidates = [
        asText(getByPath(row, "cliFor")),
        asText(getByPath(row, "clienteFornitoreMG.cliFor")),
      ];
      for (const candidate of codeCandidates) {
        const key = normalizePartyCode(candidate);
        if (!key) continue;
        if (!target.has(key)) {
          target.set(key, name);
        }
      }
    }
  };

  addFromRows(dataByResource.clienti, clienti);
  addFromRows(dataByResource.fornitori, fornitori);
  return { clienti, fornitori };
}

function resolvePartyNameForContext(
  partyNameIndex: PartyNameIndex,
  normalizedCode: string,
  context: MainResource
): string | undefined {
  const customerName = partyNameIndex.clienti.get(normalizedCode);
  const supplierName = partyNameIndex.fornitori.get(normalizedCode);

  if (context === "fornitori") {
    return supplierName ?? customerName;
  }
  if (context === "clienti") {
    return customerName ?? supplierName;
  }
  if (customerName && supplierName && customerName !== supplierName) {
    return `${customerName} / ${supplierName}`;
  }
  return customerName ?? supplierName;
}

function enrichDocumentNodesWithPartyName(
  nodes: TreeNode[],
  partyNameIndex: PartyNameIndex,
  context: MainResource
): TreeNode[] {
  return nodes.map((node) => {
    const raw = (node.raw ?? {}) as Row;
    const code = resolvePartyCode(raw);
    const normalizedCode = normalizePartyCode(code);
    const partyName = normalizedCode ? resolvePartyNameForContext(partyNameIndex, normalizedCode, context) : undefined;

    let sublabel = node.sublabel;
    if (partyName && sublabel) {
      sublabel = sublabel.replace(
        /(Cliente\/Fornitore\s+[^|()]+)(?:\s*\([^)]*\))?/i,
        (_segment, base) => `${base} (${partyName})`
      );
    }

    return {
      ...node,
      sublabel,
      children: node.children ? enrichDocumentNodesWithPartyName(node.children, partyNameIndex, context) : undefined,
    };
  });
}

function collectExpandableIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      ids.push(node.id, ...collectExpandableIds(node.children));
    }
  }
  return ids;
}

function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function patchNode(nodes: TreeNode[], targetId: string, update: (node: TreeNode) => TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) return update(node);
    if (!node.children?.length) return node;
    return { ...node, children: patchNode(node.children, targetId, update) };
  });
}

function nodeToDetails(node: TreeNode, resourceType: ResourceType): DetailField[] {
  const raw = (node.raw ?? {}) as Row;
  const libNode: ExplorerTreeNode = {
    id: node.id,
    label: node.label,
    type: node.children?.length ? "folder" : "item",
    resourceType,
    sublabel: node.sublabel,
    badge: node.badge ?? node.status,
    data: raw,
  };

  return buildNodeDetails(libNode).map((field) => ({
    label: field.label,
    value: field.value,
    mono: field.mono,
    tone: "default",
  }));
}

async function fetchLocalRows(body: {
  ambiente: string;
  utente: string;
  azienda: string;
  resourceType: ResourceType;
  filters: Record<string, string>;
  pageSize: number;
  extendedMode: boolean;
  pageNumber?: number;
}): Promise<Row[]> {
  const params = new URLSearchParams();
  params.set("ambiente", body.ambiente);
  params.set("utente", body.utente);
  params.set("azienda", body.azienda);
  params.set("pageSize", String(body.pageSize));
  params.set("extendedMode", body.extendedMode ? "true" : "false");
  if (typeof body.pageNumber === "number") {
    params.set("pageNumber", String(body.pageNumber));
  }

  Object.entries(body.filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  });

  const response = await fetch(`/api/local/${body.resourceType}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const payload = await parseJsonOrText<Row[] | { data?: Row[]; error?: string }>(response);
  if (!response.ok) {
    const error =
      typeof payload === "string"
        ? payload
        : payload && typeof payload === "object" && !Array.isArray(payload)
          ? payload.error
          : undefined;
    throw new Error(error || `Errore: ${response.statusText}`);
  }

  if (Array.isArray(payload)) return payload;
  if (typeof payload === "string") throw new Error(payload);
  return payload?.data ?? [];
}

async function fetchAllPages(
  baseBody: {
    ambiente: string;
    utente: string;
    azienda: string;
    resourceType: ResourceType;
    filters: Record<string, string>;
    pageSize: number;
    extendedMode: boolean;
  },
  maxPages: number
): Promise<Row[]> {
  const all: Row[] = [];
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
    const page = await fetchLocalRows({ ...baseBody, pageNumber });
    if (page.length === 0) break;
    all.push(...page);
    if (page.length < baseBody.pageSize) break;
  }
  return all;
}

async function fetchLocalMeta(): Promise<{ lastSyncedAt?: string; message?: string }> {
  const response = await fetch("/api/local/meta", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = await parseJsonOrText<
    { data?: { lastSyncedAt?: string; message?: string } } | { lastSyncedAt?: string; message?: string }
  >(response);
  if (!response.ok) {
    throw new Error(response.statusText || "Errore nel recupero dei metadati locali");
  }

  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data;
  }
  return (payload && typeof payload === "object" ? payload : {}) as { lastSyncedAt?: string; message?: string };
}

export default function Home() {
  const router = useRouter();
  const [searchContext] = useState<SearchContext>(DEFAULT_CONTEXT);
  const [activeResource, setActiveResource] = useState<MainResource>("clienti");
  const [dataByResource, setDataByResource] = useState<DataByResource>({});
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadedDocumentsFor, setLoadedDocumentsFor] = useState<string[]>([]);
  const [loadedDestinatariFor, setLoadedDestinatariFor] = useState<string[]>([]);
  const [loadedRowsFor, setLoadedRowsFor] = useState<string[]>([]);
  const partyNameByCode = useMemo(() => buildPartyNameIndex(dataByResource), [dataByResource]);

  const activeMeta = RESOURCE_META[activeResource];

  const sidebarResources: ExplorerResource[] = useMemo(() => {
    const stats = buildResourceStats({
      clienti: dataByResource.clienti,
      fornitori: dataByResource.fornitori,
      articoli: dataByResource.articoli,
      ordini: dataByResource.ordini,
    });

    return ["clienti", "fornitori", "articoli", "ordini"].map((resource) => {
      const stat = stats.items.find((item) => item.resourceType === resource);
      return {
        id: resource,
        label: RESOURCE_META[resource as MainResource].title,
        count: stat?.count ?? 0,
        status: resource === activeResource ? "Focus" : undefined,
        statusTone: resource === activeResource ? "active" : "neutral",
      };
    });
  }, [activeResource, dataByResource]);

  const loadOverview = useCallback(async () => {
    const overviewResources: MainResource[] = ["clienti", "fornitori", "articoli", "ordini"];
    const settled = await Promise.allSettled(
      overviewResources.map(async (resource) => {
        const rows = await fetchLocalRows({
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: resource,
          filters: {},
          pageSize: Math.max(searchContext.pageSize, 5000),
          extendedMode: false,
        });
        return [resource, rows] as const;
      })
    );

    const nextData: DataByResource = {};
    settled.forEach((item) => {
      if (item.status === "fulfilled") {
        const [resource, rows] = item.value;
        nextData[resource] = rows;
      }
    });

    setDataByResource((prev) => ({ ...prev, ...nextData }));
  }, [searchContext]);

  const refreshSyncMeta = useCallback(async () => {
    try {
      const meta = await fetchLocalMeta();
      if (meta.lastSyncedAt) setLastSyncedAt(meta.lastSyncedAt);
      if (meta.message) setSyncMessage(meta.message);
    } catch {
      // Non blocchiamo l'app se i metadati non sono disponibili.
    }
  }, []);

  const loadResource = useCallback(
    async (resource: MainResource, filters: Record<string, string> = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const rows = await fetchLocalRows({
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: resource,
          filters,
          pageSize: Math.max(searchContext.pageSize, 300),
          extendedMode: true,
        });
        const effectiveRows =
          rows.length > 0 || Object.keys(filters).length > 0
            ? rows
            : (dataByResource[resource] ?? []);

        const mappedNodes =
          resource === "clienti" || resource === "fornitori"
            ? mapPartyNodes(resource, effectiveRows)
            : resource === "articoli"
              ? mapArticleNodes(effectiveRows)
            : resource === "ordini"
              ? enrichDocumentNodesWithPartyName(
                  normalizeDocumentNodes(mapLibNodes(buildExplorerTree(resource, effectiveRows))),
                  partyNameByCode,
                  resource
                )
              : mapLibNodes(buildExplorerTree(resource, effectiveRows));

        setTreeNodes(mappedNodes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
        setTreeNodes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [dataByResource, partyNameByCode, searchContext]
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview, refreshTick]);

  useEffect(() => {
    void refreshSyncMeta();
  }, [refreshSyncMeta]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSelectedNodeId(null);
      setSelectedNode(null);
      setLoadedDocumentsFor([]);
      setLoadedDestinatariFor([]);
      setLoadedRowsFor([]);
      void loadResource(activeResource, buildSearchFilters(activeResource, searchQuery));
    }, 350);

    return () => clearTimeout(timeout);
  }, [activeResource, loadResource, refreshTick, searchQuery]);

  const enrichNodeOnDemand = useCallback(
    async (node: TreeNode) => {
      const raw = (node.raw ?? {}) as Row;
      const isPartyResource = activeResource === "clienti" || activeResource === "fornitori";
      const isPartyRoot = node.id.split(":").length === 2;
      const isDocumentsGroup = node.id.endsWith(":documenti");
      const isDestinatariGroup = node.id.endsWith(":destinatari");
      const partyRootId =
        isDocumentsGroup || isDestinatariGroup
          ? node.id.split(":").slice(0, 2).join(":")
          : node.id;

      if (isPartyResource && (isPartyRoot || isDocumentsGroup) && !loadedDocumentsFor.includes(partyRootId)) {
        const ownerLabel =
          asText(getByPath(raw, "ownerLabel")) ??
          asText(getByPath(raw, "anagrafica.ragioneSociale")) ??
          asText(getByPath(raw, "ragioneSociale")) ??
          node.label;

        const ownerCode =
          asText(getByPath(raw, "ownerCode")) ??
          asText(getByPath(raw, "cliFor")) ??
          partyRootId.split(":")[1];

        if (!ownerCode) return;

        const baseOrderRequest = {
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: "ordini" as const,
          pageSize: searchContext.pageSize,
        };

        let docs = await fetchLocalRows({
          ...baseOrderRequest,
          filters: { cliforfatt: ownerCode },
          extendedMode: true,
        });

        if (docs.length === 0) {
          docs = await fetchLocalRows({
            ...baseOrderRequest,
            filters: { cliForDest: ownerCode },
            extendedMode: true,
          });
        }

        if (docs.length === 0) {
          const broadDocs = await fetchAllPages(
            {
              ...baseOrderRequest,
              filters: {},
              extendedMode: false,
            },
            8
          );
          docs = filterDocsByOwner(broadDocs, ownerCode);
        }

        const classFolders =
          docs.length > 0
            ? enrichDocumentNodesWithPartyName(
                normalizeDocumentNodes(mapLibNodes(groupDocumentsByClass(docs, `${partyRootId}:documenti`))),
                partyNameByCode,
                activeResource
              )
            : getInitialDocumentClassFolders(`${partyRootId}:documenti`);
        const groupId = `${partyRootId}:documenti`;

        setTreeNodes((prev) => {
          const existingGroup = findNodeById(prev, groupId);
          const patched = existingGroup
              ? patchNode(prev, groupId, (current) => ({
                ...current,
                sublabel: "Fatture, ordini, DDT e altri documenti",
                badge: String(docs.length),
                count: docs.length,
                badgeTone: "active",
                raw: {
                  section: "Documenti",
                  ownerLabel,
                  ownerCode,
                  classSummary: "Fatture, ordini, DDT e altri documenti",
                },
                children: classFolders,
              }))
            : patchNode(prev, partyRootId, (current) => {
                const otherChildren = (current.children ?? []).filter((child) => child.id !== groupId);
                return {
                  ...current,
                  children: [
                    {
                      id: groupId,
                      label: "Documenti",
                      sublabel: "Fatture, ordini, DDT e altri documenti",
                      badge: String(docs.length),
                      badgeTone: "active",
                      count: docs.length,
                      raw: {
                        section: "Documenti",
                        ownerLabel,
                        ownerCode,
                        classSummary: "Fatture, ordini, DDT e altri documenti",
                      },
                      children: classFolders,
                    },
                    ...otherChildren,
                  ],
                };
              });

          const refreshed = findNodeById(patched, node.id) ?? findNodeById(patched, groupId);
          if (refreshed) setSelectedNode(refreshed);
          return patched;
        });

        setExpandedIds((prev) => Array.from(new Set([...prev, partyRootId, groupId, ...collectExpandableIds(classFolders)])));
        setLoadedDocumentsFor((prev) => [...prev, partyRootId]);
        return;
      }

      if (isPartyResource && (isPartyRoot || isDestinatariGroup) && !loadedDestinatariFor.includes(partyRootId)) {
        const destinatariRaw = (getByPath(raw, "destinatari") ?? getByPath(raw, "anagrafica.destinatari")) as unknown;
        const destinatari = Array.isArray(destinatariRaw) ? destinatariRaw : [];
        const groupId = `${partyRootId}:destinatari`;

        const destinatariNodes: TreeNode[] = destinatari.map((entry, index) => {
          const item = (entry && typeof entry === "object" ? (entry as Row) : {}) as Row;
          const name =
            asText(getByPath(item, "ragioneSociale")) ??
            asText(getByPath(item, "nominativo")) ??
            asText(getByPath(item, "nome")) ??
            `Destinatario ${index + 1}`;
          const address = asText(getByPath(item, "indirizzo"));
          const city = asText(getByPath(item, "citta"));

          return {
            id: `${groupId}:item:${index + 1}`,
            label: name,
            sublabel: [address, city].filter(Boolean).join(" | ") || undefined,
            raw: item,
            children: [],
          };
        });
        const destinatariContent =
          destinatariNodes.length > 0
              ? destinatariNodes
              : [
                  {
                    id: `${groupId}:placeholder`,
                    label: "Nessun destinatario locale disponibile",
                    sublabel: "Sincronizza per caricare gli indirizzi associati",
                    badge: "0",
                    badgeTone: "neutral" as const,
                    children: [],
                  },
                ];

        setTreeNodes((prev) => {
          const patched = patchNode(prev, groupId, (current) => ({
            ...current,
            badge: String(destinatariNodes.length),
            count: destinatariNodes.length,
            children: destinatariContent,
          }));

          const refreshed = findNodeById(patched, node.id) ?? findNodeById(patched, groupId);
          if (refreshed) setSelectedNode(refreshed);
          return patched;
        });

        setExpandedIds((prev) => Array.from(new Set([...prev, partyRootId, groupId])));
        setLoadedDestinatariFor((prev) => [...prev, partyRootId]);
        return;
      }

      if (activeResource === "ordini" && !loadedRowsFor.includes(node.id)) {
        const numReg = asText(getByPath(raw, "numReg"));
        if (!numReg) return;

        const rows = await fetchLocalRows({
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: "righeOrdine",
          filters: { numReg },
          pageSize: searchContext.pageSize,
          extendedMode: false,
        });

        const rowNodes = mapLibNodes(buildExplorerTree("righeOrdine", rows));
        const groupId = `${node.id}:righe`;

        setTreeNodes((prev) => {
          const patched = patchNode(prev, node.id, (current) => {
            const otherChildren = (current.children ?? []).filter((child) => child.id !== groupId);
            return {
              ...current,
              children: [
                ...otherChildren,
                {
                  id: groupId,
                  label: "Righe",
                  badge: String(rowNodes.length),
                  badgeTone: "neutral",
                  count: rowNodes.length,
                  raw: {
                    section: "Righe ordine",
                    orderNumber: numReg,
                  },
                  children: rowNodes,
                },
              ],
            };
          });

          const refreshed = findNodeById(patched, node.id);
          if (refreshed) setSelectedNode(refreshed);
          return patched;
        });

        setExpandedIds((prev) => Array.from(new Set([...prev, node.id, groupId])));
        setLoadedRowsFor((prev) => [...prev, node.id]);
      }
    },
    [activeResource, loadedDestinatariFor, loadedDocumentsFor, loadedRowsFor, partyNameByCode, searchContext]
  );

  const handleNodeSelect = useCallback(
    (node: TreeNode) => {
      setSelectedNodeId(node.id);
      setSelectedNode(node);
      void enrichNodeOnDemand(node).catch((err) => {
        setError(err instanceof Error ? err.message : "Errore durante il caricamento dettaglio");
      });
    },
    [enrichNodeOnDemand]
  );

  const detailNode = useMemo(() => {
    if (!selectedNode) return null;
    return {
      ...selectedNode,
      details: nodeToDetails(selectedNode, activeResource),
    };
  }, [selectedNode, activeResource]);

  const simulatedInvoiceLink = useMemo(() => {
    if (!isInvoiceNode(detailNode)) return null;
    const numReg = getNodeNumReg(detailNode);
    if (!numReg) return null;
    return `/fattura-simulata?numReg=${encodeURIComponent(numReg)}`;
  }, [detailNode]);

  const simulatedOrderLink = useMemo(() => {
    if (!isOrderNode(detailNode)) return null;
    const numReg = getNodeNumReg(detailNode);
    if (!numReg) return null;
    return `/ordine-simulato?numReg=${encodeURIComponent(numReg)}`;
  }, [detailNode]);

  const simulatedDdtLink = useMemo(() => {
    if (!isDdtNode(detailNode)) return null;
    const numReg = getNodeNumReg(detailNode);
    if (!numReg) return null;
    return `/ddt-simulato?numReg=${encodeURIComponent(numReg)}`;
  }, [detailNode]);

  const rootCount = dataByResource[activeResource]?.length ?? treeNodes.length;

  return (
    <main className="min-h-screen p-2 md:p-4">
      <div className="mx-auto h-[calc(100vh-1rem)] max-w-[1600px] overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.16)] md:h-[calc(100vh-2rem)]">
        <div className="grid h-full grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_330px]">
          <ResourceSidebar
            resources={sidebarResources}
            activeResourceId={activeResource}
            onResourceSelect={(resourceId) => {
              setSearchQuery("");
              setExpandedIds([]);
              setLoadedDestinatariFor([]);
              setLoadedDocumentsFor([]);
              setLoadedRowsFor([]);
              setSelectedNodeId(null);
              setSelectedNode(null);
              setActiveResource(resourceId as MainResource);
            }}
            onSyncAction={() => {
              router.push("/sync");
            }}
            syncActionDisabled={isLoading}
            syncActionLabel="Vai a sincronizzazione"
            syncActionStatus={
              syncMessage ?? (lastSyncedAt ? `Ultima sync ${toDisplayDate(lastSyncedAt)}` : undefined)
            }
            className="h-full"
          />

          <section className="flex min-h-0 flex-col border-r border-slate-200">
            <header className="h-11 border-b border-slate-200 bg-white px-4 text-xs text-slate-500 flex items-center mono">
              TS-API Explorer
            </header>

            {error && (
              <div className="mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="min-h-0 flex-1">
              <TreeExplorer
                title={activeMeta.title}
                description={isLoading ? "Caricamento in corso..." : activeMeta.description}
                nodes={treeNodes}
                selectedId={selectedNodeId}
                onSelectedIdChange={setSelectedNodeId}
                onNodeSelect={handleNodeSelect}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                enableClientFilter
                expandedIds={expandedIds}
                onExpandedIdsChange={setExpandedIds}
                searchPlaceholder={activeMeta.searchPlaceholder}
                emptyStateTitle={isLoading ? "Caricamento" : "Nessun nodo trovato"}
                emptyStateDescription={
                  isLoading
                    ? "Sto recuperando i dati dal gestionale..."
                    : "Prova un filtro diverso o cambia risorsa dal menu a sinistra."
                }
                footerLeft={`${rootCount} ${activeMeta.title.toLowerCase()} • Alyante API v1`}
                footerRight={`Ambiente ${searchContext.ambiente} • ${searchContext.utente}`}
                className="h-full"
              />
            </div>
          </section>

          <div className="hidden xl:block min-h-0">
            <DetailPanel
              node={detailNode}
              title="Documenti"
              subtitle="Dettaglio nodo selezionato"
              emptyTitle="Seleziona un elemento"
              emptyDescription="Il pannello mostra i campi principali e i dati raw del nodo selezionato."
              actions={
                <div className="flex items-center gap-2">
                  {simulatedInvoiceLink && (
                    <a
                      href={simulatedInvoiceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      Fattura Simulata
                    </a>
                  )}
                  {simulatedOrderLink && (
                    <a
                      href={simulatedOrderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      Ordine Simulato
                    </a>
                  )}
                  {simulatedDdtLink && (
                    <a
                      href={simulatedDdtLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      DDT Simulato
                    </a>
                  )}
                </div>
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}


