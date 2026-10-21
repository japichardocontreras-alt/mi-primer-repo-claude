import Link from "next/link";
import { ClipboardList, PhoneCall, CalendarClock, Wallet, Truck, FileWarning } from "lucide-react";
import { requirePermission, can } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { homeSummary, accountsReceivable } from "@/lib/queries/home";
import { formatDateTime, formatMXN, MONTHS_ES } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, Stat } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Th, Td, Tr } from "@/components/ui/table";

export const metadata = { title: "Inicio" };

export default async function InicioPage() {
  const user = await requirePermission("inicio.ver");
  const s = await homeSummary(prisma);
  const showMoney = can(user, "finanzas.ver");
  const receivable = showMoney ? await accountsReceivable(prisma) : 0;

  return (
    <>
      <PageHeader
        eyebrow={`${MONTHS_ES[s.month.month - 1]} ${s.month.year}`}
        title={`Hola, ${user.name.split(" ")[0]}`}
        description="Resumen de la operación con información real de la base de datos."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Solicitudes del mes" value={s.requestsMonth} icon={<ClipboardList className="h-5 w-5" />} tone="brand" />
        <Stat label="Seguimientos pendientes hoy" value={s.followUps} icon={<PhoneCall className="h-5 w-5" />} tone={s.followUps ? "warn" : "neutral"} />
        <Stat label="Servicios próximos 7 días" value={s.upcoming.length} icon={<CalendarClock className="h-5 w-5" />} />
        <Stat label="Servicios realizados del mes" value={s.servicesMonth} icon={<CalendarClock className="h-5 w-5" />} tone="good" />
        <Stat label="Unidades activas" value={s.activeVehicles} icon={<Truck className="h-5 w-5" />} hint={s.docsExpiring ? `${s.docsExpiring} documento(s) por vencer` : "Sin documentos por vencer"} />
        {showMoney ? (
          <Stat label="Cuentas por cobrar" value={formatMXN(receivable)} icon={<Wallet className="h-5 w-5" />} hint="Precio contratado − cobros recibidos" />
        ) : (
          <Stat label="Documentos por vencer" value={s.docsExpiring} icon={<FileWarning className="h-5 w-5" />} tone={s.docsExpiring ? "warn" : "neutral"} />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Próximos servicios" description="Programados en los siguientes 7 días" />
          {s.upcoming.length === 0 ? (
            <EmptyState title="No hay servicios programados" description="Los servicios aparecerán aquí cuando se confirmen solicitudes y se programen en la agenda." />
          ) : (
            <Table>
              <thead><tr><Th>Folio</Th><Th>Cliente</Th><Th>Fecha</Th><Th>Unidad</Th></tr></thead>
              <tbody>
                {s.upcoming.map((x) => (
                  <Tr key={x.id}>
                    <Td className="font-medium">{x.folio}</Td>
                    <Td>{x.client.name}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(x.scheduledStart)}</Td>
                    <Td>{x.vehicles.map((v) => v.vehicle.name).join(", ") || "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Seguimiento comercial" description="Clientes a contactar hoy o con contacto vencido" />
          {s.followUpList.length === 0 ? (
            <EmptyState title="Sin seguimientos pendientes" description="Cuando registre una próxima fecha de contacto en una solicitud, aparecerá aquí." />
          ) : (
            <Table>
              <thead><tr><Th>Folio</Th><Th>Cliente</Th><Th>Teléfono</Th><Th>Contactar</Th></tr></thead>
              <tbody>
                {s.followUpList.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-medium"><Link href={`/solicitudes`} className="hover:text-brand-600">{r.folio}</Link></Td>
                    <Td>{r.client.name}</Td>
                    <Td>{r.client.phone}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(r.nextContactAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
