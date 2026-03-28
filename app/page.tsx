"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ResourceType } from "@/lib/api";
import {
  buildExplorerTree,
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
type SyncStatus = "idle" | "running" | "success" | "failed";

interface SearchContext {
  ambiente: string;
  utente: string;
  azienda: string;
  pageSize: number;
}

const DEFAULT_CONTEXT: SearchContext = {
  ambiente: "1",
  utente: "TeamSa",
  azienda: "1",
  pageSize: 100,
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

function asText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
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
      asText(getByPath(row, "clienteFornitoreMG.idCliFor")),
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

type SyncJobStatus = SyncStatus;

interface SyncJobPayload {
  jobId?: string;
  id?: string;
  status?: SyncJobStatus | string;
  phase?: string;
  progressPct?: number;
  progress?: number;
  processed?: number;
  inserted?: number;
  updated?: number;
  errors?: number;
  message?: string;
  lastSyncedAt?: string;
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

async function startLocalSyncJob(context: SearchContext): Promise<SyncJobPayload> {
  const response = await fetch("/api/sync/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
  });

  const payload = await parseJsonOrText<SyncJobPayload & { error?: string }>(response);
  const error =
    typeof payload === "string"
      ? payload
      : payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload.error
        : undefined;
  if (!response.ok || error) {
    throw new Error(error || response.statusText || "Impossibile avviare la sincronizzazione");
  }

  return (payload && typeof payload === "object" ? payload : {}) as SyncJobPayload;
}

async function readSyncJob(jobId: string): Promise<SyncJobPayload> {
  const response = await fetch(`/api/sync/status/${encodeURIComponent(jobId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = await parseJsonOrText<SyncJobPayload & { error?: string }>(response);
  const error =
    typeof payload === "string"
      ? payload
      : payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload.error
        : undefined;
  if (!response.ok || error) {
    throw new Error(error || response.statusText || "Impossibile leggere lo stato della sincronizzazione");
  }

  return (payload && typeof payload === "object" ? payload : {}) as SyncJobPayload;
}

function normalizeSyncStatus(status?: string): SyncStatus {
  if (status === "running" || status === "success" || status === "failed") return status;
  if (status === "queued") return "running";
  return "idle";
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
  const [refreshTick, setRefreshTick] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncPhase, setSyncPhase] = useState<string>("Pronto");
  const [syncProgress, setSyncProgress] = useState(0);
  const [, setSyncProcessed] = useState(0);
  const [, setSyncInserted] = useState(0);
  const [, setSyncUpdated] = useState(0);
  const [, setSyncErrors] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadedDocumentsFor, setLoadedDocumentsFor] = useState<string[]>([]);
  const [loadedDestinatariFor, setLoadedDestinatariFor] = useState<string[]>([]);
  const [loadedRowsFor, setLoadedRowsFor] = useState<string[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const clearSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  const refreshSyncMeta = useCallback(async () => {
    try {
      const meta = await fetchLocalMeta();
      if (meta.lastSyncedAt) setLastSyncedAt(meta.lastSyncedAt);
      if (meta.message) setSyncMessage(meta.message);
    } catch {
      // Non blocchiamo l'app se i metadati non sono disponibili.
    }
  }, []);

  const refreshAfterSync = useCallback(async () => {
    await refreshSyncMeta();
    setRefreshTick((current) => current + 1);
  }, [refreshSyncMeta]);

  const pollSyncJob = useCallback(
    async (jobId: string) => {
      clearSyncTimer();

      const tick = async () => {
        try {
          const job = await readSyncJob(jobId);
          const status = normalizeSyncStatus(job.status ?? "running");
          setSyncStatus(status);
          setSyncPhase(job.phase ?? "Sincronizzazione");
          setSyncProgress(Number(job.progressPct ?? job.progress ?? 0));
          setSyncProcessed(Number(job.processed ?? 0));
          setSyncInserted(Number(job.inserted ?? 0));
          setSyncUpdated(Number(job.updated ?? 0));
          setSyncErrors(Number(job.errors ?? 0));
          if (job.message) setSyncMessage(job.message);
          if (job.lastSyncedAt) setLastSyncedAt(job.lastSyncedAt);

          if (status === "success") {
            setSyncMessage(job.message ?? "Sincronizzazione completata");
            clearSyncTimer();
            await refreshAfterSync();
            return;
          }

          if (status === "failed") {
            setSyncMessage(job.message ?? "Sincronizzazione fallita");
            clearSyncTimer();
            return;
          }

          syncTimerRef.current = setTimeout(tick, 1000);
        } catch (err) {
          setSyncStatus("failed");
          setSyncMessage(err instanceof Error ? err.message : "Errore nel polling della sincronizzazione");
          clearSyncTimer();
        }
      };

      await tick();
    },
    [clearSyncTimer, refreshAfterSync]
  );

  const handleStartSync = useCallback(async () => {
    if (syncStatus === "running") return;

    clearSyncTimer();
    setSyncStatus("running");
    setSyncPhase("Avvio sincronizzazione");
    setSyncProgress(4);
    setSyncProcessed(0);
    setSyncInserted(0);
    setSyncUpdated(0);
    setSyncErrors(0);
    setSyncMessage("Richiesta di sincronizzazione inviata al gestionale locale");
    try {
      const job = await startLocalSyncJob(searchContext);
      const jobId = job.jobId ?? job.id;
      if (!jobId) {
        throw new Error("Il job di sincronizzazione non ha restituito un identificativo");
      }
      await pollSyncJob(jobId);
    } catch (err) {
      setSyncStatus("failed");
      setSyncPhase("Sincronizzazione non avviata");
      setSyncMessage(err instanceof Error ? err.message : "Errore imprevisto durante l'avvio");
      clearSyncTimer();
    }
  }, [clearSyncTimer, pollSyncJob, searchContext, syncStatus]);

  const loadResource = useCallback(
    async (resource: MainResource) => {
      setIsLoading(true);
      setError(null);

      try {
        const pageSize = Math.max(searchContext.pageSize, 250);
        const rows = await fetchAllPages(
          {
          ambiente: searchContext.ambiente,
          utente: searchContext.utente,
          azienda: searchContext.azienda,
          resourceType: resource,
          filters: {},
          pageSize,
          extendedMode: true,
          },
          resource === "ordini" ? 80 : 20
        );

        const mappedNodes =
          resource === "clienti" || resource === "fornitori"
            ? mapPartyNodes(resource, rows)
            : resource === "articoli"
              ? mapArticleNodes(rows)
            : resource === "ordini"
              ? normalizeDocumentNodes(mapLibNodes(buildExplorerTree(resource, rows)))
              : mapLibNodes(buildExplorerTree(resource, rows));

        setTreeNodes(mappedNodes);
        setExpandedIds(collectExpandableIds(mappedNodes));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
        setTreeNodes([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchContext]
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
      void loadResource(activeResource);
    }, 350);

    return () => clearTimeout(timeout);
  }, [activeResource, loadResource, refreshTick]);

  useEffect(() => () => clearSyncTimer(), [clearSyncTimer]);

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
            ? normalizeDocumentNodes(mapLibNodes(groupDocumentsByClass(docs, `${partyRootId}:documenti`)))
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
    [activeResource, loadedDestinatariFor, loadedDocumentsFor, loadedRowsFor, searchContext]
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
              setLoadedDestinatariFor([]);
              setActiveResource(resourceId as MainResource);
            }}
            onSyncAction={() => {
              void handleStartSync();
              router.push("/sync");
            }}
            syncActionDisabled={isLoading || syncStatus === "running"}
            syncActionLabel={syncStatus === "running" ? `Sincronizzazione ${Math.round(syncProgress)}%` : "Sincronizza dati"}
            syncActionStatus={
              syncStatus === "running"
                ? `${syncPhase} • ${Math.round(syncProgress)}%`
                : syncMessage ?? (lastSyncedAt ? `Ultima sync ${toDisplayDate(lastSyncedAt)}` : undefined)
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
            />
          </div>
        </div>
      </div>
    </main>
  );
}

