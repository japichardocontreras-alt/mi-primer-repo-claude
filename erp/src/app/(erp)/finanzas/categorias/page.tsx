import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { createCategoryAction, toggleCategoryAction } from "../actions";

export const metadata = { title: "Categorías contables" };
const GROUP = { DIRECTO: "Directo (ligado a servicio)", FIJO: "Fijo", FLOTILLA: "Flotilla", EXTRAORDINARIO: "Extraordinario" } as const;

export default async function Categorias() {
  await requirePermission("costos.editar");
  const cats = await prisma.expenseCategory.findMany({ include: { _count: { select: { expenses: true } } }, orderBy: [{ group: "asc" }, { name: "asc" }] });
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="min-w-0">
        <CardHeader title="Categorías contables" description="El grupo determina dónde aparece el gasto en Resultados. Las categorías con historial no se borran; se desactivan." />
        <Table>
          <thead><tr><Th>Categoría</Th><Th>Grupo</Th><Th className="text-center">Gastos</Th><Th>Estado</Th><Th /></tr></thead>
          <tbody>
            {cats.map((c) => (
              <Tr key={c.id}>
                <Td>{c.name}{c.isSystem && <span className="block text-[11px] text-neutral-500">del sistema</span>}</Td>
                <Td className="text-sm">{GROUP[c.group]}</Td>
                <Td className="text-center tabular-nums">{c._count.expenses}</Td>
                <Td>{c.active ? <Badge tone="green">Activa</Badge> : <Badge>Inactiva</Badge>}</Td>
                <Td><ActionForm action={toggleCategoryAction.bind(null, c.id)}><SubmitButton size="sm" variant="ghost">{c.active ? "Desactivar" : "Activar"}</SubmitButton></ActionForm></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Nueva categoría" />
        <CardBody>
          <ActionForm action={createCategoryAction} resetOnSuccess className="space-y-3">
            <FormField name="name" label="Nombre" required><Input id="c_name" name="name" /></FormField>
            <FormField name="group" label="Grupo" required><Select id="c_group" name="group" defaultValue="FIJO">{Object.entries(GROUP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FormField>
            <SubmitButton>Crear categoría</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
