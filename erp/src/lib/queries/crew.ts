import type { ServiceType } from "@prisma/client";
import type { Db } from "../db";
import type { CrewVehicle, CrewWorker } from "@/components/forms/crew-picker";

const STATUS_NOTE: Record<string, string> = { EN_TALLER: "En taller", FUERA_DE_SERVICIO: "Fuera de servicio", BAJA: "Baja" };

/** Opciones para asignar: unidades activas y personal operativo con su tarifa vigente por rol. */
export async function crewOptions(db: Db, serviceType: ServiceType, at = new Date()): Promise<{ vehicles: CrewVehicle[]; workers: CrewWorker[] }> {
  const [vehicles, workers, rates] = await Promise.all([
    db.vehicle.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.worker.findMany({ where: { active: true, position: { not: "ADMINISTRACION" } }, orderBy: [{ position: "asc" }, { fullName: "asc" }] }),
    db.payRate.findMany({ where: { serviceType, effectiveFrom: { lte: at } }, orderBy: { effectiveFrom: "desc" } }),
  ]);
  const rate = (role: "CHOFER" | "AYUDANTE" | "OTRO") => Number(rates.find((r) => r.role === role)?.amount ?? 0);
  const defaultPay = { CHOFER: rate("CHOFER"), AYUDANTE: rate("AYUDANTE"), OTRO: rate("OTRO") };
  return {
    vehicles: vehicles.map((v) => ({ id: v.id, name: v.name, available: v.status === "ACTIVA", note: STATUS_NOTE[v.status] })),
    workers: workers.map((w) => ({ id: w.id, name: w.fullName, position: w.position, defaultPay })),
  };
}
