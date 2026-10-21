import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { NAV } from "@/lib/nav";
import { formatDateTime } from "@/lib/format";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const allowed = NAV.filter((n) => user.permissions.has(n.permission)).map((n) => n.key);
  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: user.id }, { userId: null }] },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const collapsed = (await cookies()).get("mm_sidebar")?.value === "1";
  return (
    <AppShell
      allowed={allowed}
      user={{ name: user.name, role: user.roleName }}
      initialCollapsed={collapsed}
      notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: !!n.readAt, createdAt: formatDateTime(n.createdAt) }))}
    >
      {children}
    </AppShell>
  );
}
