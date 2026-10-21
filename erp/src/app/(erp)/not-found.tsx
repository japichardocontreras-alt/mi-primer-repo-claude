import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export default function ErpNotFound() {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
      <SearchX className="mx-auto h-10 w-10 text-brand-600" />
      <h1 className="mt-3 text-lg font-semibold">No encontrado</h1>
      <p className="mt-2 text-sm text-neutral-600">El registro que busca no existe o fue eliminado.</p>
      <Link href="/" className={buttonClass("outline", "md", "mt-6")}>Volver al inicio</Link>
    </div>
  );
}
