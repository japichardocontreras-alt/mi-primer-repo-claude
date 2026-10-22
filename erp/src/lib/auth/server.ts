import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { validateSession, type SessionUser } from "./core";
import type { PermissionKey } from "./permissions";
import { PermissionError } from "../errors";

export { PermissionError };

export const SESSION_COOKIE = "mm_session";

/** Usuario de la petición actual (memorizado por petición). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return validateSession(prisma, token);
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function can(user: SessionUser | null, perm: PermissionKey) {
  return !!user && user.permissions.has(perm);
}

/** Para páginas: redirige si no hay sesión y muestra 403 si falta el permiso. */
export async function requirePermission(perm: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/cambiar-contrasena");
  if (!user.permissions.has(perm)) redirect(`/sin-permiso?p=${encodeURIComponent(perm)}`);
  return user;
}


/** Para server actions / API: lanza error si falta sesión o permiso. */
export async function assertPermission(perm: PermissionKey): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new PermissionError("sesion");
  if (!user.permissions.has(perm)) throw new PermissionError(perm);
  return user;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
