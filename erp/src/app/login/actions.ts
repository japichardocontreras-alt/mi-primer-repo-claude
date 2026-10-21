"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { login } from "@/lib/auth/core";
import { SESSION_COOKIE } from "@/lib/auth/server";
import { toActionError, type ActionState } from "@/lib/actions";

const schema = z.object({
  email: z.string({ required_error: "Indique su correo." }).email("Correo no válido."),
  password: z.string({ required_error: "Indique su contraseña." }).min(1, "Indique su contraseña."),
});

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target = "/";
  try {
    const data = schema.parse({ email: fd.get("email") || undefined, password: fd.get("password") || undefined });
    const h = await headers();
    const result = await login(prisma, data.email, data.password, {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    });
    if (!result.ok) return { ok: false, message: result.error, at: Date.now() };
    (await cookies()).set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
      sameSite: "lax",
      path: "/",
      expires: result.expiresAt,
    });
    const next = String(fd.get("next") || "/");
    target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  } catch (e) {
    return toActionError(e);
  }
  redirect(target);
}
