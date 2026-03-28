import type { ReactNode } from "react";
import type { DetailField, TreeNode } from "./types";

export interface DetailPanelProps {
  node: TreeNode | null;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onClose?: () => void;
  actions?: ReactNode;
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

function formatRawValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function RawBlock({ value }: { value: unknown }) {
  const text = formatRawValue(value);
  if (!text) return null;

  return (
    <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
      <code>{text}</code>
    </pre>
  );
}

function DetailLine({ field }: { field: DetailField }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{field.label}</span>
      <span
        className={cx(
          "max-w-[62%] text-right text-sm",
          field.mono ? "font-mono" : "",
          field.tone === "muted"
            ? "text-slate-500"
            : field.tone === "success"
              ? "text-emerald-700"
              : field.tone === "warning"
                ? "text-amber-700"
                : field.tone === "danger"
                  ? "text-rose-700"
                  : "text-slate-900"
        )}
      >
        {field.value}
      </span>
    </div>
  );
}

export function DetailPanel({
  node,
  title = "Documenti",
  subtitle = "Selected item details",
  emptyTitle = "Select an item to view details",
  emptyDescription = "The inspector shows structured fields and raw JSON for the chosen node.",
  onClose,
  actions,
  className,
}: DetailPanelProps) {
  return (
    <aside className={cx("flex h-full min-h-0 flex-col border-l border-slate-200 bg-white", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 py-5">
        {node ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-lg font-semibold text-slate-950">{node.label}</h4>
                {node.status && (
                  <span className={cx("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", toneStyles[node.statusTone ?? "neutral"])}>
                    {node.status}
                  </span>
                )}
                {node.badge && (
                  <span className={cx("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", toneStyles[node.badgeTone ?? "neutral"])}>
                    {node.badge}
                  </span>
                )}
              </div>
              {node.sublabel && <p className="mt-1 text-sm text-slate-500">{node.sublabel}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {typeof node.count === "number" && (
                  <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                    {node.count} items
                  </span>
                )}
                <span className="rounded-full bg-white px-2 py-1">ID: {node.id}</span>
              </div>
            </div>

            {node.details && node.details.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white px-4 py-2">
                {node.details.map((field, index) => (
                  <DetailLine key={`${field.label}-${index}`} field={field} />
                ))}
              </section>
            )}

            {node.raw !== undefined && node.raw !== null && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h5 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Raw JSON
                  </h5>
                </div>
                <RawBlock value={node.raw} />
              </section>
            )}

            {node.raw === undefined && (!node.details || node.details.length === 0) && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <div className="text-4xl text-slate-300">i</div>
                <h5 className="mt-4 text-sm font-semibold text-slate-900">{emptyTitle}</h5>
                <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <div className="text-4xl text-slate-300">i</div>
            <h4 className="mt-4 text-sm font-semibold text-slate-900">{emptyTitle}</h4>
            <p className="mt-2 max-w-sm text-sm text-slate-500">{emptyDescription}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
