// Recorrido integral en navegador (flujo obligatorio de la sección 19 + permisos + fallas de conexión).
// Corre contra un servidor conectado a una base AISLADA preparada con e2e/reset-e2e.ts. Ver e2e/README.md.
//
//   E2E_BASE_URL=http://localhost:3200 CHROMIUM_PATH=/ruta/chrome node e2e/flujo-integral.js [carpeta-capturas]
//
// Opcional — simulación de base de datos caída (solo en un equipo de pruebas):
//   E2E_DB_STOP_CMD="service postgresql stop" E2E_DB_START_CMD="service postgresql start"
const { chromium } = require("playwright-core");
const { execSync } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3200";
const SHOTS = process.argv[2] ?? "e2e-capturas";
mkdirSync(SHOTS, { recursive: true });
const ADMIN = process.env.E2E_ADMIN_EMAIL ?? "admin@e2e.mx";
const TEMP = process.env.E2E_ADMIN_TEMP_PASSWORD ?? "TemporalE2e2026";
const log = (...a) => console.log("✔", ...a);
const assert = (c, m) => { if (!c) throw new Error("FALLÓ: " + m); };
const at = (page, re) => page.waitForFunction((src) => new RegExp(src).test(location.pathname), re.source, { timeout: 30000 });
const DATE = "2026-10-15"; // mes en curso, fecha pasada (se puede cerrar)
const MES = "2026-10";
const DB_STOP = process.env.E2E_DB_STOP_CMD, DB_START = process.env.E2E_DB_START_CMD;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  global.__page = page;
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => errors.push(e.message));
  const text = () => page.locator("main").innerText();

  // 0. Primer acceso del administrador (base recién creada)
  await page.goto(BASE + "/login");
  await page.fill("#email", ADMIN);
  await page.fill("#password", TEMP);
  await page.click("button[type=submit]");
  await at(page, /^\/cambiar-contrasena/);
  await page.fill("#current", TEMP);
  await page.fill("#password", "MetepecE2e2026");
  await page.fill("#confirm", "MetepecE2e2026");
  await page.click("button[type=submit]");
  await page.getByText(/actualizada/i).first().waitFor({ timeout: 20000 });
  log("Base aislada erp_e2e: primer acceso y cambio de contraseña");

  // 1. Personal
  const crew = [["Chofer Integral DEMO", "CHOFER", 300], ["Ayudante Integral DEMO 1", "AYUDANTE", 200], ["Ayudante Integral DEMO 2", "AYUDANTE", 200]];
  const workerUrls = [];
  for (const [name, pos] of crew) {
    await page.goto(BASE + "/personal/nuevo");
    await page.fill("#fullName", name);
    await page.selectOption("#position", pos);
    await page.click("button:has-text('Guardar')");
    await at(page, /^\/personal\/[0-9a-f-]{36}$/);
    workerUrls.push(page.url().split("?")[0]);
  }
  log("Chofer y 2 ayudantes registrados");

  // 2. Cliente + solicitud $4,500 (como llega por WhatsApp)
  await page.goto(BASE + "/solicitudes/nueva");
  await page.fill("#client_name", "Cliente Integral DEMO");
  await page.fill("#client_phone", "7225550101");
  await page.selectOption("#serviceType", "LOCAL");
  await page.fill("#orig_municipality", "Metepec");
  await page.fill("#dest_municipality", "Toluca");
  await page.fill("#inventorySummary", "Recámara, sala y 15 cajas (DEMO)");
  await page.fill("#price", "$4,500.00");
  await page.click("button:has-text('Registrar solicitud')");
  await page.getByText(/Solicitud registrada con el folio/).waitFor({ timeout: 30000 });
  const sol = (await page.locator("h1").innerText()).trim();
  assert(/^SOL-2026-000001$/.test(sol), "folio solicitud " + sol);
  log(`Cliente nuevo + solicitud ${sol} con precio $4,500.00`);

  // 3–5. Confirmar → servicio, agenda, unidad, chofer y 2 ayudantes
  await page.click("a:has-text('Confirmar y convertir en servicio')");
  await at(page, /\/confirmar$/);
  assert((await page.inputValue("#contractedPrice")) === "4500.00", "precio contratado = cotización");
  await page.fill("#date", DATE);
  await page.fill("#time", "09:00");
  await page.fill("#durationHours", "4");
  await page.locator("label:has-text('F350 #1') input").check();
  for (const [name, , pay] of crew) {
    await page.getByLabel(`Asignar a ${name}`).check();
    await page.getByLabel(`Pago de ${name}`).fill(String(pay));
  }
  await page.click("button:has-text('Confirmar servicio')");
  await at(page, /^\/agenda\/[0-9a-f-]{36}$/);
  const svcUrl = page.url().split("?")[0];
  const mm = (await page.locator("h1").innerText()).trim();
  assert(mm === "MM-2026-000001", "folio servicio " + mm);
  log(`Servicio ${mm} programado el ${DATE} con F350 #1, chofer y 2 ayudantes`);

  await page.goto(`${BASE}/agenda?vista=lista&fecha=${DATE}`);
  await page.getByText(mm).first().waitFor();
  log("Aparece en la agenda");

  // 6. Anticipo
  await page.goto(svcUrl);
  await page.selectOption("#kind", "ANTICIPO");
  await page.fill("#amount", "2000");
  await page.click("button:has-text('Registrar cobro')");
  await page.getByText(/Cobro COB-2026-000001 registrado/).waitFor();
  await page.getByText("Cobro parcial").first().waitFor();
  log("Anticipo $2,000 → «Cobro parcial»");

  // 7–9. Finalizar con kilometraje y gastos
  await page.click("a:has-text('Registrar cierre operativo')");
  await at(page, /\/cierre$/);
  const kmField = page.locator("input[name^='km_start_']");
  if (!(await kmField.inputValue())) await kmField.fill("52000");
  const kmStart = Number(await kmField.inputValue());
  await page.locator("input[name^='km_end_']").fill(String(kmStart + 45));
  await page.locator("input[name^='fuel_l_']").fill("30");
  await page.locator("input[name^='fuel_amt_']").fill("700");
  await page.fill("#tolls", "120");
  await page.fill("#parking", "50");
  await page.fill("#perDiem", "200");
  await page.fill("input[name=extra_desc_1]", "Maniobra (DEMO)");
  await page.fill("input[name=extra_amt_1]", "300");
  await page.click("button:has-text('Registrar cierre')");
  await at(page, /^\/agenda\/[0-9a-f-]{36}$/);
  await page.getByText(/Cierre operativo registrado/).waitFor();
  await page.getByText("Finalizado").first().waitFor();
  for (const v of ["45 km", "$1,370.00", "$700.00"]) assert(await page.getByText(v).first().isVisible(), v);
  assert(await page.getByText("Cobro parcial").first().isVisible(), "el cierre operativo no liquida el cobro");
  log("Finalizado: 45 km, gastos $1,370, personal $700; cobro sigue parcial");

  // 10. Pagos a trabajadores
  for (const [i, url] of workerUrls.entries()) {
    await page.goto(url + "/corte");
    await page.getByText(`$${crew[i][2]}.00`).first().waitFor();
    await page.click("button:has-text('Registrar pago del corte')");
    await at(page, /^\/personal\/[0-9a-f-]{36}$/);
    await page.getByText(new RegExp(`Pago NOM-2026-\\d{6} registrado por \\$${crew[i][2]}\\.00`)).waitFor();
    const st = await page.locator("p.text-2xl").allInnerTexts();
    assert(st[2] === "$0.00", "saldo del trabajador " + st.join("|"));
  }
  log("Pagos al chofer ($300) y ayudantes ($200 c/u): saldo $0");

  // 11–12. Pago final → liquidado
  await page.goto(svcUrl);
  await page.selectOption("#kind", "PAGO_FINAL");
  await page.fill("#amount", "2500");
  await page.click("button:has-text('Registrar cobro')");
  await page.getByText("Liquidado").first().waitFor();
  await page.screenshot({ path: SHOTS + "/01-servicio-liquidado.png", fullPage: true });
  log("Pago final $2,500 → «Liquidado»");

  // 13. Flotilla: kilometraje de la unidad
  await page.goto(BASE + "/flotilla");
  await page.locator("a:has-text('F350 #1')").first().click();
  await at(page, /^\/flotilla\/[0-9a-f-]{36}$/);
  const vtxt = await text();
  assert(vtxt.includes((kmStart + 45).toLocaleString("en-US")), "odómetro actualizado " + (kmStart + 45));
  log(`Unidad F350 #1 con odómetro ${(kmStart + 45).toLocaleString("en-US")} km`);

  // 14. Finanzas y Resultados del mes reflejan la operación
  await page.goto(`${BASE}/finanzas?mes=${MES}`);
  const ftxt = await text();
  for (const v of ["$4,500.00", "$1,370.00", "$700.00"]) assert(ftxt.includes(v), "finanzas " + v);
  await page.goto(`${BASE}/resultados?vista=mes&mes=${MES}`);
  const rtxt = await text();
  for (const v of ["$4,500.00", "$1,370.00", "$700.00"]) assert(rtxt.includes(v), "resultados " + v);
  assert(/100\s?%/.test(rtxt), "conversión 100 %");
  await page.screenshot({ path: SHOTS + "/02-resultados.png", fullPage: true });
  log("Finanzas y Resultados: ventas $4,500, cobrado $4,500, gastos directos $1,370, nómina $700, conversión 100 %");

  // 15. Permisos: usuario Administrativo
  await page.goto(BASE + "/configuracion/usuarios/nuevo");
  await page.fill("#name", "Administrativo DEMO");
  await page.fill("#email", "staff@e2e.mx");
  await page.fill("#password", "Temporal12345");
  await page.click("button[type=submit]");
  await page.getByText("staff@e2e.mx").waitFor();
  const sctx = await browser.newContext();
  const sp = await sctx.newPage();
  sp.on("dialog", (d) => d.accept());
  await sp.goto(BASE + "/login");
  await sp.fill("#email", "staff@e2e.mx");
  await sp.fill("#password", "Temporal12345");
  await sp.click("button[type=submit]");
  await at(sp, /^\/cambiar-contrasena/);
  await sp.fill("#current", "Temporal12345");
  await sp.fill("#password", "StaffE2e2026");
  await sp.fill("#confirm", "StaffE2e2026");
  await sp.click("button[type=submit]");
  await sp.getByText(/actualizada/i).first().waitFor();
  for (const u of ["/resultados", "/finanzas", "/configuracion/usuarios"]) {
    await sp.goto(BASE + u);
    assert(sp.url().includes("/sin-permiso"), "bloqueado " + u);
  }
  const api = await sp.request.get(`${BASE}/api/exportar/cobros?mes=${MES}`);
  assert(api.status() === 403, "API de exportación 403: " + api.status());
  await sp.goto(BASE + "/agenda");
  await sp.getByText(mm).first().waitFor().catch(() => {}); // agenda sí está permitida
  assert(!sp.url().includes("sin-permiso"), "agenda permitida");
  log("Administrativo: sin acceso a Resultados, Finanzas, Configuración ni a la exportación de cobros (403)");

  // 16. Servidor inaccesible: el formulario conserva lo capturado y avisa
  await page.goto(BASE + "/clientes/nuevo");
  await page.fill("#name", "Cliente Sin Red DEMO");
  await page.fill("#phone", "7225550202");
  await page.route("**/clientes/nuevo", (r) => (r.request().method() === "POST" ? r.abort("internetdisconnected") : r.continue()));
  await page.click("button:has-text('Guardar')");
  await page.getByText(/No se pudo comunicar con el servidor|Sin conexión a internet/).waitFor();
  assert((await page.inputValue("#name")) === "Cliente Sin Red DEMO", "lo capturado se conserva");
  await page.unroute("**/clientes/nuevo");
  log("Sin red: aviso claro y lo capturado se conserva");

  // 17. Base de datos caída (solo si se indicaron los comandos)
  if (DB_STOP && DB_START) {
  execSync(DB_STOP, { stdio: "pipe" });
  try {
    await page.click("button:has-text('Guardar')");
    await page.getByText(/No hay conexión con la base de datos/).waitFor({ timeout: 30000 });
    assert((await page.inputValue("#name")) === "Cliente Sin Red DEMO", "lo capturado se conserva (BD caída)");
    log("BD caída al guardar: «No hay conexión con la base de datos…», no se guarda nada y el formulario se conserva");
    const h = await page.request.get(BASE + "/api/health");
    assert(h.status() === 503, "health 503");
    const ex = await page.request.get(`${BASE}/api/exportar/cobros?mes=${MES}`);
    assert(ex.status() === 503 && /conexión/.test(await ex.text()), "exportación 503 en español");
    await page.goto(BASE + "/agenda");
    await page.getByText("No se pudo cargar esta página").waitFor({ timeout: 30000 });
    await page.screenshot({ path: SHOTS + "/03-bd-caida.png", fullPage: true });
    log("BD caída: /api/health 503, exportación 503 con mensaje en español, páginas con pantalla «Reintentar»");
  } finally {
    execSync(DB_START, { stdio: "pipe" });
  }
  for (let i = 0; i < 40; i++) { // espera a que PostgreSQL acepte conexiones
    try { execSync("pg_isready -q -h localhost", { stdio: "pipe" }); break; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  await page.click("button:has-text('Reintentar')");
  await page.getByText("Agenda de servicios").first().waitFor({ timeout: 30000 });
  await page.getByText("MM-1").first().waitFor({ timeout: 30000 });
  log("Al restablecerse la BD, «Reintentar» recupera la página sin volver a iniciar sesión");
  await page.goto(BASE + "/clientes/nuevo");
  await page.fill("#name", "Cliente Sin Red DEMO");
  await page.fill("#phone", "7225550202");
  await page.click("button:has-text('Guardar')");
  await at(page, /^\/clientes\/[0-9a-f-]{36}$/);
  const n = (await page.locator("main").innerText()).match(/CLI-\d{6}/g) || [];
  assert(n.includes("CLI-000002"), "folio consecutivo tras la caída: " + n.join(","));
  log("Guardado tras recuperar la conexión: CLI-000002 (no se perdieron ni duplicaron folios)");
  } else console.log("· Simulación de BD caída omitida (defina E2E_DB_STOP_CMD y E2E_DB_START_CMD)");

  // 18. Página inexistente
  await page.goto(BASE + "/agenda/00000000-0000-0000-0000-000000000000");
  await page.getByText("No encontrado").first().waitFor();
  log("Registro inexistente: «No encontrado» en español");

  assert(!errors.length, "errores JS: " + errors.join(" | "));
  log("Sin errores de JavaScript");
  await browser.close();
})().catch(async (e) => {
  if (DB_START) try { execSync(DB_START, { stdio: "pipe" }); } catch {}
  console.error(e.message);
  try { await global.__page.screenshot({ path: SHOTS + "/fallo.png", fullPage: true }); console.error("URL:", global.__page.url()); const t = await global.__page.locator("main").innerText(); console.error(t.slice(-1500)); } catch {}
  process.exit(1);
});
