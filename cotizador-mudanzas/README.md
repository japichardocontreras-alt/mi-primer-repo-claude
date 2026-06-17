# 🚚 Cotizador Mudanzas Metepec

Aplicación web interna (móvil y escritorio) para cotizar servicios de mudanzas
y fletes de forma profesional en menos de 30 segundos. Pensada para uso interno
de **Mudanzas Metepec**.

Permite dejar de improvisar precios: calcula tu **costo mínimo**, tu **precio
objetivo** y tu **utilidad real**, con enfoque de costo por km + depreciación y
de presión de gastos fijos mensuales.

---

## ✅ Qué incluye

- **Cotizador principal** rápido (cliente, ruta, unidad, km, personal y gastos variables).
- **Cálculo automático** de costo de unidad, extras, costo total y 5 escenarios de precio
  (mínimo 15%, aceptable 20%, objetivo 30%, muy bueno 40%, excelente 50%) + fórmula ideal (×2).
- **Semáforo de utilidad** por colores (rojo → morado) con recomendación.
- **Modo Supervivencia** vs **Modo Empresa**.
- **Distribución del precio** (camioneta / extras / utilidad).
- **Proyección a largo plazo** (utilidad por km, proyección a vida útil, equivalente mensual a 4 y 5 años).
- **Generador de texto para WhatsApp** con 3–4 opciones (Renta con chofer, Básica, Intermedia, Premium) listo para copiar/enviar.
- **Historial** de cotizaciones con folio automático, búsqueda y estados (pendiente/aceptada/rechazada/realizada).
- **Dashboard** con indicadores del mes y comparación contra gastos fijos.
- **Gastos fijos y meta mensual** (meta diaria, semanal, utilidad necesaria por servicio).
- **Configuración editable** de flota, costos por km, modelo financiero y recargos.
- **Todo se guarda localmente** en el navegador (LocalStorage). No requiere backend ni internet tras cargar.

---

## 🧮 Modelo de costos oficial (precargado)

| Unidad         | Costo/km | Valor compra | Valor residual | Vida útil |
|----------------|---------:|-------------:|---------------:|----------:|
| Pick Up        |   $7     | $400,000     | $100,000       | 300,000 km|
| 1.5 cerrada    |   $9     | $550,000     | $150,000       | 300,000 km|
| 2.5 toneladas  |   $10    | $625,000     | $200,000       | 300,000 km|
| 3.5 toneladas  |   $12    | $800,000     | $250,000       | 300,000 km|

El costo por km ya considera combustible, depreciación, mantenimiento, llantas,
seguro, GPS, tenencia, verificaciones, fondo de reparaciones y reposición futura.

**Modelo financiero ideal:** 30% camioneta · 40% operación/variables · 30% utilidad.

---

## ▶️ Cómo correrlo localmente

Requisitos: **Node.js 18+** (probado en Node 22).

```bash
cd cotizador-mudanzas
npm install      # instala dependencias
npm run dev      # arranca en http://localhost:5173
```

Abre `http://localhost:5173` en tu navegador.
Para usarlo desde el **celular** en la misma red Wi-Fi, abre la dirección
`Network` que muestra la consola (ej. `http://192.168.x.x:5173`).

### Build de producción

```bash
npm run build    # genera la carpeta dist/
npm run preview  # sirve el build localmente para probarlo
```

---

## ☁️ Subirlo a Vercel / Netlify

Es una app estática (Vite + React). Subir es directo:

- **Vercel:** importa el repo, *Root Directory* = `cotizador-mudanzas`, framework **Vite**.
  Build: `npm run build` · Output: `dist`.
- **Netlify:** Base directory = `cotizador-mudanzas`, Build: `npm run build`, Publish: `dist`.

---

## 🗂️ Estructura del proyecto

```
cotizador-mudanzas/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx                 # punto de entrada
    ├── App.tsx                  # layout + navegación inferior
    ├── index.css                # estilos base (Tailwind)
    ├── types.ts                 # tipos del dominio
    ├── constants.ts             # flota oficial + defaults + LocalStorage keys
    ├── context/
    │   └── AppContext.tsx        # estado global + persistencia
    ├── lib/
    │   ├── calculations.ts       # núcleo de cálculo (precios, proyección, semáforo)
    │   ├── whatsapp.ts           # generador de opciones y texto
    │   ├── storage.ts            # LocalStorage + folios
    │   └── format.ts             # formato de moneda/fecha/%
    ├── components/
    │   ├── Icons.tsx             # íconos SVG inline
    │   ├── UI.tsx                # campos de formulario reutilizables
    │   └── ResultadoCotizacion.tsx
    └── pages/
        ├── Cotizador.tsx
        ├── Dashboard.tsx
        ├── Historial.tsx
        ├── GastosFijos.tsx
        └── Configuracion.tsx
```

---

## 🛠️ Tecnología

React 18 · TypeScript · Vite · Tailwind CSS · LocalStorage. Sin backend.

---

## 📌 Notas

- Los datos viven en el navegador del dispositivo. Si cambias de equipo o borras
  los datos del sitio, se reinician (la flota y defaults se vuelven a precargar).
- Los precios en las opciones de WhatsApp se redondean a la centena más cercana.
- Versión 1.0 funcional. Siguientes iteraciones: exportar PDF, respaldo en la nube
  y captura de km por ciudades frecuentes.
