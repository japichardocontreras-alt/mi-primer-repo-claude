"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { FormField } from "../ui/action-form";
import { Input } from "../ui/form";
import { DuplicateConfirm } from "./duplicate-confirm";

type ClientOption = { id: string; code: string; name: string; phone: string };

/** Selección de cliente existente (búsqueda en vivo) o captura de uno nuevo. */
export function ClientPicker({ search, initial }: { search: (q: string) => Promise<ClientOption[]>; initial?: ClientOption | null }) {
  const [mode, setMode] = useState<"existente" | "nuevo">(initial ? "existente" : "nuevo");
  const [selected, setSelected] = useState<ClientOption | null>(initial ?? null);
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<ClientOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "existente" || q.trim().length < 2) { setOptions([]); return; }
    let cancel = false;
    const t = setTimeout(() => {
      search(q).then((r) => { if (!cancel) { setOptions(r); setError(null); } }).catch(() => !cancel && setError("No se pudo buscar."));
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, mode, search]);

  return (
    <div>
      <input type="hidden" name="clientMode" value={mode} />
      <div className="mb-4 inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-0.5 text-sm">
        {(["nuevo", "existente"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`rounded px-3 py-1.5 font-medium ${mode === m ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>
            {m === "nuevo" ? "Cliente nuevo" : "Cliente existente"}
          </button>
        ))}
      </div>

      {mode === "nuevo" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField name="client_name" label="Nombre completo" required><Input id="client_name" name="client_name" autoComplete="off" /></FormField>
          <FormField name="client_phone" label="Teléfono" required><Input id="client_phone" name="client_phone" type="tel" inputMode="tel" autoComplete="off" /></FormField>
          <FormField name="client_email" label="Correo (opcional)"><Input id="client_email" name="client_email" type="email" autoComplete="off" /></FormField>
          <div className="sm:col-span-3"><DuplicateConfirm /></div>
        </div>
      ) : (
        <FormField name="clientId" label="Cliente" required>
          <input type="hidden" name="clientId" value={selected?.id ?? ""} />
          {selected ? (
            <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm">
              <span><span className="font-medium">{selected.name}</span> <span className="text-neutral-500">· {selected.code} · {selected.phone}</span></span>
              <button type="button" onClick={() => setSelected(null)} className="text-neutral-400 hover:text-neutral-700" aria-label="Cambiar cliente"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, teléfono o código…" className="pl-9" aria-label="Buscar cliente" />
              {(options.length > 0 || error || q.trim().length >= 2) && (
                <div className="absolute left-0 right-0 top-10 z-20 max-h-64 overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                  {error && <p className="px-3 py-2 text-sm text-red-600">{error}</p>}
                  {!error && options.length === 0 && <p className="px-3 py-2 text-sm text-neutral-500">Sin coincidencias.</p>}
                  {options.map((o) => (
                    <button key={o.id} type="button" onClick={() => { setSelected(o); setQ(""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50">
                      <span className="font-medium">{o.name}</span> <span className="text-neutral-500">· {o.code} · {o.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </FormField>
      )}
    </div>
  );
}
