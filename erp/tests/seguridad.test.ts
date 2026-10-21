/**
 * FASE 9 — Permisos y errores de conexión.
 * - Revisión estática: toda server action y toda ruta de API valida sesión/permiso en el servidor.
 * - Conexión: con la base de datos inaccesible el usuario recibe un mensaje claro y no se guarda nada a medias.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { isConnectionError, toActionError } from "@/lib/actions";
import { testDbUrl } from "./helpers";

const AUTH = ["assertPermission(", "getCurrentUser(", "requireUser(", "requirePermission(", "actorFor("];

describe("Permisos validados en el servidor", () => {
  it("cada server action exportada verifica sesión o permiso (excepto el inicio de sesión)", () => {
    const files = globSync("src/app/**/*actions.ts");
    expect(files.length).toBeGreaterThan(8);
    const missing: string[] = [];
    let count = 0;
    for (const f of files) {
      const parts = readFileSync(f, "utf8").split(/\nexport async function /).slice(1);
      for (const p of parts) {
        count++;
        const name = p.slice(0, p.indexOf("("));
        const body = p.split("\nexport ")[0];
        if (name === "loginAction") continue;
        if (!AUTH.some((k) => body.includes(k))) missing.push(`${f}: ${name}`);
      }
    }
    expect(count).toBeGreaterThan(50);
    expect(missing).toEqual([]);
  });

  it("cada ruta de API (salvo /api/health) valida la sesión y usa el manejador seguro", () => {
    const routes = globSync("src/app/api/**/route.ts").filter((f) => !f.includes("health"));
    expect(routes.length).toBeGreaterThan(8);
    for (const f of routes) {
      const s = readFileSync(f, "utf8");
      expect(AUTH.some((k) => s.includes(k)), f).toBe(true);
      expect(s, f).toContain("safeRoute(");
    }
  });

  it("las páginas del ERP exigen sesión (requireUser/requirePermission) o la heredan del layout", () => {
    const layout = readFileSync("src/app/(erp)/layout.tsx", "utf8");
    expect(layout).toMatch(/requireUser\(|getCurrentUser\(/);
    const pages = globSync("src/app/(erp)/**/page.tsx");
    const unchecked = pages.filter((f) => !/requirePermission\(|requireUser\(/.test(readFileSync(f, "utf8")));
    // Inicio y cambiar contraseña solo requieren sesión (ya validada por el layout)
    expect(unchecked.filter((f) => !/\(erp\)\/page\.tsx$|cambiar-contrasena/.test(f))).toEqual([]);
  });
});

describe("Errores de conexión con la base de datos", () => {
  it("una base inaccesible produce un mensaje claro y el código DB_UNAVAILABLE", async () => {
    const u = new URL(testDbUrl());
    u.port = "1"; // puerto cerrado
    const down = new PrismaClient({ datasourceUrl: u.toString() });
    let err: unknown;
    try {
      await down.client.count();
    } catch (e) {
      err = e;
    } finally {
      await down.$disconnect().catch(() => {});
    }
    expect(err).toBeDefined();
    expect(isConnectionError(err)).toBe(true);
    const st = toActionError(err);
    expect(st).toMatchObject({ ok: false, code: "DB_UNAVAILABLE" });
    expect(st.message).toMatch(/No hay conexión con la base de datos/);
  });

  it("los errores de negocio y de validación no se confunden con fallas de conexión", () => {
    expect(isConnectionError(new Error("cualquier cosa"))).toBe(false);
    expect(toActionError(new Error("x")).message).toMatch(/No se guardaron cambios/);
  });
});
