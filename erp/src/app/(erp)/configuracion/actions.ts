"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, withTransaction } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/auth/server";
import { getSetting, saveSetting, type SettingKey } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/core";
import { ALL_PERMISSIONS, ROLE_ADMIN } from "@/lib/auth/permissions";
import { BusinessError, formToObject, toActionError, type ActionState } from "@/lib/actions";

const ok = (message: string): ActionState => ({ ok: true, message, at: Date.now() });

// ---------------------------------------------------------------- Parámetros
export async function saveSettingAction(key: SettingKey, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission(key === "finanzas" ? "costos.editar" : "config.empresa");
    const before = await getSetting(prisma, key);
    const after = await saveSetting(prisma, key, formToObject(fd), user.id);
    await audit(prisma, { userId: user.id, action: "EDITAR", entity: "Configuración", entityId: key, before, after, ip: await clientIp() });
    revalidatePath("/configuracion");
    return ok("Cambios guardados.");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------- Usuarios
const emailSchema = z.string({ required_error: "Indique el correo." }).trim().toLowerCase().email("Correo no válido.");
const nameSchema = z.string({ required_error: "Indique el nombre." }).trim().min(3, "Nombre demasiado corto.").max(120);
const passwordSchema = z.string({ required_error: "Indique una contraseña temporal." }).superRefine((p, ctx) => {
  const problem = passwordProblem(p);
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});

async function ensureAnotherActiveAdmin(tx: Parameters<Parameters<typeof withTransaction>[0]>[0], userId: string) {
  const admins = await tx.user.count({ where: { active: true, role: { key: ROLE_ADMIN }, id: { not: userId } } });
  if (admins === 0) throw new BusinessError("Debe existir al menos un administrador activo.");
}

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await assertPermission("config.usuarios");
    const data = z
      .object({ name: nameSchema, email: emailSchema, roleId: z.string().uuid("Seleccione un rol."), password: passwordSchema })
      .parse(formToObject(fd));
    const created = await withTransaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: data.email } })) throw new BusinessError("Ya existe un usuario con ese correo.");
      const u = await tx.user.create({
        data: { name: data.name, email: data.email, roleId: data.roleId, passwordHash: await hashPassword(data.password), mustChangePassword: true },
      });
      await audit(tx, { userId: user.id, action: "CREAR", entity: "Usuario", entityId: u.id, summary: `Alta de ${u.email}`, after: { name: u.name, email: u.email, roleId: u.roleId }, ip: await clientIp() });
      return u;
    });
    revalidatePath("/configuracion/usuarios");
    return { ...ok(`Usuario ${created.email} creado. Deberá cambiar su contraseña al entrar.`), fieldErrors: undefined };
  } catch (e) {
    return toActionError(e);
  }
}

export async function updateUserAction(userId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await assertPermission("config.usuarios");
    const raw = formToObject(fd);
    const data = z
      .object({ name: nameSchema, email: emailSchema, roleId: z.string().uuid("Seleccione un rol."), active: z.boolean(), version: z.coerce.number().int() })
      .parse({ ...raw, active: raw.active === "on" });
    await withTransaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { role: true } });
      const newRole = await tx.role.findUniqueOrThrow({ where: { id: data.roleId } });
      const losesAdmin = before.role.key === ROLE_ADMIN && (newRole.key !== ROLE_ADMIN || !data.active);
      if (losesAdmin) await ensureAnotherActiveAdmin(tx, userId);
      if (userId === actor.id && !data.active) throw new BusinessError("No puede desactivar su propio usuario.");
      const dup = await tx.user.findFirst({ where: { email: data.email, id: { not: userId } } });
      if (dup) throw new BusinessError("Ya existe otro usuario con ese correo.");
      // Concurrencia optimista: si otro usuario modificó el registro, no se sobrescribe.
      const res = await tx.user.updateMany({
        where: { id: userId, version: data.version },
        data: { name: data.name, email: data.email, roleId: data.roleId, active: data.active, version: { increment: 1 } },
      });
      if (res.count === 0) throw new BusinessError("Otro usuario modificó este registro. Recargue la página para ver los cambios.");
      if (!data.active) await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit(tx, {
        userId: actor.id, action: "EDITAR", entity: "Usuario", entityId: userId,
        before: { name: before.name, email: before.email, role: before.role.key, active: before.active },
        after: { name: data.name, email: data.email, role: newRole.key, active: data.active },
        ip: await clientIp(),
      });
    });
    revalidatePath(`/configuracion/usuarios/${userId}`);
    revalidatePath("/configuracion/usuarios");
    return ok("Usuario actualizado.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function resetPasswordAction(userId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await assertPermission("config.usuarios");
    const { password } = z.object({ password: passwordSchema }).parse(formToObject(fd));
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null, version: { increment: 1 } } });
    await revokeAllUserSessions(prisma, userId);
    await audit(prisma, { userId: actor.id, action: "RESTABLECER_CONTRASENA", entity: "Usuario", entityId: userId, ip: await clientIp() });
    revalidatePath(`/configuracion/usuarios/${userId}`);
    return ok("Contraseña restablecida. Se cerraron sus sesiones y deberá cambiarla al entrar.");
  } catch (e) {
    return toActionError(e);
  }
}

export async function revokeSessionsAction(userId: string, _prev: ActionState): Promise<ActionState> {
  try {
    const actor = await assertPermission("config.usuarios");
    await revokeAllUserSessions(prisma, userId, userId === actor.id ? actor.sessionId : undefined);
    await audit(prisma, { userId: actor.id, action: "CERRAR_SESIONES", entity: "Usuario", entityId: userId, ip: await clientIp() });
    revalidatePath(`/configuracion/usuarios/${userId}`);
    return ok("Sesiones cerradas.");
  } catch (e) {
    return toActionError(e);
  }
}

/** Permisos individuales: "rol" (hereda), "conceder" o "revocar". */
export async function saveUserPermissionsAction(userId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await assertPermission("config.permisos");
    const perms = await prisma.permission.findMany();
    const overrides: { permissionId: string; granted: boolean; key: string }[] = [];
    for (const p of perms) {
      const v = fd.get(`perm:${p.key}`);
      if (v === "conceder") overrides.push({ permissionId: p.id, granted: true, key: p.key });
      else if (v === "revocar") overrides.push({ permissionId: p.id, granted: false, key: p.key });
    }
    await withTransaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      if (overrides.length) await tx.userPermission.createMany({ data: overrides.map((o) => ({ userId, permissionId: o.permissionId, granted: o.granted })) });
      await audit(tx, { userId: actor.id, action: "PERMISOS_USUARIO", entity: "Usuario", entityId: userId, after: overrides.map((o) => `${o.granted ? "+" : "-"}${o.key}`), ip: await clientIp() });
    });
    revalidatePath(`/configuracion/usuarios/${userId}`);
    return ok("Permisos individuales guardados.");
  } catch (e) {
    return toActionError(e);
  }
}

// ---------------------------------------------------------------- Roles
export async function saveRolePermissionsAction(roleId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const actor = await assertPermission("config.permisos");
    const role = await prisma.role.findUniqueOrThrow({ where: { id: roleId } });
    if (role.key === ROLE_ADMIN) throw new BusinessError("El rol Administrador siempre tiene todos los permisos.");
    const keys = ALL_PERMISSIONS.filter((k) => fd.get(`perm:${k}`) === "on");
    await withTransaction(async (tx) => {
      const perms = await tx.permission.findMany({ where: { key: { in: keys } } });
      const before = await tx.rolePermission.findMany({ where: { roleId }, include: { permission: true } });
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (perms.length) await tx.rolePermission.createMany({ data: perms.map((p) => ({ roleId, permissionId: p.id })) });
      await audit(tx, { userId: actor.id, action: "PERMISOS_ROL", entity: "Rol", entityId: roleId, summary: role.name, before: before.map((b) => b.permission.key), after: keys, ip: await clientIp() });
    });
    revalidatePath("/configuracion/roles");
    return ok(`Permisos del rol ${role.name} guardados.`);
  } catch (e) {
    return toActionError(e);
  }
}
