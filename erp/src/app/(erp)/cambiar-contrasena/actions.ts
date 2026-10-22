"use server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser, clientIp } from "@/lib/auth/server";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/core";
import { audit } from "@/lib/audit";
import { BusinessError, toActionError, type ActionState } from "@/lib/actions";

const schema = z
  .object({
    current: z.string().min(1, "Indique su contraseña actual."),
    password: z.string().min(1, "Indique la nueva contraseña."),
    confirm: z.string().min(1, "Confirme la nueva contraseña."),
  })
  .superRefine((v, ctx) => {
    const p = passwordProblem(v.password);
    if (p) ctx.addIssue({ code: "custom", path: ["password"], message: p });
    if (v.password !== v.confirm) ctx.addIssue({ code: "custom", path: ["confirm"], message: "Las contraseñas no coinciden." });
    if (v.password === v.current) ctx.addIssue({ code: "custom", path: ["password"], message: "La nueva contraseña debe ser diferente." });
  });

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new BusinessError("Su sesión expiró. Inicie sesión de nuevo.");
    const data = schema.parse({ current: fd.get("current") ?? "", password: fd.get("password") ?? "", confirm: fd.get("confirm") ?? "" });
    const db = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(data.current, db.passwordHash))) {
      return { ok: false, fieldErrors: { current: "La contraseña actual no es correcta." }, message: "Revise los campos marcados.", at: Date.now() };
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.password), mustChangePassword: false, version: { increment: 1 } } });
    await revokeAllUserSessions(prisma, user.id, user.sessionId);
    await audit(prisma, { userId: user.id, action: "CAMBIO_CONTRASENA", entity: "Usuario", entityId: user.id, ip: await clientIp() });
    return { ok: true, message: "Contraseña actualizada. Las demás sesiones abiertas se cerraron.", at: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}
