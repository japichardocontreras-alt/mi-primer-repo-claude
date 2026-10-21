# Manual básico de uso — MUDANZAS METEPEC | ERP

> Este manual crece con cada fase. Versión actual: Fases 1 y 2.

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

> La **confirmación** de una solicitud (que genera el folio de servicio MM-AAAA-000000 y la coloca en la agenda) se habilita en la Fase 3.

## 7. Configuración (administrador)
* **General:** datos de la empresa, parámetros operativos (tiempos de preparación y regreso, vigencia de cotizaciones), alertas y parámetros financieros.
* **Usuarios:** alta, edición, desactivación, restablecer contraseña y cerrar sesiones.
* **Roles y permisos:** qué puede hacer el rol Administrativo; ajustes individuales por usuario.
* **Auditoría:** quién hizo qué y cuándo.
* **Respaldos:** descarga de una copia completa de la base de datos.
