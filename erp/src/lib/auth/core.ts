/**
 * Lógica de autenticación independiente de Next.js (probada con Vitest).
 * Sesiones en base de datos: la cookie guarda un token aleatorio y la BD solo su hash SHA-256.
 */
import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "./password";
import { resolvePermissions } from "./permissions";
import { audit } from "../audit";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export function sessionTtlMs() {
  const h = Number(process.env.SESSION_TTL_HOURS ?? 12);
  return (Number.isFinite(h) && h > 0 ? h : 12) * 3600_000;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; userId: string }
  | { ok: false; error: string };

const GENERIC_ERROR = "Correo o contraseña incorrectos.";

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe.
let dummyHash: Promise<string> | null = null;

export async function login(
  db: PrismaClient,
  emailRaw: string,
  password: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    dummyHash ??= hashPassword("usuario-inexistente");
    await verifyPassword(password, await dummyHash);
    return { ok: false, error: GENERIC_ERROR };
  }
  if (!user.active) return { ok: false, error: "El usuario está desactivado. Contacte al administrador." };
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: `Usuario bloqueado temporalmente por intentos fallidos. Intente después de ${LOCK_MINUTES} minutos.` };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
    });
    await audit(db, { userId: user.id, action: lock ? "BLOQUEO" : "LOGIN_FALLIDO", entity: "Usuario", entityId: user.id, ip: meta.ip });
    return { ok: false, error: GENERIC_ERROR };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await db.$transaction(async (tx) => {
    await tx.session.create({
      data: { tokenHash: hashToken(token), userId: user.id, expiresAt, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null },
    });
    await tx.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
    await audit(tx, { userId: user.id, action: "LOGIN", entity: "Usuario", entityId: user.id, ip: meta.ip });
  });
  return { ok: true, token, expiresAt, userId: user.id };
}

export type SessionUser = {
  id: string;
  sessionId: string;
  email: string;
  name: string;
  roleKey: string;
  roleName: string;
  mustChangePassword: boolean;
  permissions: Set<string>;
};

export async function validateSession(db: PrismaClient, token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
          permissions: { include: { permission: true } },
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;

  // Actualiza la última actividad como máximo cada 5 minutos.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  const u = session.user;
  return {
    id: u.id,
    sessionId: session.id,
    email: u.email,
    name: u.name,
    roleKey: u.role.key,
    roleName: u.role.name,
    mustChangePassword: u.mustChangePassword,
    permissions: resolvePermissions(
      u.role.key,
      u.role.permissions.map((rp) => rp.permission.key),
      u.permissions.map((up) => ({ key: up.permission.key, granted: up.granted })),
    ),
  };
}

export async function revokeSession(db: PrismaClient, token: string) {
  await db.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllUserSessions(db: PrismaClient, userId: string, exceptSessionId?: string) {
  await db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}
