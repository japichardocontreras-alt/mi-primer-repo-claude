import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { nextFolio, FOLIO } from "@/lib/folios";

const db = testDb();
beforeEach(() => truncateData(db));
afterAll(() => db.$disconnect());

describe("Folios generados en el backend", () => {
  it("usa el formato SOL-AAAA-000001 y consecutivos por año", async () => {
    const a = await nextFolio(db, FOLIO.SOLICITUD, new Date("2026-10-22T18:00:00Z"));
    const b = await nextFolio(db, FOLIO.SOLICITUD, new Date("2026-10-22T18:00:00Z"));
    const c = await nextFolio(db, FOLIO.SOLICITUD, new Date("2027-01-15T18:00:00Z"));
    expect([a, b, c]).toEqual(["SOL-2026-000001", "SOL-2026-000002", "SOL-2027-000001"]);
  });

  it("usa el año de la Ciudad de México (31-dic 20:00 local = 1-ene UTC)", async () => {
    expect(await nextFolio(db, FOLIO.SERVICIO, new Date("2027-01-01T02:00:00Z"))).toBe("MM-2026-000001");
  });

  it("los catálogos (clientes) no reinician por año", async () => {
    expect(await nextFolio(db, FOLIO.CLIENTE)).toBe("CLI-000001");
  });

  it("no duplica folios con 40 usuarios simultáneos", async () => {
    const at = new Date("2026-10-22T18:00:00Z");
    const folios = await Promise.all(Array.from({ length: 40 }, () => db.$transaction((tx) => nextFolio(tx, FOLIO.SERVICIO, at))));
    expect(new Set(folios).size).toBe(40);
    const nums = folios.map((f) => Number(f.split("-")[2])).sort((x, y) => x - y);
    expect(nums).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it("una transacción revertida no consume folio", async () => {
    const at = new Date("2026-10-22T18:00:00Z");
    await expect(db.$transaction(async (tx) => { await nextFolio(tx, FOLIO.COBRO, at); throw new Error("falla"); })).rejects.toThrow("falla");
    expect(await nextFolio(db, FOLIO.COBRO, at)).toBe("COB-2026-000001");
  });
});
