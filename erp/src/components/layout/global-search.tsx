"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

type Result = { type: string; id: string; title: string; subtitle: string; href: string };

/** Búsqueda global por folio, cliente o teléfono (consulta la base de datos en /api/buscar). */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setError(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/buscar?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error();
        setResults((await r.json()).results);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("No se pudo buscar. Verifique su conexión.");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar folio, cliente o teléfono…"
        className="h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 pl-9 pr-9 text-sm placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-label="Búsqueda global"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />}
      {open && q.trim().length >= 2 && (results || error) && (
        <div className="absolute left-0 right-0 top-11 z-40 max-h-96 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}
          {results && results.length === 0 && <p className="px-4 py-3 text-sm text-neutral-500">Sin resultados para “{q.trim()}”.</p>}
          {results?.map((r) => (
            <Link key={`${r.type}-${r.id}`} href={r.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-50">
              <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-600">{r.type}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-neutral-900">{r.title}</span>
                <span className="block truncate text-xs text-neutral-500">{r.subtitle}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
