import { Card, CardHeader } from "../ui/card";

/** Tarjeta de gráfica con tabla de datos accesible («Ver datos»). */
export function ChartCard({ title, description, children, table, empty }: {
  title: string; description?: string; children: React.ReactNode; table?: { headers: string[]; rows: (string | number)[][] }; empty?: boolean;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader title={title} description={description} />
      <div className="px-3 pb-2 pt-3 sm:px-4">
        {empty ? <p className="py-10 text-center text-sm text-neutral-500">Sin datos para este periodo.</p> : children}
      </div>
      {table && !empty && (
        <details className="border-t border-neutral-100 px-5 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-800">Ver datos en tabla</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr>{table.headers.map((h, i) => <th key={h} className={`border-b border-neutral-200 py-1.5 font-semibold text-neutral-600 ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`border-b border-neutral-100 py-1 ${j ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </details>
      )}
    </Card>
  );
}
