"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/**
 * Pantalla de error recuperable. En producción Next oculta el detalle del error;
 * se muestra solo el identificador (digest) para buscarlo en el registro del servidor.
 */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <AlertTriangle className="mx-auto h-10 w-10 text-brand-600" />
      <h1 className="mt-3 text-lg font-semibold">No se pudo cargar esta página</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Puede deberse a una falla de conexión con el servidor o con la base de datos. La información ya guardada no se pierde.
        Intente de nuevo en unos momentos; si continúa, avise al administrador.
      </p>
      {error.digest && <p className="mt-3 text-xs text-neutral-400">Referencia: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" disabled={pending} className={buttonClass("primary")} onClick={() => startTransition(() => { router.refresh(); reset(); })}>
          <RotateCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Reintentar
        </button>
        <a href="/" className={buttonClass("outline")}>Ir al inicio</a>
      </div>
    </div>
  );
}
