import { requirePermission } from "@/lib/auth/server";
import { ModulePending } from "@/components/module-pending";

export const metadata = { title: "Personal y nómina" };

export default async function Page() {
  await requirePermission("personal.ver");
  return (
    <ModulePending
      title="Personal y nómina"
      phase={5}
      features={[
        "Ficha de cada colaborador (EMP-000000)",
        "Tarifas configurables por tipo de servicio y rol",
        "Pago por servicio generado automáticamente al finalizar (sin duplicados)",
        "Bonos, horas extra, anticipos y deducciones",
        "Cortes semanales, quincenales y mensuales",
        "Devengado vs. pagado y saldo pendiente",
      ]}
      note="Es un control administrativo interno; no sustituye el cálculo legal de nómina (IMSS, ISR, CFDI)."
    />
  );
}
