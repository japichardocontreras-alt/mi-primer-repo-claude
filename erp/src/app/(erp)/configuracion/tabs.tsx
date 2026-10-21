"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ConfigTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="mb-6 overflow-x-auto border-b border-neutral-200">
      <nav className="-mb-px flex min-w-max gap-6">
        {tabs.map((t) => {
          const active = t.href === "/configuracion" ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={cn("border-b-2 px-1 pb-3 text-sm font-medium", active ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800")}>
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
