import { useEffect, useMemo, useState } from "react";
import type { TreeNode } from "./types";

export interface TreeExplorerProps {
  title: string;
  description?: string;
  nodes: TreeNode[];
  selectedId?: string | null;
  onSelectedIdChange?: (nodeId: string | null) => void;
  onNodeSelect?: (node: TreeNode) => void;
  searchQuery?: string;
  defaultSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  expandedIds?: string[];
  defaultExpandedIds?: string[];
  onExpandedIdsChange?: (expandedIds: string[]) => void;
  searchPlaceholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  footerLeft?: string;
  footerRight?: string;
  enableClientFilter?: boolean;
  className?: string;
}

const toneStyles = {
  active: "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20",
  suspended: "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/20",
  neutral: "bg-slate-500/15 text-slate-600 ring-1 ring-slate-500/15",
  error: "bg-rose-500/15 text-rose-700 ring-1 ring-rose-500/20",
} as const;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function useControllableString(
  controlled: string | undefined,
  defaultValue: string,
  onChange?: (value: string) => void
) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;

  const setValue = (next: string) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return [value, setValue] as const;
}

function useControllableSelection(
  controlled: string[] | undefined,
  defaultValue: string[],
  onChange?: (value: string[]) => void
) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;

  const setValue = (next: string[]) => {
    if (controlled === undefined) setInternal(next);
    onChange?.(next);
  };

  return [value, setValue] as const;
}

export function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;

  const filtered: TreeNode[] = [];

  for (const node of nodes) {
    const matchesSelf = [node.label, node.sublabel, node.status, node.badge]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));

    const filteredChildren = filterTreeNodes(node.children ?? [], query);

    if (matchesSelf || filteredChildren.length > 0) {
      filtered.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : matchesSelf ? node.children : [],
      });
    }
  }

  return filtered;
}

function countVisibleNodes(nodes: TreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countVisibleNodes(node.children ?? []), 0);
}

function TreeRow({
  node,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId?: string | null;
  expandedIds: string[];
  onToggle: (id: string) => void;
  onSelect: (node: TreeNode) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const expanded = expandedIds.includes(node.id);
  const selected = selectedId === node.id;
  const statusTone = node.statusTone ?? "neutral";
  const badgeTone = node.badgeTone ?? "neutral";

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect(node);
        }}
        className={cx(
          "group flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition",
          selected
            ? "bg-teal-100 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
            : "hover:bg-slate-100/80 text-slate-700"
        )}
        style={{ paddingLeft: `${depth * 22 + 12}px` }}
      >
        <span className="flex w-4 shrink-0 items-center justify-center text-slate-400">
          {hasChildren ? (expanded ? "v" : ">") : "-"}
        </span>
        <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", selected ? "bg-white" : "bg-slate-100")}>
          <span className={cx("h-2.5 w-2.5 rounded-sm", selected ? "bg-teal-600" : "bg-slate-400")} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{node.label}</span>
            {node.status && (
              <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", toneStyles[statusTone])}>
                {node.status}
            </span>
            )}
          </div>
          {node.sublabel && <div className="truncate text-xs text-slate-500">{node.sublabel}</div>}
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {node.rightMeta && (
            <span className="max-w-[110px] truncate text-[11px] font-mono text-slate-400">{node.rightMeta}</span>
          )}
          {node.amount && (
            <span className="max-w-[90px] truncate text-[11px] font-mono text-slate-400">{node.amount}</span>
          )}
          {typeof node.count === "number" && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums">
              {node.count}
            </span>
          )}
          {node.badge && (
            <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", toneStyles[badgeTone])}>
              {node.badge}
            </span>
          )}
        </div>
      </button>

      {hasChildren && expanded && (
        <div className="relative">
          <div
            className="absolute left-[22px] top-0 h-full border-l border-slate-200"
            aria-hidden="true"
          />
          <div className="space-y-1">
            {node.children!.map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TreeExplorer({
  title,
  description,
  nodes,
  selectedId,
  onSelectedIdChange,
  onNodeSelect,
  searchQuery,
  defaultSearchQuery = "",
  onSearchQueryChange,
  expandedIds,
  defaultExpandedIds = [],
  onExpandedIdsChange,
  searchPlaceholder = "Search",
  emptyStateTitle = "No nodes found",
  emptyStateDescription = "Try a different search term.",
  footerLeft,
  footerRight,
  enableClientFilter = true,
  className,
}: TreeExplorerProps) {
  const [query, setQuery] = useControllableString(searchQuery, defaultSearchQuery, onSearchQueryChange);
  const [openIds, setOpenIds] = useControllableSelection(expandedIds, defaultExpandedIds, onExpandedIdsChange);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(selectedId ?? null);

  useEffect(() => {
    if (selectedId !== undefined) {
      setLocalSelectedId(selectedId);
    }
  }, [selectedId]);

  const visibleNodes = useMemo(
    () => (enableClientFilter ? filterTreeNodes(nodes, query) : nodes),
    [enableClientFilter, nodes, query]
  );
  const visibleCount = useMemo(() => countVisibleNodes(visibleNodes), [visibleNodes]);
  const selectedNodeId = selectedId ?? localSelectedId;

  const toggleNode = (id: string) => {
    setOpenIds(openIds.includes(id) ? openIds.filter((value) => value !== id) : [...openIds, id]);
  };

  const handleSelect = (node: TreeNode) => {
    if (selectedId === undefined) {
      setLocalSelectedId(node.id);
    }
    onSelectedIdChange?.(node.id);
    onNodeSelect?.(node);
  };

  return (
    <section className={cx("flex h-full min-h-0 flex-col bg-slate-50", className)}>
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
            <span className="text-lg font-semibold">+</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-slate-400">/</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-4">
        {visibleNodes.length > 0 ? (
          <div className="space-y-1">
            {visibleNodes.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedNodeId}
                expandedIds={openIds}
                onToggle={toggleNode}
                onSelect={handleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 text-center">
            <div className="text-4xl text-slate-300">/</div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{emptyStateTitle}</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">{emptyStateDescription}</p>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 text-[11px] font-medium tracking-wide text-slate-500">
        <span>{footerLeft ?? `${visibleCount} nodes`}</span>
        <span>{footerRight ?? "Explorer ready"}</span>
      </footer>
    </section>
  );
}
