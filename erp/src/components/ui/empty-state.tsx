import * as React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, icon, action }: { title: string; description?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-neutral-100 p-3 text-neutral-500">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
