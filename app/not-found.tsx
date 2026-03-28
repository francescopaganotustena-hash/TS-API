export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="panel max-w-lg w-full p-8 text-center">
        <p className="mono text-xs uppercase tracking-[0.2em] text-slate-500 mb-3">404</p>
        <h1 className="text-2xl font-bold mb-2">Pagina non trovata</h1>
        <p className="text-sm text-slate-600">
          La risorsa richiesta non esiste o non e disponibile.
        </p>
      </section>
    </main>
  );
}
