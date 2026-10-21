import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/server";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

export default async function SinPermiso({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requireUser();
  const { p } = await searchParams;
  const perm = p && p in PERMISSIONS ? PERMISSIONS[p as PermissionKey] : null;
  return (
    <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-brand-600" />
      <h1 className="mt-3 text-lg font-semibold">Acceso restringido</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Su usuario no tiene permiso para esta sección{perm ? `: “${perm.description}”` : ""}. Solicítelo al administrador.
      </p>
      <Link href="/" className={buttonClass("outline", "md", "mt-6")}>Volver al inicio</Link>
    </Card>
  );
}
