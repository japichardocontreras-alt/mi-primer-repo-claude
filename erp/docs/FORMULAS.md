# Fórmulas y criterios financieros

Fuente única de cálculo: `src/lib/finance/results.ts` (lo usan Finanzas y Resultados). Verificado con las pruebas `tests/finanzas.test.ts`.

| Indicador | Fórmula | Fuente |
|---|---|---|
| **Ventas pactadas** | Σ precio contratado de servicios no cancelados cuya **fecha de servicio** (inicio real; si no hay, inicio programado) cae en el periodo | `services` |
| **Ventas netas** | Ventas pactadas sin IVA: precio ÷ (1 + tasa) cuando el servicio se pactó con IVA | `services`, Configuración |
| **Ingresos cobrados** | Σ cobros vigentes con fecha en el periodo − reembolsos | `payments` |
| **Cuentas por cobrar** | Σ (precio − cobrado hasta el cierre) de servicios no cancelados con fecha anterior al cierre | `services`, `payments` |
| **Gastos directos** | Σ subtotal (sin IVA) de gastos ligados a un servicio | `expenses` |
| **Gastos de flotilla** | Σ subtotal de gastos de categorías de flotilla o ligados a una unidad sin servicio | `expenses` |
| **Gastos fijos** | Σ subtotal del resto de categorías del grupo fijo | `expenses` |
| **Nómina** | Σ devengos vigentes del periodo (servicio, sueldo base, bonos, horas extra, otros − deducciones) | `payroll_entries` |
| **Depreciación** | Registros del mes con el método configurado; si no hay registro, se calcula y se marca «estimada» | `depreciation_entries` |
| **Resultado operativo** | Ventas netas − directos − flotilla − fijos − nómina − depreciación | |
| **Utilidad estimada** | Resultado operativo + ingresos extraordinarios − gastos extraordinarios − intereses de financiamiento | |
| **Margen de utilidad** | Utilidad estimada ÷ ventas netas | |
| **Flujo de efectivo** | (cobros − reembolsos + préstamos + aportaciones + ingresos extraordinarios) − (gastos pagados en el periodo con IVA + nómina entregada + compras de activo + pagos de financiamiento + gastos extraordinarios + retiros de socios) | |
| **IVA (informativo)** | En cobros: cobrado de servicios con IVA × tasa ÷ (1 + tasa). En gastos: IVA capturado de gastos pagados | |

## Indicadores comerciales y por unidad (Resultados)
Fuente: `src/lib/finance/dashboard.ts`, verificado en `tests/resultados.test.ts`.

| Indicador | Fórmula |
|---|---|
| **Solicitudes recibidas** | Solicitudes con fecha de registro en el periodo |
| **Cotizaciones enviadas** | De esas, las que tienen al menos una versión de precio |
| **Conversión comercial** | Solicitudes confirmadas ÷ recibidas (ambas del periodo) |
| **Servicios confirmados / realizados / cancelados** | Por fecha de creación / inicio real (finalizados) / fecha de cancelación |
| **Ticket promedio** | Ventas netas ÷ servicios con venta en el periodo |
| **Resultado de la unidad** | Motor con filtro de unidad: ingresos, gastos directos, flotilla, nómina del servicio y depreciación de la unidad. Un servicio con varias unidades se reparte en partes iguales |
| **Costos compartidos** | Gastos fijos + nómina no ligada a servicios (sueldo base, bonos, etc.) |
| **Asignación** | Costos compartidos × peso de la unidad ÷ suma de pesos. Peso según criterio: ingresos, kilómetros, servicios realizados o partes iguales (unidades activas). Si la suma de pesos es cero, el importe se muestra «sin asignar» |
| **Utilidad de la unidad** | Resultado operativo de la unidad − costos compartidos asignados |

## Reglas para no contar dos veces
* El costo de **mantenimiento, documentos y combustible** existe solo como gasto; sus bitácoras no tienen importe propio.
* La **nómina** cuenta como gasto cuando se **devenga**; lo **pagado** solo afecta el flujo de efectivo. El gasto «Sueldos fijos» es únicamente para sueldos fuera del módulo de nómina.
* La **depreciación** no es salida de efectivo y nunca se suma a los gastos pagados.
* **Préstamos y aportaciones** no son ventas. **Compras de activo** y **abonos a capital** no son gasto operativo (el activo se reconoce vía depreciación; los intereses sí son gasto).
* **Ingresos facturados/pactados ≠ ingresos cobrados ≠ utilidad**: se presentan por separado.
* Registros **cancelados** no cuentan en ningún cálculo, pero se conservan.

## Ejemplo verificado (septiembre 2026, prueba automatizada)
| Concepto | Importe |
|---|---|
| Ventas netas | $4,500 |
| Gastos directos (combustible 700, casetas 120, estacionamientos 50, viáticos 200, maniobra 300) | −$1,370 |
| Gastos fijos (renta 8,000 + software 1,000 sin IVA) | −$9,000 |
| Nómina (chofer 300 + 2 ayudantes 200) | −$700 |
| Depreciación ((600,000 − 120,000) ÷ 60 meses) | −$8,000 |
| **Resultado operativo** | **−$14,570** |
| Intereses de financiamiento | −$800 |
| **Utilidad estimada** | **−$15,370** |
| Flujo: entradas (cobros 4,500 + préstamo 50,000) − salidas (gastos 1,370 + renta 8,000 + software 1,160 + nómina 700 + activo 30,000 + financiamiento 5,000) | **+$8,270** |
