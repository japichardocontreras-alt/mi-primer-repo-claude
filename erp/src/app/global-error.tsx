"use client";

/** Último recurso si falla el layout raíz (sin estilos globales disponibles). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-MX">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center", color: "#171717" }}>
        <h1 style={{ fontSize: 18 }}>MUDANZAS METEPEC | ERP</h1>
        <p>No se pudo cargar el sistema. Puede deberse a una falla de conexión. La información guardada no se pierde.</p>
        <button type="button" onClick={() => reset()} style={{ padding: "8px 16px", background: "#cf1f1f", color: "#fff", border: 0, borderRadius: 6 }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
