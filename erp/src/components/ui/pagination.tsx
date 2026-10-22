import Link from "next/link";
import { buttonClass } from "./button";

export function Pagination({ page, total, pageSize, params }: { page: number; total: number; pageSize: number; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
    u.set("p", String(p));
    return `?${u}`;
  };
  return (
    <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-sm text-neutral-600">
      <span>Página {page} de {pages} · {total} registro(s)</span>
      <div className="flex gap-2">
        {page > 1 && <Link className={buttonClass("outline", "sm")} href={href(page - 1)}>Anterior</Link>}
        {page < pages && <Link className={buttonClass("outline", "sm")} href={href(page + 1)}>Siguiente</Link>}
      </div>
    </div>
  );
}
