"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="panel max-w-xl w-full p-8">
        <p className="mono text-xs uppercase tracking-[0.2em] text-red-700 mb-3">Errore applicazione</p>
        <h1 className="text-2xl font-bold mb-3">Qualcosa e andato storto</h1>
        <p className="text-sm text-slate-700 mb-5">{error.message || "Errore imprevisto"}</p>
        <button
          type="button"
          onClick={reset}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900"
        >
          Riprova
        </button>
      </section>
    </main>
  );
}
