import { requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/ui/page-header";
import { ConfigTabs } from "./tabs";

export default async function ConfigLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("config.ver");
  const tabs = [
    { href: "/configuracion", label: "General", show: true },
    { href: "/configuracion/usuarios", label: "Usuarios", show: user.permissions.has("config.usuarios") },
    { href: "/configuracion/roles", label: "Roles y permisos", show: user.permissions.has("config.permisos") },
    { href: "/configuracion/auditoria", label: "Auditoría", show: user.permissions.has("auditoria.ver") },
    { href: "/configuracion/respaldos", label: "Respaldos", show: user.permissions.has("config.respaldos") },
  ].filter((t) => t.show);
  return (
    <>
      <PageHeader title="Configuración" description="Parámetros del sistema, usuarios, permisos y seguridad." />
      <ConfigTabs tabs={tabs} />
      {children}
    </>
  );
}
