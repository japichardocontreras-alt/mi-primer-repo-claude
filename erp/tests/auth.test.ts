import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateData } from "./helpers";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { login, validateSession, revokeSession, revokeAllUserSessions, MAX_FAILED_LOGINS } from "@/lib/auth/core";
import { resolvePermissions, ROLE_ADMIN, ROLE_STAFF, ALL_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from "@/lib/auth/permissions";

const db = testDb();
const PASS = "ClaveSegura2026";

async function makeUser(roleKey = ROLE_STAFF, email = "ana@test.mx") {
  const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
  return db.user.create({ data: { email, name: "Ana Prueba", passwordHash: await hashPassword(PASS), roleId: role.id } });
}

beforeEach(() => truncateData(db));
afterAll(() => db.$disconnect());

describe("Contraseñas", () => {
  it("exige longitud mínima y letras + números", () => {
    expect(passwordProblem("corta1")).toMatch(/al menos/);
    expect(passwordProblem("solamenteletras")).toMatch(/letras y números/);
    expect(passwordProblem(PASS)).toBeNull();
  });
  it("no guarda contraseñas en claro", async () => {
    const u = await makeUser();
    expect(u.passwordHash).not.toContain(PASS);
    expect(u.passwordHash.startsWith("$2")).toBe(true);
  });
});

describe("Inicio de sesión y sesiones", () => {
  it("inicia sesión con credenciales válidas (correo sin distinguir mayúsculas) y guarda solo el hash del token", async () => {
    const u = await makeUser();
    const r = await login(db, "  ANA@test.mx ", PASS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = await db.session.findFirstOrThrow({ where: { userId: u.id } });
    expect(s.tokenHash).not.toBe(r.token);
    const su = await validateSession(db, r.token);
    expect(su?.id).toBe(u.id);
    expect(await db.auditLog.count({ where: { action: "LOGIN", userId: u.id } })).toBe(1);
  });

  it("rechaza contraseña incorrecta y usuario inexistente con el mismo mensaje", async () => {
    await makeUser();
    const a = await login(db, "ana@test.mx", "incorrecta123");
    const b = await login(db, "nadie@test.mx", "incorrecta123");
    expect(a).toEqual({ ok: false, error: "Correo o contraseña incorrectos." });
    expect(b).toEqual(a);
  });

  it(`bloquea temporalmente tras ${MAX_FAILED_LOGINS} intentos fallidos`, async () => {
    await makeUser();
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await login(db, "ana@test.mx", "mala-clave-1");
    const r = await login(db, "ana@test.mx", PASS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/bloqueado/);
  });

  it("rechaza usuarios desactivados y sus sesiones dejan de ser válidas", async () => {
    const u = await makeUser();
    const r = await login(db, "ana@test.mx", PASS);
    if (!r.ok) throw new Error();
    await db.user.update({ where: { id: u.id }, data: { active: false } });
    expect(await validateSession(db, r.token)).toBeNull();
    expect((await login(db, "ana@test.mx", PASS)).ok).toBe(false);
  });

  it("invalida sesiones cerradas, expiradas o con token alterado", async () => {
    const u = await makeUser();
    const r1 = await login(db, "ana@test.mx", PASS);
    const r2 = await login(db, "ana@test.mx", PASS);
    if (!r1.ok || !r2.ok) throw new Error();
    expect(await validateSession(db, r1.token + "x")).toBeNull();
    await revokeSession(db, r1.token);
    expect(await validateSession(db, r1.token)).toBeNull();
    expect(await validateSession(db, r2.token)).not.toBeNull();
    await db.session.updateMany({ where: { userId: u.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSession(db, r2.token)).toBeNull();
  });

  it("cerrar todas las sesiones conserva la actual si se indica", async () => {
    const u = await makeUser();
    const r1 = await login(db, "ana@test.mx", PASS);
    const r2 = await login(db, "ana@test.mx", PASS);
    if (!r1.ok || !r2.ok) throw new Error();
    const keep = (await validateSession(db, r2.token))!;
    await revokeAllUserSessions(db, u.id, keep.sessionId);
    expect(await validateSession(db, r1.token)).toBeNull();
    expect(await validateSession(db, r2.token)).not.toBeNull();
  });
});

describe("Permisos", () => {
  it("el administrador tiene todos los permisos", async () => {
    const u = await makeUser(ROLE_ADMIN, "admin@test.mx");
    const r = await login(db, "admin@test.mx", PASS);
    if (!r.ok) throw new Error();
    const su = await validateSession(db, r.token);
    expect(su?.id).toBe(u.id);
    expect([...su!.permissions].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });

  it("el rol administrativo recibe sus permisos por defecto y no ve finanzas ni configuración", async () => {
    await makeUser();
    const r = await login(db, "ana@test.mx", PASS);
    if (!r.ok) throw new Error();
    const su = (await validateSession(db, r.token))!;
    expect([...su.permissions].sort()).toEqual([...DEFAULT_STAFF_PERMISSIONS].sort());
    expect(su.permissions.has("finanzas.ver")).toBe(false);
    expect(su.permissions.has("config.usuarios")).toBe(false);
  });

  it("los ajustes individuales conceden o revocan sobre el rol", async () => {
    const u = await makeUser();
    const fin = await db.permission.findUniqueOrThrow({ where: { key: "finanzas.ver" } });
    const sol = await db.permission.findUniqueOrThrow({ where: { key: "solicitudes.crear" } });
    await db.userPermission.createMany({ data: [{ userId: u.id, permissionId: fin.id, granted: true }, { userId: u.id, permissionId: sol.id, granted: false }] });
    const r = await login(db, "ana@test.mx", PASS);
    if (!r.ok) throw new Error();
    const su = (await validateSession(db, r.token))!;
    expect(su.permissions.has("finanzas.ver")).toBe(true);
    expect(su.permissions.has("solicitudes.crear")).toBe(false);
  });

  it("resolvePermissions: un revocado no afecta al administrador", () => {
    expect(resolvePermissions(ROLE_ADMIN, [], [{ key: "finanzas.ver", granted: false }]).has("finanzas.ver")).toBe(true);
  });
});
