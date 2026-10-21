import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...p }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...p} />
    </div>
  );
}
export function Th({ className, ...p }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("whitespace-nowrap border-b border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-600", className)} {...p} />;
}
export function Td({ className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-neutral-100 px-3 py-2.5 align-middle text-neutral-800", className)} {...p} />;
}
export function Tr({ className, ...p }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-neutral-50/70", className)} {...p} />;
}
