import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand-logo";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <div>
            <p className="text-lg font-bold tracking-wide">MUDANZAS METEPEC</p>
            <p className="text-xs font-semibold tracking-[0.3em] text-brand-400">ERP</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl font-semibold leading-tight">Toda la operación,<br />de la solicitud a la utilidad.</h1>
          <p className="mt-4 max-w-md text-sm text-neutral-400">
            Solicitudes, agenda, servicios, personal, flotilla y finanzas conectados en un solo sistema.
          </p>
        </div>
        <p className="text-xs text-neutral-500">Acceso exclusivo para personal autorizado.</p>
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-10 w-10" />
            <div>
              <p className="font-bold tracking-wide">MUDANZAS METEPEC</p>
              <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-600">ERP</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mb-6 mt-1 text-sm text-neutral-500">Ingrese con su usuario asignado.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
