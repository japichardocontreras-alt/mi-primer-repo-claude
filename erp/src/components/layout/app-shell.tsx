"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Bell, LogOut, KeyRound, ChevronDown } from "lucide-react";
import { Sidebar, MobileNav } from "./sidebar";
import { GlobalSearch } from "./global-search";
import { logoutAction, markNotificationsReadAction } from "@/app/actions/session";

export type ShellNotification = { id: string; title: string; body: string | null; link: string | null; createdAt: string; read: boolean };

function useClickOutside(onOut: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOut(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onOut]);
  return ref;
}

function Notifications({ items }: { items: ShellNotification[] }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const unread = items.filter((n) => !n.read).length;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-md p-2 text-neutral-600 hover:bg-neutral-100" aria-label="Notificaciones">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 max-w-[90vw] rounded-md border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
            <p className="text-sm font-semibold">Notificaciones</p>
            {unread > 0 && (
              <form action={markNotificationsReadAction}>
                <button className="text-xs font-medium text-brand-600 hover:underline">Marcar como leídas</button>
              </form>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-neutral-500">No hay notificaciones.</p>}
            {items.map((n) => {
              const content = (
                <>
                  <p className={`text-sm ${n.read ? "text-neutral-600" : "font-semibold text-neutral-900"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-neutral-500">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400">{n.createdAt}</p>
                </>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block border-b border-neutral-50 px-4 py-2.5 hover:bg-neutral-50">{content}</Link>
              ) : (
                <div key={n.id} className="border-b border-neutral-50 px-4 py-2.5">{content}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-neutral-100">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-neutral-900">{name}</span>
          <span className="block text-[11px] text-neutral-500">{role}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-neutral-400 sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
          <div className="border-b border-neutral-100 px-4 py-2 sm:hidden">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-neutral-500">{role}</p>
          </div>
          <Link href="/cambiar-contrasena" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
            <KeyRound className="h-4 w-4" /> Cambiar contraseña
          </Link>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AppShell({ allowed, user, notifications, initialCollapsed, children }: {
  allowed: string[]; user: { name: string; role: string }; notifications: ShellNotification[]; initialCollapsed: boolean; children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex h-dvh overflow-hidden bg-neutral-100">
      <Sidebar allowed={allowed} initialCollapsed={initialCollapsed} />
      <MobileNav allowed={allowed} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Notifications items={notifications} />
            <UserMenu name={user.name} role={user.role} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
