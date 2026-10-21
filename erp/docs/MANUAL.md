# Manual básico de uso — MUDANZAS METEPEC | ERP

> Este manual crece con cada fase. Versión actual: Fases 1 a 7.

## 1. Acceso
1. Abra la dirección del sistema e ingrese su correo y contraseña.
2. La primera vez se le pedirá definir una contraseña personal (mínimo 10 caracteres, con letras y números).
3. Tras 5 intentos fallidos el usuario se bloquea 15 minutos.
4. Para salir: menú de su nombre (arriba a la derecha) → **Cerrar sesión**.

## 2. Navegación
* Barra lateral izquierda con los módulos; **Contraer** la reduce a íconos (se recuerda la preferencia).
* En celular, el botón ☰ abre el menú.
* **Buscador superior:** escriba un folio (SOL-…, MM-…), nombre o teléfono para ir directo al registro.
* La campana muestra notificaciones internas (p. ej. nuevas solicitudes registradas por otros usuarios).

## 3. Clientes
* **Clientes → Nuevo cliente.** El código (CLI-000001) se asigna solo.
* Si el teléfono ya existe, el sistema avisa y muestra a quién pertenece. Si realmente es otra persona, marque la casilla de confirmación y guarde de nuevo.
* En la ficha del cliente se ven todas sus solicitudes. Un cliente con historial **no se elimina**: se **desactiva** (deja de aparecer al registrar solicitudes nuevas).

## 4. Registrar una solicitud (lo que llega por WhatsApp)
1. **Solicitudes → Nueva solicitud.**
2. **Cliente:** «Cliente nuevo» (nombre y teléfono) o «Cliente existente» (búsquelo por nombre o teléfono).
3. Capture canal, tipo de servicio (local, foráneo, flete, otro), fecha y hora tentativas, paquete, unidad sugerida y si requiere embalaje.
4. **Carga** y **descarga:** calle, números, colonia, municipio, estado, C.P., piso, elevador, referencias y condiciones de acceso. Puede dejar campos vacíos si aún no los tiene.
5. **Inventario, descripción, maniobras y observaciones.**
6. **Estimaciones (opcional):** km, volumen, personal y gastos estimados.
7. **Precio cotizado (opcional):** si ya lo tiene, escríbalo; si no, déjelo vacío y cotice después.
8. **Fotografías y archivos:** fotos, videos, PDF u Office (máx. 50 MB por archivo).
9. **Registrar solicitud.** Se asigna el folio **SOL-AAAA-000000**, que nunca cambia.

Si falta algún dato obligatorio, los campos se marcan en rojo y **no se pierde** lo capturado.

## 5. Cotizar y recotizar
* En la ficha de la solicitud → **Capturar precio** (o **Modificar precio**).
* Cada cambio crea una **nueva versión** (v1, v2, …); las anteriores se conservan con fecha y usuario.
* **Cotización PDF:** abre la cotización con el logotipo y datos de la empresa; use «Imprimir / Guardar PDF» para enviarla al cliente.
* Los datos de la empresa que aparecen en la cotización se editan en **Configuración → General**.

## 6. Seguimiento comercial
En la ficha → **Seguimiento comercial**:
* Marque si hubo contacto, fecha y medio; escriba notas; programe el **próximo contacto**.
* Cambie el estado cuando corresponda: Información incompleta, Pendiente de cotizar, Cotización enviada, Pendiente de confirmación, No concretada (pide motivo) o Cancelada (pide motivo).
* Todo queda en el **Historial** de la solicitud, que no se puede modificar.
* Una solicitud no concretada o cancelada puede **reabrirse** cambiando su estado.

En **Solicitudes**:
* **En seguimiento:** solicitudes abiertas.
* **Contacto vencido:** la fecha de próximo contacto ya pasó.
* **Historial completo:** todas, incluidas no concretadas y canceladas (nunca se borran).
* Filtros por texto, estado, tipo y fechas de registro; botón **Excel** para exportar lo filtrado.
* En **Inicio** aparecen los seguimientos pendientes del día.

## 6 bis. Confirmar: de solicitud a servicio
1. En la ficha de la solicitud → **Confirmar y convertir en servicio**.
2. Revise el **precio contratado** (se toma de la última cotización).
3. Indique **fecha, hora de inicio y duración estimada**. El sistema muestra el fin estimado y el periodo en que la unidad y el personal quedan ocupados (incluye **preparación** antes de salir y **regreso a base** después). Si el servicio termina al día siguiente se indica «continúa otro día».
4. Elija **unidad** y **personal** (chofer, ayudantes) con el **pago por servicio** de cada uno.
5. **Confirmar servicio:** se genera el folio **MM-AAAA-000000**, la solicitud pasa a «Confirmada» y el servicio aparece en la agenda. Una solicitud solo puede convertirse una vez.

Si la fecha se deja vacía, el servicio queda **«Por programar»** (aparece en el panel derecho de la agenda).

**Empalmes:** si la unidad o alguien del personal ya tiene otro servicio en ese horario, el sistema lo impide y dice con qué folio choca. Cambie horario, unidad o personal. Solo un **administrador** puede autorizarlo de forma excepcional, escribiendo el motivo (queda en auditoría y en el historial del servicio).

## 6 ter. Agenda
* **Mes**, **Semana** y **Lista**; flechas para navegar y botón **Hoy**. Cada camioneta tiene un color.
* Filtros por unidad y estado; «Incluir cancelados».
* Los servicios de varios días aparecen en cada día que ocupan.
* **Ficha del servicio:** resumen (inicio, fin, unidad, precio, anticipo, cobrado, saldo, chofer, ayudantes), ruta, inventario y observaciones, archivos (incluye los de la solicitud), historial.
* **Reprogramar / cambiar asignación:** cambie fecha, horario, unidad o personal y escriba el motivo. Se conserva el mismo folio y los cobros; el cambio queda en el historial con el antes y el después.
* **Estado operativo:** Por programar → Programado → Confirmado → En proceso; Incidencia (pide descripción); Cancelado (pide motivo; libera unidad y personal y se conserva en el historial). «Finalizado» se registra con el cierre operativo (Fase 4).
* **Cobros:** registre anticipo, pagos parciales, pago final o reembolso (fecha, método, referencia). El sistema no permite cobrar más que el saldo. Un cobro erróneo se **cancela** con motivo (no se borra). El estado de cobro pasa a «Cobro parcial» o «Liquidado» automáticamente.

## 6 quinquies. Cierre operativo y servicios realizados
1. Al terminar la mudanza, en la ficha del servicio → **Registrar cierre operativo**.
2. Capture **inicio y fin reales**; por cada unidad, **km inicial** (se propone la última lectura) y **km final**, y si cargó **combustible**, litros e importe.
3. **Casetas, estacionamientos, viáticos** y hasta 3 **gastos adicionales**; indique con qué se pagaron.
4. **Personal participante:** desmarque a quien no asistió y ajuste el pago si cambió.
5. **Evidencia de entrega**, **incidencias**, observaciones y fotos.
6. **Registrar cierre.** El servicio pasa a **Finalizado** y automáticamente:
   * la unidad recibe su registro de kilometraje (no se puede modificar después);
   * los gastos quedan ligados al folio;
   * cada participante recibe su pago por servicio en nómina («por pagar»).

Si el km inicial no coincide con la última lectura de la unidad (más de 30 km de diferencia o menor), el sistema lo señala y pide confirmarlo; si retrocede, también pide explicar el motivo en las observaciones.

El **cobro es independiente**: puede cerrar un servicio con saldo pendiente y registrar el pago después; al cubrirse el total cambia a «Liquidado».

Después del cierre puede **agregar gastos** al servicio (si ya existe uno igual, el sistema pide confirmar) y **cancelar** un gasto erróneo con motivo (no se borra).

**Servicios realizados:** lista por mes con km, precio, saldo, gastos directos, pago a personal y **margen directo** (precio − gastos del folio − pagos de nómina del servicio), totales y exportación a Excel. El margen directo aún no descuenta gastos fijos ni depreciación; eso se calcula en Resultados (Fase 8).

## 6 quater. Personal
* **Personal y nómina → Nuevo colaborador:** nombre, teléfono, puesto (chofer, ayudante, administración, otro), fecha de ingreso, tipo de pago, sueldo base, activo.
* La ficha muestra los servicios en los que ha participado. Las bajas se marcan como **inactivo** (no se borran).

## 6 sexies. Nómina (control administrativo interno)
> No sustituye el cálculo legal de nómina (IMSS, ISR, CFDI, prestaciones).

**Tarifas por servicio** (Personal y nómina → Tarifas): importe por tipo de servicio (local, foráneo, flete, otro) y rol (chofer, ayudante, otro), vigente desde una fecha. Al asignar personal a un servicio se propone esa tarifa (se puede ajustar). Cambiar una tarifa no altera servicios ya asignados.

**Cómo se genera lo que se debe (devengado):**
* **Pago por servicio:** automático al registrar el cierre operativo, para cada participante.
* **Sueldo base:** en el corte, botón «Generar sueldo base» (una vez por periodo, según el tipo de pago del colaborador).
* **Bonos, horas extra (horas × pago por hora), otros devengos y deducciones autorizadas:** en la ficha del colaborador.

**Anticipos:** en la ficha, «Anticipo de nómina». Se entregan antes del corte y se descuentan automáticamente en el siguiente pago.

**Corte y pago:** ficha → **Corte y pago** (o desde «Nómina y cortes»). Elija periodo (semanal, quincenal, mensual). Se marcan los conceptos por pagar del periodo y de periodos anteriores, y los anticipos pendientes; el sistema muestra total devengado, anticipos y **neto a pagar**. Al registrar el pago, los conceptos pasan a «Pagado» (no pueden pagarse otra vez) y puede imprimir el **recibo** para firma.

**Consultas:**
* Ficha del colaborador: total devengado, total pagado (incluye anticipos), saldo pendiente, conceptos, pagos y servicios.
* **Nómina y cortes:** por periodo, lo devengado y pagado de cada colaborador y su saldo pendiente; exportación a Excel con detalle.

**Correcciones:** un concepto por pagar se cancela con motivo; un pago se cancela con motivo y sus conceptos y anticipos regresan a pendientes. Nada se borra.

## 6 septies. Flotilla
* **Flotilla:** lista de unidades con placas, estado, km actual, servicios del mes, valor contable y alertas. **Nueva unidad** para agregar camionetas (p. ej. la de 3.5 t cuando se incorpore). Para retirar una unidad, cambie su estado a **Baja** (se conserva el historial; «Mostrar también unidades dadas de baja»).
* **Ficha de la unidad** (pestañas):
  * **Servicios:** historial automático desde los cierres: fecha, folio, origen, destino, km, ingreso atribuido y gastos asociados.
  * **Kilometraje:** todas las lecturas (servicios, mantenimientos, combustible y manuales). No se sobrescriben. Se señalan **inconsistencias** (km que retroceden o km sin registrar entre un recorrido y el siguiente). Una lectura menor a la anterior pide confirmación.
  * **Mantenimiento:** cambio de aceite, afinación, frenos, suspensión, llantas, reparaciones, servicio general u otros, con fecha, km, proveedor, costo y **próximo mantenimiento** (fecha y/o km). El costo se registra automáticamente como gasto de flotilla (una sola vez).
  * **Documentos:** seguro, verificación, tenencia, tarjeta de circulación y otros, con vencimiento y pago (el pago se registra como gasto).
  * **Combustible:** cargas fuera de servicio (las de un servicio se capturan en su cierre) y rendimiento real km/L.
  * **Depreciación:** lineal por tiempo y por kilómetro (base, anual, mensual, por km, acumulada y valor contable).
  * **Datos de la unidad:** marca, modelo, año, placas, serie, capacidad, adquisición, valor residual, vida útil (años y km), km inicial, rendimiento estimado, GPS y estado.
* **Alertas:** mantenimientos próximos o vencidos (por fecha o por km) y documentos por vencer, con la anticipación definida en Configuración → Alertas. Aparecen en Flotilla, en Inicio y en las notificaciones.
* **Depreciación mensual** (administrador): en Flotilla, «Calcular y registrar» guarda la depreciación del mes de todas las unidades; puede recalcularse sin duplicar. No es salida de efectivo y se reporta aparte de los gastos.

## 6 octies. Finanzas y administración
* **Resumen del mes:** ventas pactadas y netas (sin IVA), ingresos cobrados, cuentas por cobrar, utilidad y margen, gastos, nómina, depreciación y flujo de efectivo; estado de resultados, flujo de efectivo, gastos por categoría e IVA informativo. Elija el mes con el selector. Las fórmulas están en `docs/FORMULAS.md`.
* **Cobros y cuentas por cobrar:** todos los cobros del mes (se registran en la ficha de cada servicio) y los servicios con saldo, con su antigüedad. Exportación a Excel.
* **Gastos:** registre gastos no ligados a una mudanza (o ligados por folio MM-…), con IVA desglosado si aplica, proveedor, referencia y unidad. Si no está pagado, desmarque «Ya está pagado»: queda **por pagar** y se marca pagado después (cuenta en el flujo hasta que se paga). Gastos duplicados se detectan. Un gasto erróneo se cancela con motivo.
  * Mantenimiento, documentos y combustible se registran en **Flotilla**; los de una mudanza, en su **cierre**. No los capture de nuevo aquí.
  * «Sueldos fijos» es solo para sueldos que **no** se llevan en el módulo de nómina.
* **Gastos recurrentes:** plantillas (renta, internet, telefonía, GPS, software…) con importe, día del mes y vigencia. «Generar» crea los gastos del mes como por pagar; si ya se generaron, no se duplican.
* **Otros movimientos:** préstamos recibidos, aportaciones de capital, compras de activo, pagos de financiamiento (indicando la parte de intereses), ingresos y gastos extraordinarios y retiros de socios. No se consideran ventas ni gastos operativos; sí afectan el flujo de efectivo (los intereses sí son gasto).
* **Categorías** (administrador): cree categorías propias indicando su grupo (directo, fijo, flotilla, extraordinario); las del sistema no se desactivan.

## 6 nonies. Resultados (dashboard)
* Requiere el permiso de Resultados (por omisión, solo el administrador).
* **Filtros** en una fila: vista por **año** o por **mes**, unidad y tipo de servicio; pulse «Aplicar». Al elegir una unidad, todo el tablero se limita a ella.
* **Indicadores:** solicitudes recibidas, cotizaciones enviadas, servicios confirmados, realizados y cancelados, conversión comercial, ventas netas, ingresos cobrados, cuentas por cobrar, gastos directos, gastos fijos, nómina, depreciación, utilidad estimada, margen, flujo de efectivo y ticket promedio. Un guion «—» significa que el indicador no se puede calcular (p. ej. margen sin ventas), no que valga cero.
* **Gráficas:** ventas y costos por mes, utilidad mensual (los meses con pérdida aparecen por debajo de la línea cero), servicios realizados, conversión comercial, ingresos y rentabilidad por unidad, distribución de gastos y comparativo de periodos. Pase el cursor (o toque) para ver el importe; «Ver datos en tabla» muestra las cifras exactas.
* **Resultados por unidad:** ingresos, costos de operación, depreciación, costos compartidos asignados y utilidad de cada camioneta. Los costos compartidos (gastos fijos y nómina no ligada a servicios) se reparten con el criterio de Configuración → General → Finanzas.
* **Exportar:** «Excel» descarga indicadores, serie mensual, unidades y gastos por categoría; «Reporte PDF» abre una versión imprimible (use «Guardar como PDF» del navegador).

## 7. Configuración (administrador)
* **General:** datos de la empresa, parámetros operativos (tiempos de preparación y regreso, vigencia de cotizaciones), alertas y parámetros financieros.
* **Usuarios:** alta, edición, desactivación, restablecer contraseña y cerrar sesiones.
* **Roles y permisos:** qué puede hacer el rol Administrativo; ajustes individuales por usuario.
* **Auditoría:** quién hizo qué y cuándo.
* **Respaldos:** descarga de una copia completa de la base de datos.
