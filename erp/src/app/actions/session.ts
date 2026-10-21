"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { revokeSession } from "@/lib/auth/core";
import { SESSION_COOKIE, getCurrentUser, clientIp } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = await getCurrentUser();
  if (token) await revokeSession(prisma, token);
  if (user) await audit(prisma, { userId: user.id, action: "LOGOUT", entity: "Usuario", entityId: user.id, ip: await clientIp() });
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({ where: { OR: [{ userId: user.id }, { userId: null }], readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
