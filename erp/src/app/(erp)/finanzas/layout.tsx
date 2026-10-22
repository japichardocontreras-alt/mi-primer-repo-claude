import { requirePermission } from "@/lib/auth/server";
import { PageHeader } from "@/components/ui/page-header";
import { ConfigTabs } from "../configuracion/tabs";

export default async function FinanzasLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("finanzas.ver");
  const tabs = [
    { href: "/finanzas", label: "Resumen del mes" },
    { href: "/finanzas/cobros", label: "Cobros y cuentas por cobrar" },
    { href: "/finanzas/gastos", label: "Gastos" },
    { href: "/finanzas/recurrentes", label: "Gastos recurrentes" },
    { href: "/finanzas/movimientos", label: "Otros movimientos" },
    ...(user.permissions.has("costos.editar") ? [{ href: "/finanzas/categorias", label: "Categorías" }] : []),
  ];
  return (
    <>
      <PageHeader title="Finanzas y administración" description="Situación económica real: lo vendido, lo cobrado, lo gastado y el efectivo." />
      <ConfigTabs tabs={tabs} />
      {children}
    </>
  );
}
