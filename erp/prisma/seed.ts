/**
 * Seed idempotente: crea/actualiza CATÁLOGOS del sistema (no datos operativos).
 *  - Roles y permisos
 *  - Categorías contables
 *  - Parámetros por defecto
 *  - Unidades iniciales de la flotilla (solo nombre; los datos técnicos se capturan en el módulo Flotilla)
 *  - Usuario administrador inicial (solo si no existe ningún usuario; credenciales desde variables de entorno)
 * Puede ejecutarse varias veces sin duplicar información.
 */
import { PrismaClient, ExpenseGroup } from "@prisma/client";
import { ALL_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS, PERMISSIONS, ROLE_ADMIN, ROLE_STAFF } from "../src/lib/auth/permissions";
import { hashPassword, passwordProblem } from "../src/lib/auth/password";
import { SETTINGS, type SettingKey } from "../src/lib/settings";

const CATEGORIES: { key: string; name: string; group: ExpenseGroup }[] = [
  // Gastos directos (se vinculan al folio del servicio)
  { key: "COMBUSTIBLE", name: "Combustible", group: "DIRECTO" },
  { key: "CASETAS", name: "Casetas", group: "DIRECTO" },
  { key: "MANIOBRAS", name: "Maniobras", group: "DIRECTO" },
  { key: "PERSONAL_EVENTUAL", name: "Personal eventual (fuera de nómina)", group: "DIRECTO" },
  { key: "VIATICOS", name: "Viáticos", group: "DIRECTO" },
  { key: "ESTACIONAMIENTOS", name: "Estacionamientos", group: "DIRECTO" },
  { key: "MATERIAL_EMBALAJE", name: "Material de embalaje", group: "DIRECTO" },
  { key: "OTROS_DIRECTOS", name: "Otros gastos directos", group: "DIRECTO" },
  // Gastos fijos
  { key: "RENTA", name: "Renta", group: "FIJO" },
  { key: "ADMINISTRACION", name: "Administración", group: "FIJO" },
  { key: "SUELDOS_FIJOS", name: "Sueldos fijos (fuera del módulo de nómina)", group: "FIJO" },
  { key: "TELEFONIA", name: "Telefonía", group: "FIJO" },
  { key: "INTERNET", name: "Internet", group: "FIJO" },
  { key: "PUBLICIDAD", name: "Publicidad", group: "FIJO" },
  { key: "SEGUROS", name: "Seguros", group: "FIJO" },
  { key: "GPS", name: "GPS", group: "FIJO" },
  { key: "SERVICIOS", name: "Servicios (luz, agua, etc.)", group: "FIJO" },
  { key: "SOFTWARE", name: "Software", group: "FIJO" },
  { key: "IMPUESTOS_DERECHOS", name: "Impuestos y derechos", group: "FIJO" },
  { key: "OTROS_FIJOS", name: "Otros gastos fijos", group: "FIJO" },
  // Flotilla
  { key: "MANTENIMIENTO", name: "Mantenimiento vehicular", group: "FLOTILLA" },
  { key: "DOCUMENTACION_VEHICULAR", name: "Documentación vehicular (verificación, tenencia, tarjeta)", group: "FLOTILLA" },
  { key: "COMBUSTIBLE_UNIDAD", name: "Combustible no ligado a servicio", group: "FLOTILLA" },
  // Extraordinarios
  { key: "GASTO_EXTRAORDINARIO", name: "Gasto extraordinario", group: "EXTRAORDINARIO" },
];

const INITIAL_VEHICLES = [
  { code: "F350-1", name: "F350 #1", brand: "Ford", model: "F350" },
  { code: "F350-2", name: "F350 #2", brand: "Ford", model: "F350" },
  { code: "CAM-2.5T", name: "Camioneta 2.5 toneladas", capacity: "2.5 t" },
  { code: "CAM-1.5T", name: "Camioneta 1.5 toneladas cerrada", capacity: "1.5 t" },
];

export async function seed(db: PrismaClient, opts: { withAdmin?: boolean; withVehicles?: boolean } = {}) {
  const { withAdmin = true, withVehicles = true } = opts;

  for (const key of ALL_PERMISSIONS) {
    const p = PERMISSIONS[key];
    await db.permission.upsert({ where: { key }, create: { key, module: p.module, description: p.description }, update: { module: p.module, description: p.description } });
  }

  const admin = await db.role.upsert({
    where: { key: ROLE_ADMIN },
    create: { key: ROLE_ADMIN, name: "Administrador", description: "Acceso completo, configuración, costos, finanzas y usuarios.", isSystem: true },
    update: {},
  });
  const staff = await db.role.upsert({
    where: { key: ROLE_STAFF },
    create: { key: ROLE_STAFF, name: "Administrativo", description: "Captura de solicitudes, agenda, clientes, asignaciones y operaciones autorizadas.", isSystem: true },
    update: {},
  });

  const perms = await db.permission.findMany();
  const byKey = new Map(perms.map((p) => [p.key, p.id]));
  // El administrador recibe todos los permisos (incluidos los nuevos).
  await db.rolePermission.createMany({ data: perms.map((p) => ({ roleId: admin.id, permissionId: p.id })), skipDuplicates: true });
  // El rol administrativo solo recibe sus permisos por defecto la primera vez (después los define el administrador).
  const staffHasAny = await db.rolePermission.count({ where: { roleId: staff.id } });
  if (staffHasAny === 0) {
    await db.rolePermission.createMany({ data: DEFAULT_STAFF_PERMISSIONS.map((k) => ({ roleId: staff.id, permissionId: byKey.get(k)! })) });
  }

  for (const c of CATEGORIES) {
    await db.expenseCategory.upsert({ where: { key: c.key }, create: { ...c, isSystem: true }, update: { name: c.name, group: c.group } });
  }

  for (const key of Object.keys(SETTINGS) as SettingKey[]) {
    await db.setting.upsert({ where: { key }, create: { key, value: SETTINGS[key].parse({}) as object }, update: {} });
  }

  if (withVehicles) {
    for (const v of INITIAL_VEHICLES) {
      await db.vehicle.upsert({ where: { code: v.code }, create: v, update: {} });
    }
  }

  if (withAdmin && (await db.user.count()) === 0) {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn("⚠  No se creó administrador: defina SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD.");
    } else {
      const problem = passwordProblem(password);
      if (problem) throw new Error(`SEED_ADMIN_PASSWORD no es válida: ${problem}`);
      await db.user.create({
        data: { email, name: process.env.SEED_ADMIN_NAME || "Administrador", passwordHash: await hashPassword(password), roleId: admin.id, mustChangePassword: true },
      });
      console.log(`✔ Administrador inicial creado: ${email} (deberá cambiar la contraseña al entrar)`);
    }
  }
}

if (require.main === module) {
  const db = new PrismaClient();
  seed(db)
    .then(() => console.log("✔ Catálogos del sistema listos."))
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
