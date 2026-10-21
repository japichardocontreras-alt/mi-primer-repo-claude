"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, ClipboardList, CalendarDays, ClipboardCheck, Users, HardHat, Truck, Landmark, BarChart3, Settings, ChevronsLeft, ChevronsRight, X,
} from "lucide-react";
import { BrandMark } from "../brand-logo";
import { cn } from "@/lib/utils";
import { NAV, CURRENT_PHASE } from "@/lib/nav";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inicio: Home, solicitudes: ClipboardList, agenda: CalendarDays, servicios: ClipboardCheck, clientes: Users,
  personal: HardHat, flotilla: Truck, finanzas: Landmark, resultados: BarChart3, configuracion: Settings,
};

function NavLinks({ allowed, collapsed, onNavigate }: { allowed: string[]; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {NAV.filter((n) => allowed.includes(n.key)).map((n) => {
        const Icon = ICONS[n.key];
        const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        const pending = n.phase > CURRENT_PHASE;
        return (
          <Link
            key={n.key}
            href={n.href}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-600 text-white shadow-sm" : "text-neutral-300 hover:bg-white/5 hover:text-white",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-neutral-400 group-hover:text-white")} />
            {!collapsed && <span className="flex-1 truncate">{n.label}</span>}
            {!collapsed && pending && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">F{n.phase}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex h-16 items-center gap-3 border-b border-white/10 px-4", collapsed && "justify-center px-2")}>
      <BrandMark className="h-9 w-9 shrink-0" />
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-white">MUDANZAS METEPEC</p>
          <p className="text-[11px] font-semibold tracking-[0.25em] text-brand-400">ERP</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ allowed, initialCollapsed }: { allowed: string[]; initialCollapsed: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const v = !collapsed;
    setCollapsed(v);
    document.cookie = `mm_sidebar=${v ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <aside className={cn("hidden shrink-0 flex-col bg-ink transition-[width] duration-200 lg:flex", collapsed ? "w-[72px]" : "w-64")}>
      <Brand collapsed={collapsed} />
      <NavLinks allowed={allowed} collapsed={collapsed} />
      <button
        onClick={toggle}
        className="flex h-11 items-center justify-center gap-2 border-t border-white/10 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
        aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : (<><ChevronsLeft className="h-4 w-4" /> Contraer</>)}
      </button>
    </aside>
  );
}

export function MobileNav({ allowed, open, onClose }: { allowed: string[]; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink shadow-xl">
        <div className="relative">
          <Brand collapsed={false} />
          <button onClick={onClose} className="absolute right-3 top-4 rounded-md p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavLinks allowed={allowed} collapsed={false} onNavigate={onClose} />
      </aside>
    </div>
  );
}
