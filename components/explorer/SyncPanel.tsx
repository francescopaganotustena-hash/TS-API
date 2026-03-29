import type { ReactNode } from "react";

export type SyncStatus = "idle" | "running" | "success" | "failed";

export interface SyncPanelProps {
  status: SyncStatus;
  phase?: string;
  progress?: number;
  processed?: number;
  inserted?: number;
  updated?: number;
  errors?: number;
  message?: string;
  warning?: string | null;
  contextSummary?: string;
  lastSyncedAt?: string | null;
  onSync: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  cancelDisabled?: boolean;
  actionLabel?: string;
  cancelLabel?: string;
  title?: string;
  description?: string;
  className?: string;
  extraActions?: ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const STATUS_STYLES: Record<SyncStatus, { chip: string; bar: string; ring: string }> = {
  idle: {
    chip: "bg-slate-100 text-slate-600",
    bar: "bg-slate-300",
    ring: "ring-slate-200",
  },
  running: {
    chip: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
    ring: "ring-amber-200",
  },
  success: {
    chip: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  failed: {
    chip: "bg-rose-100 text-rose-700",
    bar: "bg-rose-500",
    ring: "ring-rose-200",
  },
};

function formatTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function readCurrentPage(message?: string): number | null {
  if (!message) return null;
  const match = message.match(/pagina\s+(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function SyncPanel({
  status,
  phase,
  progress = 0,
  processed = 0,
  inserted = 0,
  updated = 0,
  errors = 0,
  message,
  warning,
  contextSummary,
  lastSyncedAt,
  onSync,
  onCancel,
  disabled,
  cancelDisabled,
  actionLabel = "Sincronizza con gestionale",
  cancelLabel = "Blocca sincronizzazione",
  title = "Sincronizzazione locale",
  description = "Aggiorna il database locale prima di navigare i dati nell'explorer.",
  className,
  extraActions,
  collapsed = false,
  onCollapsedChange,
}: SyncPanelProps) {
  const style = STATUS_STYLES[status];
  const percent = clampPercent(Number(progress ?? 0));
  const percentLabel = `${percent.toFixed(1)}%`;
  const lastSyncLabel = formatTimestamp(lastSyncedAt);
  const currentPage = readCurrentPage(message);

  if (collapsed) {
    return (
      <section className={["rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm", className ?? ""].join(" ")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
              <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", style.chip].join(" ")}>
                {status === "idle" ? "Pronto" : status === "running" ? "In corso" : status === "success" ? "Completato" : "Errore"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {lastSyncLabel ? `Ultima sincronizzazione: ${lastSyncLabel}` : "Nessuna sincronizzazione completata"}
            </p>
            {contextSummary && <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">{contextSummary}</p>}
            {(warning || message) && (
              <div className="mt-2 space-y-2">
                {warning && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
                    {warning}
                  </div>
                )}
                {message && (
                  <div className={["rounded-xl px-3 py-2 text-xs ring-1", style.ring].join(" ")}>
                    {message}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCollapsedChange?.(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Dettagli
            </button>
            {status === "running" && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelDisabled}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onSync}
              disabled={disabled || status === "running"}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "running" ? "Sincronizzazione..." : actionLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={["rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm", className ?? ""].join(" ")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            <span className={["rounded-full px-2 py-0.5 text-[11px] font-semibold", style.chip].join(" ")}>
              {status === "idle" ? "Pronto" : status === "running" ? "In corso" : status === "success" ? "Completato" : "Errore"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span>Fase: {phase ?? "Attesa"}</span>
            {lastSyncLabel && <span>Ultima sincronizzazione: {lastSyncLabel}</span>}
            {contextSummary && <span>{contextSummary}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onCollapsedChange && (
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Comprimi
            </button>
          )}
          {status === "running" && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelDisabled}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          )}
          {extraActions}
          <button
            type="button"
            onClick={onSync}
            disabled={disabled || status === "running"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "running" ? "Sincronizzazione..." : actionLabel}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={["h-full rounded-full transition-all duration-500", style.bar, status === "running" ? "animate-pulse" : ""].join(" ")}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span>{percentLabel}</span>
          {status === "running" && (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Attivita in corso
            </span>
          )}
          {status === "running" && currentPage && <span>Pagina {currentPage}</span>}
          <span>Processati {processed}</span>
          <span>Inseriti {inserted}</span>
          <span>Aggiornati {updated}</span>
          <span>Errori {errors}</span>
        </div>
        {(warning || message) && (
          <div className="mt-3 space-y-2">
            {warning && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
                {warning}
              </div>
            )}
            {message && (
              <div className={["rounded-xl px-3 py-2 text-sm ring-1", style.ring].join(" ")}>
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
