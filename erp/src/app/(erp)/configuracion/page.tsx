import { prisma } from "@/lib/db";
import { requirePermission, can } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, FormField } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/form-status";
import { saveSettingAction } from "./actions";

export const metadata = { title: "Configuración" };

export default async function GeneralConfig() {
  const user = await requirePermission("config.ver");
  const [empresa, operacion, alertas, finanzas] = await Promise.all([
    getSetting(prisma, "empresa"), getSetting(prisma, "operacion"), getSetting(prisma, "alertas"), getSetting(prisma, "finanzas"),
  ]);
  const canEdit = can(user, "config.empresa");
  const canCosts = can(user, "costos.editar");

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Datos de la empresa" description="Aparecen en reportes PDF y documentos." />
        <CardBody>
          <ActionForm action={saveSettingAction.bind(null, "empresa")}>
            <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
              <FormField name="nombre" label="Nombre comercial" required className="sm:col-span-2"><Input id="nombre" name="nombre" defaultValue={empresa.nombre} /></FormField>
              <FormField name="razonSocial" label="Razón social"><Input id="razonSocial" name="razonSocial" defaultValue={empresa.razonSocial} /></FormField>
              <FormField name="rfc" label="RFC"><Input id="rfc" name="rfc" defaultValue={empresa.rfc} /></FormField>
              <FormField name="telefono" label="Teléfono"><Input id="telefono" name="telefono" defaultValue={empresa.telefono} /></FormField>
              <FormField name="correo" label="Correo"><Input id="correo" name="correo" defaultValue={empresa.correo} /></FormField>
              <FormField name="direccion" label="Dirección" className="sm:col-span-2"><Input id="direccion" name="direccion" defaultValue={empresa.direccion} /></FormField>
              {canEdit && <div className="sm:col-span-2"><SubmitButton>Guardar</SubmitButton></div>}
            </fieldset>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Parámetros operativos" description="Se usan para validar disponibilidad de unidades y personal." />
        <CardBody>
          <ActionForm action={saveSettingAction.bind(null, "operacion")}>
            <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
              <FormField name="minutosPreparacion" label="Preparación antes de salir (min)"><Input id="minutosPreparacion" name="minutosPreparacion" type="number" min={0} defaultValue={operacion.minutosPreparacion} /></FormField>
              <FormField name="minutosRegreso" label="Regreso a base (min)"><Input id="minutosRegreso" name="minutosRegreso" type="number" min={0} defaultValue={operacion.minutosRegreso} /></FormField>
              <FormField name="duracionDefaultHoras" label="Duración estimada por defecto (h)"><Input id="duracionDefaultHoras" name="duracionDefaultHoras" type="number" step="0.5" min={0.5} defaultValue={operacion.duracionDefaultHoras} /></FormField>
              <FormField name="vigenciaCotizacionDias" label="Vigencia de cotización (días)"><Input id="vigenciaCotizacionDias" name="vigenciaCotizacionDias" type="number" min={1} defaultValue={operacion.vigenciaCotizacionDias} /></FormField>
              {canEdit && <div className="sm:col-span-2"><SubmitButton>Guardar</SubmitButton></div>}
            </fieldset>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Alertas" description="Anticipación de avisos de flotilla." />
        <CardBody>
          <ActionForm action={saveSettingAction.bind(null, "alertas")}>
            <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-3">
              <FormField name="diasAvisoDocumentos" label="Documentos (días)"><Input id="diasAvisoDocumentos" name="diasAvisoDocumentos" type="number" min={1} defaultValue={alertas.diasAvisoDocumentos} /></FormField>
              <FormField name="diasAvisoMantenimiento" label="Mantenimiento (días)"><Input id="diasAvisoMantenimiento" name="diasAvisoMantenimiento" type="number" min={1} defaultValue={alertas.diasAvisoMantenimiento} /></FormField>
              <FormField name="kmAvisoMantenimiento" label="Mantenimiento (km)"><Input id="kmAvisoMantenimiento" name="kmAvisoMantenimiento" type="number" min={0} defaultValue={alertas.kmAvisoMantenimiento} /></FormField>
              {canEdit && <div className="sm:col-span-3"><SubmitButton>Guardar</SubmitButton></div>}
            </fieldset>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Parámetros financieros" description="Solo el administrador (permiso de costos) puede modificarlos." />
        <CardBody>
          <ActionForm action={saveSettingAction.bind(null, "finanzas")}>
            <fieldset disabled={!canCosts} className="grid gap-4 sm:grid-cols-2">
              <FormField name="tasaIva" label="Tasa de IVA (decimal)" hint="0.16 = 16 %"><Input id="tasaIva" name="tasaIva" type="number" step="0.01" min={0} max={1} defaultValue={finanzas.tasaIva} /></FormField>
              <FormField name="metodoDepreciacion" label="Depreciación en resultados">
                <Select id="metodoDepreciacion" name="metodoDepreciacion" defaultValue={finanzas.metodoDepreciacion}>
                  <option value="LINEAL_TIEMPO">Lineal por tiempo</option>
                  <option value="POR_KILOMETRO">Por kilómetro recorrido</option>
                </Select>
              </FormField>
              <FormField name="criterioAsignacionFijos" label="Asignación de gastos fijos a unidades" className="sm:col-span-2">
                <Select id="criterioAsignacionFijos" name="criterioAsignacionFijos" defaultValue={finanzas.criterioAsignacionFijos}>
                  <option value="INGRESOS">Proporcional a ingresos</option>
                  <option value="KILOMETROS">Proporcional a kilómetros</option>
                  <option value="SERVICIOS">Proporcional a número de servicios</option>
                  <option value="PARTES_IGUALES">Partes iguales</option>
                </Select>
              </FormField>
              {canCosts && <div className="sm:col-span-2"><SubmitButton>Guardar</SubmitButton></div>}
            </fieldset>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
