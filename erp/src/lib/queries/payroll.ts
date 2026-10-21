import type { PeriodType } from "@prisma/client";
import type { Db } from "../db";
import { periodRange, pendingBalance, workerAccount } from "../domain/payroll";

/** Resumen de nómina de todos los trabajadores para un periodo. */
export async function payrollSummary(db: Db, type: PeriodType, ref: string) {
  const p = periodRange(type, ref);
  const workers = await db.worker.findMany({ orderBy: [{ active: "desc" }, { fullName: "asc" }] });
  const rows = await Promise.all(
    workers.map(async (w) => {
      const [inPeriod, all] = await Promise.all([workerAccount(db, w.id, { start: p.start, end: p.end }), workerAccount(db, w.id)]);
      return {
        w,
        servicios: inPeriod.totals.serviciosRealizados,
        porServicio: inPeriod.totals.servicios,
        otros: inPeriod.totals.sueldoBase + inPeriod.totals.bonos + inPeriod.totals.horasExtra + inPeriod.totals.otros,
        deducciones: inPeriod.totals.deducciones,
        devengado: inPeriod.totals.devengado,
        pagado: inPeriod.totals.pagado,
        saldo: pendingBalance(all.totals),
      };
    }),
  );
  return { period: p, rows: rows.filter((r) => r.w.active || r.devengado || r.pagado || r.saldo) };
}
