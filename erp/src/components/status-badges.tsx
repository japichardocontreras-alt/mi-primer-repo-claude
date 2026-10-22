import { Badge } from "./ui/badge";
import { REQUEST_STATUS, type RequestStatusKey } from "@/lib/domain/labels";

export function RequestStatusBadge({ status }: { status: string }) {
  const s = REQUEST_STATUS[status as RequestStatusKey];
  return s ? <Badge tone={s.tone}>{s.label}</Badge> : <Badge>{status}</Badge>;
}
