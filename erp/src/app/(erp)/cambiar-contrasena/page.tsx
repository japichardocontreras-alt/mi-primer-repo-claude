import { requireUser } from "@/lib/auth/server";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "./form";

export const metadata = { title: "Cambiar contraseña" };

export default async function Page() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Cambiar contraseña" />
      {user.mustChangePassword && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Por seguridad debe definir una contraseña personal antes de continuar.
        </div>
      )}
      <Card>
        <CardHeader title={user.email} description={user.roleName} />
        <CardBody><ChangePasswordForm /></CardBody>
      </Card>
    </div>
  );
}
