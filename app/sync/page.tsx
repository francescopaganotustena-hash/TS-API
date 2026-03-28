"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SyncPanel, type SyncStatus } from "@/components/explorer/SyncPanel";

interface SyncJobPayload {
  jobId?: string;
  id?: string;
  status?: SyncStatus | "queued" | "cancelled" | string;
  phase?: string;
  progressPct?: number;
  processed?: number;
  inserted?: number;
  updated?: number;
  errors?: number;
  message?: string;
  startedAt?: string;
  endedAt?: string;
}

interface SyncHistoryPayload {
  jobs?: SyncJobPayload[];
}

interface LocalMetaPayload {
  lastSyncAt?: string;
  lastSyncedAt?: string;
  message?: string;
  lastStatus?: string;
}

const DEFAULT_CONTEXT = {
  ambiente: "1",
  utente: "TeamSa",
  azienda: "1",
  pageSize: 100,
  maxPages: 150,
};

function normalizeStatus(status?: string): SyncStatus {
  if (status === "running") return "running";
  if (status === "success") return "success";
  if (status === "failed" || status === "cancelled") return "failed";
  if (status === "queued") return "running";
  return "idle";
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(parsed));
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

export default function SyncPage() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [phase, setPhase] = useState<string>("Pronto");
  const [progress, setProgress] = useState<number>(0);
  const [processed, setProcessed] = useState<number>(0);
  const [inserted, setInserted] = useState<number>(0);
  const [updated, setUpdated] = useState<number>(0);
  const [errors, setErrors] = useState<number>(0);
  const [message, setMessage] = useState<string>("Nessuna sincronizzazione in corso");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<SyncJobPayload[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const loadMeta = useCallback(async () => {
    const response = await fetch("/api/local/meta", { method: "GET", headers: { Accept: "application/json" } });
    const payload = await parseJsonOrText<{ meta?: LocalMetaPayload } & LocalMetaPayload>(response);
    if (!response.ok) return;
    if (payload && typeof payload === "object" && "meta" in payload && payload.meta) {
      setLastSyncedAt(payload.meta.lastSyncAt ?? payload.meta.lastSyncedAt ?? null);
      if (payload.meta.message) setMessage(payload.meta.message);
      return;
    }
    if (payload && typeof payload === "object") {
      setLastSyncedAt(payload.lastSyncedAt ?? null);
      if (payload.message) setMessage(payload.message);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await fetch("/api/sync/history?limit=15", { method: "GET", headers: { Accept: "application/json" } });
    const payload = await parseJsonOrText<SyncHistoryPayload>(response);
    if (!response.ok || !payload || typeof payload === "string") return;
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    setHistory(jobs);
    const active = jobs.find((job) => job.status === "running" || job.status === "queued");
    if (active) setActiveJobId(active.id ?? active.jobId ?? null);
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      clearPollTimer();
      const tick = async () => {
        try {
          const response = await fetch(`/api/sync/status/${encodeURIComponent(jobId)}`, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          const payload = await parseJsonOrText<SyncJobPayload>(response);
          if (!response.ok || !payload || typeof payload === "string") {
            setStatus("failed");
            setMessage("Errore nel recupero stato sincronizzazione");
            clearPollTimer();
            return;
          }

          const nextStatus = normalizeStatus(payload.status);
          setStatus(nextStatus);
          setPhase(payload.phase ?? "Sincronizzazione");
          setProgress(Number(payload.progressPct ?? 0));
          setProcessed(Number(payload.processed ?? 0));
          setInserted(Number(payload.inserted ?? 0));
          setUpdated(Number(payload.updated ?? 0));
          setErrors(Number(payload.errors ?? 0));
          if (payload.message) setMessage(payload.message);
          if (payload.endedAt) setLastSyncedAt(payload.endedAt);

          if (nextStatus === "running") {
            pollTimerRef.current = setTimeout(tick, 1200);
            return;
          }

          setActiveJobId(null);
          clearPollTimer();
          void loadMeta();
          void loadHistory();
        } catch {
          setStatus("failed");
          setMessage("Errore durante il monitoraggio del job");
          clearPollTimer();
        }
      };
      await tick();
    },
    [clearPollTimer, loadHistory, loadMeta]
  );

  const startSync = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const response = await fetch("/api/sync/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULT_CONTEXT),
      });
      const payload = await parseJsonOrText<SyncJobPayload & { error?: string; job?: SyncJobPayload }>(response);

      if (response.status === 409 && payload && typeof payload === "object" && payload.job) {
        const existingId = payload.job.id ?? payload.job.jobId;
        setMessage("Esiste gia una sincronizzazione in corso: monitor attivo");
        if (existingId) {
          setActiveJobId(existingId);
          await pollJob(existingId);
        }
        return;
      }

      if (!response.ok || !payload || typeof payload === "string") {
        setStatus("failed");
        setMessage("Impossibile avviare la sincronizzazione");
        return;
      }

      const jobId = payload.jobId ?? payload.id;
      if (!jobId) {
        setStatus("failed");
        setMessage("Job avviato senza identificativo");
        return;
      }

      setStatus("running");
      setPhase(payload.phase ?? "Avvio sincronizzazione");
      setProgress(Number(payload.progressPct ?? 1));
      setMessage(payload.message ?? "Sincronizzazione avviata");
      setActiveJobId(jobId);
      await pollJob(jobId);
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, pollJob]);

  useEffect(() => {
    void loadMeta();
    void loadHistory();
  }, [loadHistory, loadMeta]);

  useEffect(() => {
    if (!activeJobId) return;
    void pollJob(activeJobId);
    return () => clearPollTimer();
  }, [activeJobId, clearPollTimer, pollJob]);

  const historyRows = useMemo(() => history.slice(0, 10), [history]);

  return (
    <main className="min-h-screen p-3 md:p-6">
      <div className="mx-auto max-w-[1200px] space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">Sincronizzazione</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitora i job di sincronizzazione e avvia aggiornamenti manuali del database locale.
          </p>
          <p className="mt-2 text-xs text-slate-500">Ultima sincronizzazione completata: {formatDateTime(lastSyncedAt ?? undefined)}</p>
        </header>

        <SyncPanel
          status={status}
          phase={phase}
          progress={progress}
          processed={processed}
          inserted={inserted}
          updated={updated}
          errors={errors}
          message={message}
          lastSyncedAt={lastSyncedAt}
          onSync={() => {
            void startSync();
          }}
          disabled={isBusy || status === "running"}
          title="Job sincronizzazione"
          description="Questa pagina mostra lo stato reale del job, inclusa la barra di avanzamento."
          actionLabel="Avvia nuova sincronizzazione"
        />

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Storico ultimi job</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Stato</th>
                  <th className="px-4 py-3">Fase</th>
                  <th className="px-4 py-3">Progresso</th>
                  <th className="px-4 py-3">Avvio</th>
                  <th className="px-4 py-3">Fine</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length > 0 ? (
                  historyRows.map((job) => (
                    <tr key={job.id ?? job.jobId} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3 font-mono text-xs">{job.id ?? job.jobId ?? "-"}</td>
                      <td className="px-4 py-3">{job.status ?? "-"}</td>
                      <td className="px-4 py-3">{job.phase ?? "-"}</td>
                      <td className="px-4 py-3">{Math.max(0, Math.min(100, Math.round(Number(job.progressPct ?? 0))))}%</td>
                      <td className="px-4 py-3">{formatDateTime(job.startedAt)}</td>
                      <td className="px-4 py-3">{formatDateTime(job.endedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={6}>
                      Nessun job registrato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
