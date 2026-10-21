import Link from "next/link";
import { cn } from "@/lib/utils";

export function PersonalTabs({ active, showPayroll, showRates }: { active: "personal" | "nomina" | "tarifas"; showPayroll: boolean; showRates: boolean }) {
  const tabs = [
    { key: "personal", href: "/personal", label: "Personal", show: true },
    { key: "nomina", href: "/personal/nomina", label: "Nómina y cortes", show: showPayroll },
    { key: "tarifas", href: "/personal/tarifas", label: "Tarifas por servicio", show: showRates },
  ].filter((t) => t.show);
  return (
    <div className="mb-6 overflow-x-auto border-b border-neutral-200">
      <nav className="-mb-px flex min-w-max gap-6">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={cn("border-b-2 px-1 pb-3 text-sm font-medium", active === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800")}>{t.label}</Link>
        ))}
      </nav>
    </div>
  );
}
