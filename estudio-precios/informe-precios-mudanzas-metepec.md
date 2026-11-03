# Mudanzas Metepec: estudio de precios, costos e inversión

**Fecha de elaboración:** 3 de noviembre de 2026 · **Moneda:** MXN · **Base de cálculo:** precios y costos **sin IVA**, salvo que se indique otra cosa.
**Modelo de cálculo reproducible:** [`modelo_costos.py`](modelo_costos.py) · resultados en [`resultados_modelo.md`](resultados_modelo.md).

**Etiquetas usadas en todo el documento:**

| Etiqueta | Significado |
|---|---|
| **[Tuyo]** | Dato que tú aportaste (conversación, escenario o recuerdo operativo; no está auditado). |
| **[Mercado]** | Precio publicado por un tercero y localizado en internet (ver limitación abajo). |
| **[Supuesto]** | Valor que yo propongo para poder calcular; debe reemplazarse por tu dato real. |
| **[Cálculo]** | Resultado de aplicar fórmulas a los anteriores. |

> **Limitación metodológica importante.** Desde el entorno en el que trabajé, los sitios de mudanzas (Habitissimo, Lalamove, mejoresmudanzas, etc.) estaban bloqueados para lectura directa. Las cifras de mercado se obtuvieron a través de un motor de búsqueda que lee y resume esas páginas. Las cifras citadas coinciden con lo que muestran las páginas, pero **no pude revisar la letra pequeña completa** (IVA, exclusiones, fecha exacta). Por eso ninguna cifra de mercado se presenta como “cotización verificable”: son **precios publicados, rangos orientativos o promedios de plataformas**. No contacté a ninguna empresa ni solicité cotizaciones.

---

## 1. Conclusiones principales

1. **Tus $3,500 por una mudanza local en 3.5 t son competitivos, tirando a bajos; no son altos.** Las referencias publicadas para un servicio comparable (camioneta de 3.5 t con chofer y 2 ayudantes) van de ~$2,000 a ~$5,700. El promedio de cotizaciones en Toluca de una plataforma es de $4,489 [Mercado]. Hay competidores informales más baratos, pero suelen dar un servicio de menor alcance.
2. **No es cierto que $3,500 deje ~50 % de utilidad si pagas $1,800 de maniobras.** Ese 50 % sale de restar solo la mano de obra: (3,500 − 1,800) ÷ 3,500 = 48.6 %. Si además sumas combustible y desgaste (~$330), materiales (~$250), comidas (~$200) y la parte de los costos fijos y la depreciación de la unidad (~$955 por servicio con 20 servicios al mes), la utilidad operativa queda **entre −1 % y +5 %**. Si además los $3,500 incluyen IVA, el resultado es **pérdida** [Cálculo, §5.3].
3. **Con tu esquema de personal de referencia (chofer $300 + 2 ayudantes de $200 = $700), $3,500 sin IVA sí funciona, pero solo con volumen.** El punto de equilibrio está en **~9.5 servicios al mes por unidad**. Con 20 servicios al mes la utilidad operativa es de ~30 % sobre ventas, sin contar impuestos ni tu sueldo [Cálculo, §7].
4. **El factor que más mueve tu rentabilidad es el volumen mensual por unidad, no el precio.** Pasar de 10 a 20 servicios al mes a $3,500 sube la utilidad de ~$1,100 a ~$21,300 mensuales. Subir el precio de $3,500 a $4,000 con 20 servicios la sube a ~$31,300.
5. **El IVA es la trampa silenciosa.** Si cobras $3,500 “todo incluido” y facturas, tu ingreso real es de $3,017. Eso equivale a un descuento del 14 % que no ves, y sube tu punto de equilibrio de 9.5 a 12.4 servicios al mes.
6. **$300 por un día de trabajo del chofer está por debajo del salario mínimo general de 2026 ($315.04 diarios)** [Mercado: CONASAMI vía UnoTV]. Si formalizas al personal, el costo laboral sube ~35 % o más. Tu precio debe aguantar ese escenario.
7. **En rutas largas, una 3.5 t exclusiva con regreso vacío no compite con los precios publicados.** A Guadalajara, Mérida o Cancún, mi costo estimado ($25,000–$66,000) supera los precios de mercado de mudanzas compartidas o consolidadas ($10,000–$26,000). Esos precios bajos solo existen con carga compartida o con retorno ocupado. A Querétaro sí puedes competir: costo de ~$8,000 y precio sostenible de ~$12,400.
8. **Un precio por kilómetro no sirve como precio final:** el costo total por km operativo va de ~$61 en un local de 40 km a ~$18–23 en foráneos. Úsalo como indicador interno y como componente de la cotización, no como tarifa única.
9. **La inversión de $800,000 se recupera en ~2.2 años con 20 servicios al mes a $3,500 sin IVA (de contado).** Con 10 servicios al mes apenas se recupera al final del año 5 (4.8 años, TIR ~2 %). Con 26 servicios a $4,000, se recupera en ~1.2 años. Estas cifras son antes de impuestos y de tu sueldo, y con supuestos que debes validar [Cálculo, §6].
10. **Los 200,000 km en 5 años no son compatibles con un negocio solo local.** 26 servicios locales al mes generan ~62,000 km en 5 años. Llegar a 200,000 km exige unos 3,300 km mensuales, lo que equivale a varios foráneos al mes. Si no los tienes, tu costo por km es mucho mayor que el que sugiere esa cifra (§5.2).

---

## 2. Evidencia de precios del mercado

Todas las fuentes se consultaron el 3 de noviembre de 2026, vía buscador (ver la limitación anterior). Las comparo por categoría y no mezclo categorías.

### 2.1 Flete de uno o pocos objetos

| Empresa / zona | Servicio y unidad | Ruta | Precio publicado | Incluye / excluye | IVA | Antigüedad | Tipo | Limitaciones |
|---|---|---|---|---|---|---|---|---|
| [Prummo](https://prummo.app/es-MX/remociones/toluca) (app), Toluca | Flete / “mudanza de un cuarto” | Local | $350–$850 | No especifica unidad ni personal | No especificado | Sin fecha | Rango orientativo de plataforma | Es un marketplace, no un transportista. No es comparable con una mudanza 3.5 t. |
| [Lalamove](https://www.lalamove.com/mexico/tarifas), CDMX | “Camioneta” (aparece junto a un límite de 500 kg) | Por km | Primeros 3 km $185; 4–6 km $30/km; 7–25 km $16/km; 26–50 km $10/km; 51+ km $5/km | El conductor ayuda a cargar hasta 500 kg / 90 min ([vehículos](https://www.lalamove.com/es-mx/vehiculos-tarifa-detalles)) | No especificado | Página antigua; Lalamove dice que el precio exacto está en la app | Tarifa publicada (estructura) | La propia página tiene un formato confuso. Precio dinámico (tráfico, demanda). No publica tarifa para 1.5 t ni 3.5 t; la parada adicional de 1.5 t cuesta $54. |

### 2.2 Camioneta exclusiva con chofer (y en su caso ayudantes)

| Empresa / zona | Servicio y unidad | Ruta | Precio | Incluye / excluye | IVA | Antigüedad | Tipo | Limitaciones |
|---|---|---|---|---|---|---|---|---|
| [CotizadoraOnline](https://www.cotizadoraonline.com/cotizacion-transporte-fletes), nacional | Camioneta 3.5 t | Por km | $14–$20/km | Solo transporte | No especificado | 2026 | Tarifa orientativa | Sitio genérico de fletes de carga, no de mudanzas. Precio por km de flete, no de servicio completo. |
| [Blog mejoresmudanzas](https://www.blog.mejoresmudanzas.com/mudanzas-cdmx/cuanto-cuesta-un-camion-de-mudanza/), CDMX | Van o 3.5 t (10–15 m³) | Local | $1,500–$2,800 | No queda claro si incluye ayudantes | No especificado | 2025 | Rango orientativo | Antiguo; probablemente sin maniobras completas. |
| [Box2Box guía 2026](https://www.box2boxstorage.com/mx/blog/fletes-y-mudanzas-mexico-guia), nacional | Camioneta + chofer + ayudantes para carga y descarga | Local, por viaje | $2,000–$4,000 por viaje | Carga y descarga | No especificado | 2026 | Rango orientativo | Box2Box es una empresa de guardamuebles; es una guía, no su tarifa. |

### 2.3 Mudanza local con personal de carga y descarga (la categoría de tus $3,500)

| Empresa / zona | Servicio y unidad | Ruta | Precio | Incluye / excluye | IVA | Antigüedad | Tipo | Limitaciones |
|---|---|---|---|---|---|---|---|---|
| [Muebles y Mudanzas Milenio](https://mueblesymudanzas.com.mx/mudanzas-cdmx/), CDMX y municipios aledaños | 3.5 t de caja corta, catalogada como camión de 20 m³ | Local | **$5,700** chofer + 2 ayudantes; **$6,800** + 3; **$7,900** + 4 | Personal según paquete; no pude confirmar si incluye protección o pisos | No especificado | ~300 días (finales de 2025 o inicios de 2026) | **Precio publicado de una empresa** (la referencia más comparable) | CDMX tiene costos y tráfico mayores que Toluca. Habría que confirmar horas y kilómetros incluidos. |
| [Habitissimo Toluca](https://www.habitissimo.com.mx/presupuesto/mudanzas/estado-de-mexico/toluca) | Mudanzas en general | Toluca | Promedio **$4,489**; mínimo $1,200; máximo $11,500 | Variable | No especificado | “Cotizaciones de 2026” | Promedio de cotizaciones de plataforma | Mezcla fletes chicos y casas completas; no distingue unidad. |
| [Habitissimo Edomex](https://www.habitissimo.com.mx/presupuesto/mudanzas/estado-de-mexico) | Mudanzas en general | Estado de México | Promedio $5,220 | Variable | No especificado | Sin fecha clara | Promedio de plataforma | Igual que el anterior. |
| [Habitissimo CDMX](https://www.habitissimo.com.mx/presupuesto/mudanzas/ciudad-de-mexico) | Mudanzas en general | CDMX | Promedio ~$3,597; rango $1,200–$8,000 | Variable | No especificado | 2026 | Promedio de plataforma | Igual. |
| [Tus Fletes y Mudanzas](https://tusfletesymudanzas.com.mx/toluca/), Toluca | Mudanza promedio | Toluca | $1,500–$5,000 | No especifica | No especificado | Sin fecha | Rango orientativo | Directorio. |
| [Box2Box Mudanzas CDMX](https://www.box2boxstorage.com/mx/blog/mudanzas-cdmx) | Estudio o cuarto / 1–2 recámaras / 3 o más | CDMX | $2,500–$4,000 / $4,000–$8,000 / $7,000–$15,000 | Estudio: camión pequeño, 2–3 mudanceros, medio día. 1–2 recámaras: camión mediano, 3–4 mudanceros, día completo. | No especificado | Abril de 2026 | Rango orientativo | Guía de un tercero. |
| [mejoresmudanzas CDMX 2026](https://mejoresmudanzas.com/precios/mudanzas/cdmx) | Pequeña / mediana / grande | CDMX | $1,000–$4,000 / $5,000–$8,000 / $8,000–$12,000 | Variable | No especificado | 2026 | Rango orientativo | Portal comercial que vende leads. |
| [tumudanza.mx](https://tumudanza.mx/mudanzas-en-cdmx/) | Departamento de 1–2 recámaras | CDMX | $3,000–$6,500 | Subir un refrigerador por escalera se cobra aparte | No especificado | 2025–2026 | Rango orientativo | Directorio. |
| **Monroy** (referencia tuya) | ~5 t, caja de 6 m, 3 personas | Local | $3,500 | Sin confirmar | Sin confirmar | Sin fecha | **[Tuyo], no verificado** | No es tarifa confirmada. Si es real, ofrece más capacidad al mismo precio que tú. |

**Lectura [Cálculo]:** para Valle de Toluca, una mudanza de departamento o casa pequeña en 3.5 t con chofer y 2 ayudantes ronda **$3,000–$5,500 sin especificar IVA**. **Confianza media-baja**: hay pocas tarifas de empresa publicadas y muchas guías. Tus $3,500 están en la mitad baja de ese rango.

### 2.4 Mudanza con protección y empaque, y servicio integral

- No encontré tarifas públicas por concepto de emplaye. Las guías ubican el **empaque profesional en $500–$4,000 según volumen**, cotizado aparte ([cuantomecuesta](https://cuantomecuesta.com/mx/mudanza/), [cronoshare](https://www.cronoshare.com.mx/cuanto-cuesta/mudanza); rango orientativo, confianza baja).
- **Recargo por piso sin elevador:** una guía da $200–$500 por nivel y $1,500–$3,000 adicionales por un quinto piso; otra habla de +15–25 % sobre la mano de obra, sin sustento claro ([mobbit](https://mobbit.mx/mudanzas-locales-en-mexico-precios-por-hora-distancia-y-numero-de-muebles/), [movingmemx](https://movingmemx.com/cuanto-cuesta-una-mudanza-en-cdmx/); confianza baja).
- **Empresas grandes:** [AtlasMex](https://www.atlasmex.mx/) (CDMX, con oficinas en Querétaro y Mérida) anuncia cotización instantánea, precio cerrado o cobro por hora, y armado y desarmado, **pero no publica precios**. Las empresas de servicio integral cotizan casi siempre de forma personalizada, con visita o inventario.

### 2.5 Carga compartida o consolidada (no comparable con tu servicio exclusivo)

| Fuente | Precio | Tipo | Limitación |
|---|---|---|---|
| [mudanzaseconomicas.mx](https://mudanzaseconomicas.mx/precios-de-mudanzas-en-mexico/) y otros | $600–$1,000 por m³ / $800–$1,200 por m³ | Orientativo | No separan compartida de exclusiva. |
| Comparador citado en búsqueda | Compartida nacional: $12,000–$25,000 | Orientativo | Sin ruta concreta. |
| [mudanzas.org.mx](https://www.mudanzas.org.mx/precio-de-mudanza-de-cdmx-a-cancun-cotizacion/) | CDMX a Cancún, **compartida**, octubre de 2025: **$23,500** | Ejemplo publicado de un caso | Es un caso, no una tarifa. |

**Paquetería:** no la investigué a fondo. Cobra por peso o peso volumétrico por bulto, no incluye maniobras y no es sustituto de una mudanza. No la uses como referencia de precio.

### 2.6 Viaje foráneo dedicado (rutas)

| Ruta | Precio publicado | Tipo | Fuente | Limitación |
|---|---|---|---|---|
| CDMX → Querétaro | Pequeña $7,000–$13,000; mediana $14,000–$20,000; grande $20,000–$29,000 | Rango orientativo | [movingmemx](https://movingmemx.com/mudanzas-queretaro/) / [mejoresmudanzas](https://mejoresmudanzas.com/mudanzas-df/a/queretaro) | No pude confirmar cuál de los dos sitios publica cada cifra ni si son exclusivas. |
| CDMX → Querétaro | **Mediana $10,000** (3,104 cotizaciones); camión completo de 46 m³ o más: ~$24,000 | Mediana de plataforma | [mejoresmudanzas](https://mejoresmudanzas.com/mudanzas-df/a/queretaro) | Sale de cotizaciones de usuarios; no precisa si incluyen IVA. |
| Toluca → Querétaro | $9,500 (Monroy) | **[Tuyo], no verificado** | — | Sin unidad, fecha ni alcance. |
| CDMX → Guadalajara | $14,600–$56,000; otra referencia: $10,000–$20,000 “común” | Rango orientativo | [mejoresmudanzas 2026](https://mejoresmudanzas.com/consejos/cuanto-cuesta-una-mudanza-de-cdmx-a-guadalajara-en-2026/) | El rango bajo probablemente es compartido. |
| CDMX → Mérida | $13,000–$26,000 | Una sola referencia | Resultado de búsqueda | Confianza baja. |
| CDMX → Cancún | $23,500 compartida | Caso publicado | [mudanzas.org.mx](https://www.mudanzas.org.mx/precio-de-mudanza-de-cdmx-a-cancun-cotizacion/) | Compartida. |
| León, Veracruz | No encontré precios publicados confiables | — | — | — |

**Lectura [Cálculo]:** los precios de mercado bajos para rutas largas son compatibles con **camiones grandes que llevan varias mudanzas** o con retorno ocupado. No son compatibles con una 3.5 t dedicada a un solo cliente que regresa vacía (ver §4).

---

## 3. Modelos de cobro

### 3.1 Qué usa realmente el mercado (prácticas documentadas)

| Modelo | Quién lo usa (documentado) | Dónde aplica |
|---|---|---|
| **Paquete por unidad + número de ayudantes** | Muebles y Mudanzas Milenio ($5,700 / $6,800 / $7,900 según ayudantes) | Mudanza local |
| **Tarifa base + km por tramos, precio dinámico** | Lalamove (primeros 3 km $185 y luego $/km decreciente; ajustes por tráfico y demanda; parada adicional) | Flete urbano de pocos objetos |
| **Por hora** | AtlasMex lo anuncia; las guías citan $600–$900 por hora | Local, sobre todo CDMX |
| **Precio cerrado tras inventario o visita** | AtlasMex, Mudango (“visita de estimación de volumen”) | Mudanzas medianas y grandes |
| **Por m³** | Mudanzas compartidas foráneas ($600–$1,200 por m³ según guías) | Consolidada |
| **Por km** | Fletes de carga ($14–$20 por km en 3.5 t según CotizadoraOnline) | Carga general, no mudanza con maniobras |
| **Extras por concepto** | Pisos sin elevador, refrigerador por escalera, empaque “cotizado aparte” (tumudanza, guías) | Todos |

No encontré documentación pública sobre cargos por tiempo de espera, retorno vacío o temporada en empresas específicas. Lo que propongo para esos conceptos en §8 es **mi modelo, no una práctica documentada**.

### 3.2 Qué factor manda en cada caso

| Factor | Cómo afecta | Recomendación |
|---|---|---|
| Precio mínimo de salida | Cubre el costo de mover unidad y cuadrilla aunque el trabajo sea pequeño | Indispensable |
| Precio por viaje o paquete | Simple para el cliente | Para locales estándar |
| Kilómetro | Refleja combustible y desgaste | Componente en foráneos; **nunca solo** |
| Horas o jornada | Refleja mano de obra y ocupación de la unidad | Para controlar excesos (hora extra) |
| Peso | En mudanzas casi nunca limita primero | Revisa la carga útil legal solo con pianos, cajas fuertes o gimnasios |
| m³ o espacio | Lo que realmente se agota en una mudanza | Base para decidir qué unidad usar y para cobrar en compartidas |
| Peso volumétrico | Paquetería y consolidado | No aplica a tu servicio exclusivo |
| Capacidad de la unidad | Una 3.5 t caja corta ≈ 20 m³ según Milenio. La F-350 chasis 2026 tiene 3,420–3,647 kg de capacidad **antes** de restar la caja ([catálogo Ford](https://s3-us-west-2.amazonaws.com/my-car-mexico/modelos/afb1cdbd/ford-super-duty-chasis-2026-catalogo-descargable.pdf)) | Mide el m³ interior real de cada caja y pesa cada unidad vacía |
| Personal | El costo directo más grande | Cobro por ayudante adicional |
| Pisos, elevador, acarreo | Más tiempo y riesgo | Extra por concepto |
| Empaque, desarmado, armado, volado | Mano de obra especializada, material y riesgo | Extra por concepto o paquete Superior o Completo |
| Espera | Ocupa unidad y cuadrilla | Tolerancia y luego cobro por hora |
| Casetas, estacionamiento, accesos | Costo directo | Siempre se trasladan al cliente |
| Seguro de mercancía | **Distinto del seguro del vehículo.** Tu póliza de $30,000 al año cubre la camioneta y la responsabilidad civil; normalmente no cubre los muebles del cliente | Cotiza una póliza de carga o mercancía transportada y cóbrala como opcional |
| Temporada y urgencia | Fines de mes, quincenas, diciembre, servicio el mismo día | Recargo del 10–20 % [Supuesto] |
| Retorno vacío | En foráneos puede representar ~40 % del costo | Se cobra al cliente salvo que el retorno esté confirmado |

### 3.3 ¿La tarifa por km es precio final, componente o indicador?

- **Precio final:** solo en flete puro de carga (plataformas y fletes por km).
- **Componente:** en foráneos, el km cubre combustible, desgaste y casetas, y se suma al personal, los viáticos y los días de unidad.
- **Indicador interno:** te dice si un viaje cubre su costo.

**Por qué falla una sola tarifa por km [Cálculo, §5.2 y §4]:**

| Servicio | km operativos | Costo total | Costo por km |
|---|---|---|---|
| Local de 40 km (20 servicios al mes) | 40 | ~$2,435 | **~$61/km** |
| Querétaro, exclusivo, regreso vacío | 450 | ~$8,047 | ~$18/km |
| Guadalajara | 1,100 | ~$24,980 | ~$23/km |

En un local, la mayor parte del costo es **tiempo** (cuadrilla y ocupación de la unidad), no kilómetros. Si cobras $20 por km a un local de 40 km obtienes $800, cuando el costo es de $2,435. Si cobras $61 por km a Guadalajara obtienes ~$67,000 y quedas fuera del mercado.

---

## 4. Comparación de rutas y servicios

**Supuestos de ruta [Supuesto]:**
- Recorrido operativo = base → carga → descarga → regreso a base ≈ 2 × trayecto + 20 km.
- Velocidad media de 55 km/h; carga de 4 h y descarga de 3 h; jornadas de hasta 11 h; hasta 250 km de trayecto se hace en una jornada larga.
- Personal foráneo: chofer $600 por día y ayudante $400 por día. Comidas: $250 por persona en viajes de un día y $450 si pernoctan. Hotel: $900 por noche.
- Vehículo: $8.25 por km. Costo fijo y depreciación por día ocupado: $735.

**Casetas:** son una **estimación gruesa** para clase camión de 2 ejes (doble rodada), porque las fuentes encontradas no coinciden. Por ejemplo, la México–Toluca cobra ~$244 a camión de 2 ejes ([Telediario](https://www.telediario.mx/comunidad/autopista-mexico-toluca-cuanto-cuesta-caseta-en-2026)) y la México–Querétaro cobra $497 o más a camiones ([N+](https://www.nmas.com.mx/ciudad-de-mexico/sube-costo-caseta-mexico-queretaro-2026-este-es-nuevo-precio-utilizar-autopista-de-capufe/)). **Verifica cada ruta en “Traza tu ruta” de SICT y en el [PDF de tarifas CAPUFE 2026](https://pot.capufe.mx/gobmx/transparencia/Doc/TransparenciaF/Tarifas/Vigentes/2026/Tarifas-vigentes-2026.pdf).** Confirma también con qué clase te cobran a la F-350 con caja en cada plaza.

**Distancias:** son aproximadas y deben confirmarse en un mapa. La columna “km ida” es **un trayecto**; “km operativos” es el **recorrido total**.

| Destino | km ida | km operativos | Días de unidad | Costo total exclusivo, regreso vacío [Cálculo] | Precio con margen de 35 % | Mercado publicado |
|---|---|---|---|---|---|---|
| Local Valle de Toluca | — | 40 | 1 (~5–7 h) | ~$2,215–$3,391 (según volumen mensual) | ~$3,400–$5,200 | $3,000–$5,500 |
| CDMX | 65 | 150 | 1 | ~$4,470 | ~$6,900 | Sin dato Toluca–CDMX |
| Querétaro | 215 | 450 | 1 (jornada larga) | ~$8,050 | **~$12,400** | $7,000–$13,000 pequeña; mediana $10,000 |
| León | 390 | 800 | 2 | ~$17,300 | ~$26,600 | Sin dato confiable |
| Guadalajara | 540 | 1,100 | 3 | ~$25,000 | ~$38,400 | $10,000–$20,000 común; hasta $56,000 |
| Veracruz | 470 | 960 | 3 | ~$23,400 | ~$36,000 | Sin dato confiable |
| Mérida | 1,380 | 2,780 | 6 | ~$55,600 | ~$85,500 | $13,000–$26,000 |
| Cancún | 1,680 | 3,380 | 7 | ~$66,300 | ~$102,000 | $23,500 compartida |

### 4.1 Cómo medir la rentabilidad de cada viaje

- **Por viaje:** Utilidad = Precio sin IVA − (vehículo + casetas + personal + viáticos + materiales) − (días ocupados × costo fijo diario).
- **Por km:** Utilidad del viaje ÷ km operativos. Sirve para comparar foráneos entre sí, no locales contra foráneos.
- **Por día de ocupación:** (Precio − costos directos) ÷ días que la unidad no puede hacer otra cosa. **Este es el indicador que más te sirve**, porque tu recurso escaso es el día-unidad-cuadrilla.

**Ejemplo de por qué un ingreso mayor no siempre deja más [Cálculo]:**

| Servicio | Precio sin IVA | Costos directos | Contribución | Días | Contribución por día |
|---|---|---|---|---|---|
| Local | $3,500 | $1,480 | $2,020 | 1 | **$2,020** |
| Local | $4,000 | $1,480 | $2,520 | 1 | **$2,520** |
| Querétaro | $9,500 (precio tipo Monroy) | $7,312 | $2,188 | 1 | $2,188 |
| Querétaro | $12,400 | $7,312 | $5,088 | 1 | $5,088 |
| Guadalajara | $20,000 (mercado “común”) | $22,775 | **−$2,775** | 3 | **−$925** |
| Guadalajara | $38,400 | $22,775 | $15,625 | 3 | $5,208 |

Un Guadalajara de $20,000 parece “la venta grande del mes”, pero pierde dinero y además bloquea la unidad 3 días en los que podría hacer 2–3 locales.

### 4.2 Escenarios de regreso

| Escenario | Cómo tratarlo |
|---|---|
| **Regreso vacío** | El cliente paga el viaje redondo completo. Es tu caso base de cotización. |
| **Regreso con carga confirmada** (pagada o con anticipo) | Precio de ida = (Costo redondo − Ingreso neto del retorno + costo extra del retorno) ÷ (1 − margen). Ejemplo para Guadalajara con un retorno confirmado que deja $10,000 netos y $1,500 de costo extra (maniobras): ($24,980 − $10,000 + $1,500) ÷ 0.65 ≈ **$25,400**, contra $38,400 en vacío. |
| **Regreso probable, no confirmado** | **No lo descuentes del precio.** Si lo consigues, es utilidad adicional. Para planear puedes estimar el valor esperado (probabilidad × ingreso neto), pero nunca lo uses como piso de precio. |
| **Viaje de varios días** | Suma un costo fijo de $735 por día de unidad, más el personal por día, hospedaje y comidas. Pregúntate cuántos locales pierdes esos días. |
| **Exclusivo frente a compartido** | Con una 3.5 t, lo compartido solo tiene sentido si juntas 2–3 clientes en la misma ruta y fecha y cobras por m³. En destinos lejanos te conviene más **subcontratar o aliarte con una consolidadora**: cobras la recolección y la maniobra local y ganas una comisión. |

---

## 5. Costos de tu operación

### 5.1 Costo variable por km de la unidad 3.5 t [Cálculo con tus datos]

| Concepto | $/km | Origen |
|---|---|---|
| Combustible ($25/l ÷ 4 km/l) | 6.25 | [Tuyo] |
| Servicios ($6,000 cada 10,000 km) | 0.60 | [Tuyo] |
| Llantas (6 × $5,000 cada 50,000 km) | 0.60 | [Tuyo] |
| Reparaciones y desgaste (frenos, clutch o transmisión, suspensión, eléctrico, caja) | 0.80 | **[Supuesto] faltaba en tu lista** |
| **Total** | **8.25** | [Cálculo] |

**Sensibilidad.** A $27/l y 4 km/l: $8.75. A $25/l y 3.5 km/l: $9.14. A $27/l y 3.5 km/l: $9.71.

Referencias de precio: el diésel está en ~$26.98/l y la gasolina Magna en ~$23.8/l al 3 de noviembre de 2026 ([El Heraldo](https://heraldodemexico.com.mx/economia/2026/11/3/antes-de-cargar-gasolina-revisa-estos-lugares-venden-el-litro-por-debajo-de-los-2382-pesos-hoy-de-noviembre-921757.html), [Infobae](https://www.infobae.com/mexico/2026/11/03/nacionales-asi-quedo-el-precio-de-la-gasolina-hoy-en-mexico/)). **Confirma qué combustible usa cada unidad:** las F-350 en México suelen ser de gasolina y otras 3.5 t de diésel. Tus $25/l quedan en medio. En ciudad, el rendimiento real puede ser menor que 4 km/l; mídelo.

### 5.2 Costos fijos mensuales por unidad

| Concepto | $/mes | Origen |
|---|---|---|
| Seguro del vehículo ($30,000 al año) | 2,500 | [Tuyo] |
| Verificaciones ($3,000 al año) | 250 | [Tuyo] |
| Tenencia ($4,500 al año) | 375 | [Tuyo] |
| GPS ($250 al mes + $2,000 iniciales en 60 meses) | 283 | [Tuyo] |
| Estacionamiento o pensión | 1,500 | [Supuesto] |
| Otros: placas y refrendo, lavado, celular, permisos | 700 | [Supuesto] |
| **Subtotal fijos de la unidad** | **5,608** | [Cálculo] |
| Generales del negocio ÷ 3 unidades (marketing $6,000 + administración, contador y teléfono $4,000 + oficina y otros $3,000) | 4,333 | [Supuesto]; tu presupuesto de marketing está por confirmar |
| Depreciación económica: ($800,000 − $250,000) ÷ 60 meses | 9,167 | [Cálculo] |
| **Total fijo + depreciación** | **19,108** | [Cálculo] |

**Costos que faltan o hay que confirmar:**
- La caja y sus adaptaciones (piso, rieles, amarres, rampa o plataforma) ¿están incluidas en los $800,000?
- Deducibles de siniestros (suelen ser del 5–10 % del valor).
- Multas y corralón.
- Días sin trabajar por taller, porque bajan el número de servicios posibles.
- Desgaste y reposición de cobijas, diablitos, correas y herramientas.
- Seguro de mercancía.
- **Tu propio sueldo**, que no está incluido. Si tú operas o vendes, la “utilidad” de este modelo incluye tu salario.
- Costo de oportunidad del capital: $800,000 al ~10 % anual equivalen a ~$5,000–$6,700 al mes que podrías ganar sin riesgo. No lo sumé a la utilidad, pero sí lo uso para juzgar la TIR.

**Costo total por km según utilización [Cálculo]:**

| km al mes | km en 5 años | Variable $/km | Fijo + depreciación $/km | Total $/km |
|---|---|---|---|---|
| 1,000 (≈ 25 locales) | 60,000 | 8.25 | 19.11 | **27.36** |
| 2,000 | 120,000 | 8.25 | 9.55 | 17.80 |
| 3,333 (tus 200,000 km) | 200,000 | 8.25 | 5.73 | **13.98** |
| 5,000 | 300,000 | 8.25 | 3.82 | 12.07 |

**Diferencia clave.** Con 200,000 km tu costo sería ~$14/km. Con una operación solo local (~1,000 km al mes) es ~$27/km. Si usas el costo de $14/km para cotizar locales, **subestimas tu costo a la mitad**. Por otro lado, con poco kilometraje la reventa de $250,000 podría ser conservadora; por eso la sensibilidad de reventa está en §6.

### 5.3 Costo por servicio local (~40 km)

| Concepto | Esquema A: chofer + 2 ayudantes ($700) | Esquema B: “$1,800 de maniobras” |
|---|---|---|
| Vehículo: 40 km × $8.25 | 330 | 330 |
| Personal | 700 [Tuyo] | 1,800 [Tuyo; ¿incluye al chofer?] |
| Comidas y agua | 200 [Supuesto] | 200 (o $0 si va dentro de los $1,800) |
| Materiales: emplaye, cinta, desgaste de cobijas | 250 [Supuesto] | 250 |
| **Costo directo** | **1,480** | **2,580** |
| Fijo + depreciación por servicio con 20 servicios al mes | 955 | 955 |
| **Costo total** | **2,435** | **3,535** |
| Utilidad a $3,500 **sin IVA** | +$1,065 (30 %) | **−$35 (−1 %)** |
| Utilidad si $3,500 **incluye IVA** (ingreso de $3,017) | +$582 (19 %) | **−$518 (−17 %)** |

**Revisión de tu estimación del 50 % [Cálculo].** Ese margen solo aparece si únicamente restas los $1,800. Con los costos completos, el esquema B no deja utilidad. Antes de decidir:
1. Confirma si los $1,800 incluyen al chofer. Si lo incluyen, no lo sumes otra vez.
2. Confirma si incluyen comidas.
3. Confirma cuántas personas cubren. $1,800 parece pago para 4–5 personas o una tarifa de un tercero.

**Mano de obra: lo que falta en tus referencias.** Pagar $200–$300 por servicio es un pago por destajo. Si el servicio dura una jornada, queda por debajo del salario mínimo de 2026 ($315.04 diarios; [UnoTV](https://www.unotv.com/negocios/salario-minimo-2026-aumento-montos-y-fecha-de-entrada-en-vigor/)). Si formalizas al personal, agrega:
- Cuotas IMSS, INFONAVIT (5 %) e ISN del Estado de México.
- Aguinaldo, vacaciones y prima vacacional.

Las calculadoras públicas dan una carga del ~35–36 % sobre el sueldo ([hacecuentas](https://hacecuentas.com/mx/calculadora-costo-empleado-patron-mexico-2026), [praxium](https://praxiumconsultores.com/blog/cuotas-obrero-patronales-imss-2026-cuanto-paga-el-patron); referencia, no dato oficial).

Por ejemplo, un esquema formal de 3 personas a ~$400 diarios cada una, con 35 % de carga, cuesta ~$1,620 por día de servicio, contra tus $700 [Supuesto]. **No conozco tu esquema de contratación**, así que el modelo incluye un parámetro `carga_laboral` para que lo ajustes. Además, informalidad es riesgo: un accidente de un ayudante sin IMSS puede costar más que una camioneta.

**IVA.** Para medir la rentabilidad, usa solo el ingreso propio (precio sin IVA). El IVA que cobras se le debe al SAT. El IVA que pagas en combustible, refacciones o la compra de la unidad puede acreditarse si tienes facturas y estás en un régimen que lo permite. Por eso, en este modelo todos los costos están sin IVA.

**Marketing.** No sumé tus $6,000 y $9,000 (por confirmar). Si fueran $9,000 al mes y el negocio hace 40 servicios, el costo de adquisición es de ~$225 por servicio. Si hace 20, ~$450 por servicio. Mide cuánto va a pauta y cuánto a la herramienta, la agencia o SaleAds.

---

## 6. Inversión a cinco años y sensibilidad

### 6.1 Modelo general para una unidad de precio X

- Depreciación mensual = (X − Reventa) ÷ (años × 12)
- Costo variable por km = Combustible por litro ÷ rendimiento + Servicio ÷ km entre servicios + Juego de llantas ÷ vida en km + Reparaciones por km
- Costo fijo mensual = (Seguro + Tenencia + Verificaciones) ÷ 12 + GPS + Estacionamiento + Otros + Generales asignados
- Costo total por km = Variable por km + (Fijo mensual + Depreciación mensual) ÷ km al mes
- Costo por servicio = Costo directo del servicio + (Fijo mensual + Depreciación) ÷ servicios al mes
- Punto de equilibrio en servicios al mes = (Fijo mensual + Depreciación) ÷ (Precio sin IVA − Costo directo por servicio)
- Flujo operativo anual = 12 × [servicios × (precio − costo directo) − fijo mensual]. No incluye la depreciación, porque no es salida de efectivo.
- Utilidad operativa anual = Flujo operativo − Depreciación anual
- Recuperación = año en que el flujo acumulado (−X + flujos operativos) llega a cero
- TIR (rendimiento anualizado) = tasa que hace cero el VPN de los flujos [−X, F1, F2, F3, F4, F5 + Reventa]
- Rendimiento acumulado = (Σ flujos operativos + Reventa − X) ÷ X

### 6.2 Resultados de contado (servicios locales, sin IVA, sin impuestos y sin tu sueldo) [Cálculo]

| Servicios al mes | Precio | Reventa | Flujo operativo anual | Utilidad operativa anual | Recuperación | TIR | Rendimiento acumulado a 5 años |
|---|---|---|---|---|---|---|---|
| 10 | $3,500 | $250,000 | $123,100 | $13,100 | 4.8 años | 2 % | 8 % |
| 10 | $3,500 | $150,000 | $123,100 | −$6,900 | >5 años | −1 % | −5 % |
| 20 | $3,100 | $250,000 | $269,500 | $159,500 | 3.0 años | 25 % | 99 % |
| 20 | $3,500 | $250,000 | $365,500 | $255,500 | 2.2 años | 39 % | 159 % |
| 20 | $4,000 | $250,000 | $485,500 | $375,500 | 1.7 años | 56 % | 234 % |
| 26 | $3,500 | $250,000 | $510,940 | $400,940 | 1.6 años | 59 % | 250 % |
| 26 | $4,000 | $250,000 | $666,940 | $556,940 | 1.2 años | 80 % | 348 % |

**Efecto de la reventa.** Cada $100,000 de diferencia en la reventa mueve la utilidad operativa anual en $20,000. En la TIR pesa poco cuando hay volumen y mucho cuando la unidad trabaja poco. **Con 10 servicios al mes la inversión no rinde más que dejar el dinero en el banco.**

**Advertencia.** Las TIR altas suponen que vendes esos servicios **todos los meses durante 5 años**, sin impuestos y sin tu sueldo. Con 2 mudanzas diarias en todo el negocio (~52 al mes) repartidas en 3 unidades, cada unidad hace ~17 servicios al mes, no 26.

### 6.3 Financiamiento: fórmulas y ejemplo **hipotético** (no es tu crédito)

- Mensualidad = P × i ÷ (1 − (1 + i)^−n), donde P es el monto financiado, i la tasa mensual y n el número de meses. Suma comisiones de apertura, seguro de vida o daños que exija el banco e IVA sobre los intereses si aplica.

**Ejemplo hipotético:** enganche del 20 % ($160,000), $640,000 financiados al 18 % anual a 48 meses → **mensualidad de ~$18,800** e intereses totales de ~$262,400.

**Cómo se reconoce cada cosa (sin doble conteo):**

| Concepto | Análisis económico (utilidad) | Flujo de efectivo |
|---|---|---|
| Compra | **No** es gasto; se reconoce vía **depreciación** mensual | Salida: el enganche (o todo, si es de contado) en el mes 0 |
| Pago de capital del crédito | **No** es gasto; ya está en la depreciación | Salida mensual |
| Intereses | **Sí** son gasto financiero, debajo de la utilidad operativa | Salida mensual |
| Reventa | Ya se descontó en la depreciación (X − reventa). Si vendes por más o por menos, la diferencia es ganancia o pérdida | Entrada al final |
| Depreciación | Gasto | **No** es salida de efectivo |

**Ejemplo con 20 servicios al mes a $3,500 sin IVA [Cálculo]:**
- Flujo operativo: ~$30,460 al mes.
- Con el crédito hipotético quedan **~$11,660 al mes** después de la mensualidad, durante 4 años, antes de impuestos y de tu sueldo.
- Utilidad operativa: $21,290 al mes. Utilidad después de intereses en el año 1: ≈ $21,290 − ~$8,500 de intereses ≈ **$12,800 al mes**.
- **El saldo de efectivo no es utilidad**: parte de él debe apartarse para renovar la unidad (los $9,167 al mes de depreciación son la reserva para la siguiente camioneta).

En 5 años, de contado acumulas ~$1.28 millones en efectivo neto y con crédito ~$1.01 millones. La diferencia (~$262,000) son los intereses.

**Con 10 servicios al mes, el crédito hipotético deja un flujo negativo de ~−$8,500 al mes.** No financies una unidad sin demanda probada.

---

## 7. Escenarios aplicados a tus precios (local ~40 km, por unidad 3.5 t, precios sin IVA)

Fijos asignados: $9,942 al mes (unidad + generales). Depreciación: $9,167 al mes. Costo directo: $1,480 por servicio (esquema A).

| Servicios al mes | Precio | Ventas | Costos variables | Margen de contribución | Utilidad operativa | Margen sobre ventas | Flujo después del crédito hipotético ($18,800) | Factibilidad |
|---|---|---|---|---|---|---|---|---|
| 10 | 3,100 | 31,000 | 14,800 | 16,200 | −2,908 | −9 % | −12,542 | Fácil |
| 10 | 3,500 | 35,000 | 14,800 | 20,200 | 1,092 | 3 % | −8,542 | Fácil |
| 10 | 4,000 | 40,000 | 14,800 | 25,200 | 6,092 | 15 % | −3,542 | Fácil |
| 10 | 4,500 | 45,000 | 14,800 | 30,200 | 11,092 | 25 % | +1,458 | Fácil |
| 20 | 3,100 | 62,000 | 29,600 | 32,400 | 13,292 | 21 % | +3,658 | Factible si hay demanda |
| 20 | 3,500 | 70,000 | 29,600 | 40,400 | 21,292 | 30 % | +11,658 | Factible si hay demanda |
| 20 | 4,000 | 80,000 | 29,600 | 50,400 | 31,292 | 39 % | +21,658 | Factible si hay demanda |
| 20 | 4,500 | 90,000 | 29,600 | 60,400 | 41,292 | 46 % | +31,658 | Factible si hay demanda |
| 26 | 3,100 | 80,600 | 38,480 | 42,120 | 23,012 | 29 % | +13,379 | Exigente: 1 diario de lunes a sábado, sin margen para taller |
| 26 | 3,500 | 91,000 | 38,480 | 52,520 | 33,412 | 37 % | +23,779 | Exigente |
| 26 | 4,000 | 104,000 | 38,480 | 65,520 | 46,412 | 45 % | +36,779 | Exigente |
| 26 | 4,500 | 117,000 | 38,480 | 78,520 | 59,412 | 51 % | +49,779 | Exigente |
| 40 | 3,100–4,500 | 124,000–180,000 | 59,200 | 64,800–120,800 | 45,692–101,692 | 37–56 % | — | **Poco realista** para mudanzas completas: 2 diarios en ~14 días, solo con servicios de ≤3.5 h y 2 cuadrillas |

**Notas:**
- Flujo después del crédito = utilidad operativa + depreciación − mensualidad.
- **Factibilidad:** una mudanza local de 3.5 t dura ~4–7 h con traslados [Supuesto; mídelo]. Una unidad tiene ~24–26 días útiles al mes.
- Hay que **recalcular el kilometraje**: 26 locales × 40 km = 1,040 km al mes, ~62,000 km en 5 años, no 200,000. La depreciación por tiempo sigue igual ($9,167 al mes), así que el costo por servicio no baja aunque recorras menos km.

### 7.1 Precio por margen objetivo

**Precio = Costo total ÷ (1 − margen sobre ventas)**

| Servicios al mes | Costo total por servicio | Margen 30 % | Margen 40 % | Margen 50 % |
|---|---|---|---|---|
| 10 | $3,391 | $4,844 | $5,651 | $6,782 |
| 20 | $2,435 | **$3,479** | **$4,059** | $4,871 |
| 26 | $2,215 | $3,164 | $3,692 | $4,430 |

- **Margen sobre ventas no es lo mismo que incremento sobre costo.** Un 50 % sobre ventas equivale a +100 % sobre el costo (dividir entre 0.5 = multiplicar por 2). Un +50 % sobre el costo solo da un 33 % de margen.
- Dividir entre 0.50 da un margen real del 50 % **solo si el costo usado incluye todo**: personal con sus cargas reales, vehículo por km, fijos, depreciación, materiales, comisiones y marketing. Si usas solo combustible y ayudantes, el “50 %” es ilusorio, como en tu caso de $1,800.

---

## 8. Sistema de cotización recomendado y tabla de precios

### 8.1 Estructura

1. **Tarifa mínima de salida:** cubre hasta 3 h, 25 km, chofer + 1 ayudante, sin pisos.
2. **Paquete base por unidad** (Estándar): la unidad elegida por m³, chofer + 2 ayudantes, hasta 6 h y 40 km operativos, cobijas, emplaye de piezas delicadas (hasta 5) y planta baja o elevador.
3. **Extras por concepto** (tabla 8.3).
4. **Foráneos:** km operativos × costo por km de la unidad + casetas reales + días × (personal + viáticos + $735 de costo fijo diario), todo ÷ (1 − margen). Siempre con regreso vacío, salvo retorno confirmado.
5. **Elección de unidad por volumen**, no por peso. Inventario rápido por foto o videollamada y luego clasificación por m³ (mide la caja interior de cada unidad).

**Cuándo usar cada modelo de cobro:**

| Situación | Cobro |
|---|---|
| Local estándar | Paquete por viaje + extras |
| Trabajo incierto (bodega o cliente desorganizado) | Mínimo + hora extra |
| Foráneo | Viaje redondo calculado (km + días + casetas) |
| Compartido | Por m³ |

### 8.2 Tabla de precios recomendados (sin IVA; si factura, + 16 %)

Los montos se calculan con 20 servicios al mes por unidad y personal del esquema A. Si tu volumen real es menor o tu personal cuesta más, súbelos.

| Servicio | 1. ¿Cuánto cobra el mercado? [Mercado] | 2. ¿Cuánto te cuesta? [Cálculo] | 3. Precio mínimo sostenible (margen ≈ 30 %) | 3. Precio comercial recomendado | Precio excepcional (solo para llenar huecos) |
|---|---|---|---|---|---|
| Flete mínimo de salida (1.5 t, chofer + 1, ≤3 h) | $350–$2,800 (apps y fletes) | ~$1,000–$1,300 (estimación con unidad menor; confirma sus costos) | $1,500 | $1,700–$1,900 | ≥ $1,100 |
| **Mudanza local 3.5 t Estándar** (chofer + 2, ≤6 h, ≤40 km) | $3,000–$5,700 | $2,435 (directo $1,480) | **$3,500** | **$3,900–$4,200** | ≥ $2,000 |
| Local 3.5 t **Superior** (+1 ayudante, emplaye completo, desarmado y armado básico) | $5,700–$6,800 (Milenio, 3 ayudantes) | ~$3,100 | $4,450 | $4,900–$5,500 | ≥ $2,600 |
| Local **Completo** (empaque total, 4 ayudantes, posible 2 días) | $6,000–$15,000 | Según inventario (cajas, horas) | Costo ÷ 0.65 | Costo ÷ 0.55–0.60 | Nunca por debajo del costo directo |
| Toluca → CDMX (3.5 t) | Sin dato directo | ~$4,470 | $6,400 | $6,900–$7,500 | ≥ $5,000 |
| Toluca → Querétaro (3.5 t exclusiva) | $7,000–$13,000; Monroy $9,500 [Tuyo] | ~$8,050 | $11,500 | **$12,400–$13,500** | ≥ $8,800 con retorno probable |
| León | Sin dato | ~$17,300 | $24,700 | $26,600–$28,900 | Solo con retorno confirmado |
| Guadalajara / Veracruz | $10,000–$20,000 común (probablemente compartido) | ~$23,400–$25,000 | $33,500–$35,700 | $36,000–$41,600 | No compitas en exclusivo por debajo de ~$24,000 |
| Mérida / Cancún | $13,000–$26,000 / $23,500 compartida | ~$55,600–$66,300 | — | **No ofrezcas 3.5 t exclusiva** salvo cliente premium | Alianza con una consolidadora |

**Precio excepcional frente a precio sostenible:**
- El **precio excepcional** cubre el costo directo y aporta algo a los fijos. Solo aplica si la unidad y la cuadrilla estarían paradas ese día (cancelación, hueco del mismo día).
- El **precio sostenible** cubre todo (directos, fijos, depreciación y margen) y es el que debe regir durante el año.
- Si más del ~15 % de tus servicios del mes salen a precio excepcional, tu precio real promedio deja de ser sostenible.

**Descuento máximo [Cálculo].** Desde un precio de lista de $4,000 sin IVA, el descuento máximo es de **~12 % (hasta $3,500)**, porque mantiene ~30 % de margen con 20 servicios al mes. Por debajo de $3,100 (−22 %) el margen cae a ~21 %. Por debajo de $2,435 pierdes dinero con todo y depreciación.

### 8.3 Extras recomendados [Supuesto; mi modelo, no práctica documentada]

| Concepto | Cobro sugerido sin IVA | Base |
|---|---|---|
| Ayudante adicional | $400–$500 por servicio | Costo de $200–$400 + margen |
| Piso sin elevador (a partir del 2.º) | $250–$400 por piso | Mercado: $200–$500 por nivel |
| Acarreo de más de 20 m (calle cerrada, privada) | $200 por cada 20 m adicionales | Tiempo de la cuadrilla |
| Hora extra (después de 6 h) | $650–$750 por hora | Cuadrilla + ocupación de la unidad; mercado: $600–$900 por hora |
| Espera | 30 min de tolerancia; luego $400–$500 por hora | Ocupación |
| Desarmado y armado | $150–$350 por mueble (cama, ropero, litera) | Tiempo y herramienta |
| Emplaye adicional | $80–$150 por pieza grande | Material + mano de obra |
| Empaque | Por caja: $60–$90 con material; o por hora de empacador | Mercado: $500–$4,000 por servicio |
| Volado | Desde $1,500 por pieza; cotización con visita | Riesgo, equipo y personal extra |
| Casetas, estacionamiento, permisos | Al costo real, siempre visibles | — |
| Seguro de mercancía | Opcional, % del valor declarado según tu póliza | Cotiza con una aseguradora |
| Urgencia (mismo día), quincena o fin de mes, diciembre | +10–20 % | Temporada |

---

## 9. Datos que debes medir en los próximos 30 días

1. **Por servicio:** hora de salida y regreso a la base, horas de maniobra, km del odómetro, litros cargados y monto, casetas, estacionamiento y comidas.
2. **Personal por servicio:** quién fue, cuánto se le pagó y si los $1,800 incluyen al chofer.
3. **Volumen real:** m³ ocupados (foto de la caja al cerrar) y m³ interior real de cada unidad.
4. **Rendimiento real** (km/l) de cada unidad, en ciudad y en carretera, y tipo de combustible.
5. **Comercial:** cotizaciones enviadas, ganadas y perdidas, motivo de pérdida (precio, fecha, otra empresa) y canal de origen (Meta, SaleAds, referido, Google).
6. **Precio cobrado y si se facturó** (con o sin IVA), descuentos y extras cobrados.
7. **Gasto de marketing desglosado:** pauta frente a herramienta o agencia.
8. **Costos de la unidad:** reparaciones, llantas, servicios, días en taller y multas.
9. **Días útiles** por unidad y días parados por falta de demanda.
10. **Casetas reales** por ruta y clase cobrada a tu F-350.
11. **Tres cotizaciones de “cliente incógnito”** a competidores de Toluca y Metepec con el mismo inventario, preguntando si incluyen IVA, ayudantes, pisos y emplaye. Así convertirás los rangos orientativos de este informe en referencias comparables.

---

## 10. Preguntas que pueden cambiar la conclusión

1. **¿Tus $3,500 incluyen IVA?** ¿Facturas? Cambia el ingreso real un 14 %.
2. **¿Los $1,800 de maniobras incluyen al chofer y las comidas?** ¿Cuántas personas cubren?
3. **¿Cuántos servicios hace realmente cada unidad al mes**, y cuántas unidades operan a la vez?
4. **¿Los $800,000 incluyen la caja y es precio con IVA?** ¿La unidad ya está comprada o es una decisión pendiente?
5. **¿Tu personal es fijo con IMSS o eventual por servicio?**
6. **¿Los $6,000 y $9,000 de marketing son alternativas o se suman?** ¿Cuánto es pauta?
7. **¿Cuánto tiempo dura en promedio tu mudanza local** (de la salida al regreso a la base)?

---

## 11. Veredicto sobre tus $3,500 (local, 3.5 t)

- **¿Bajos, competitivos o altos?** **Competitivos, en la mitad baja del mercado.** Con la evidencia disponible, el rango comparable en Valle de Toluca y CDMX es de ~$3,000–$5,700. El promedio de cotizaciones de Habitissimo en Toluca es de $4,489. La tarifa publicada más comparable (3.5 t, chofer + 2 ayudantes, CDMX) es de $5,700. No son altos. Son bajos si incluyen IVA o si das emplaye, pisos o un tercer ayudante sin cobrarlos.

- **¿Bajo qué condiciones son rentables?** Se cumplen las cuatro a la vez:
  1. Son **sin IVA** (o no facturas).
  2. El costo de personal ronda los **$700** (chofer + 2), no $1,800.
  3. Cada unidad hace **al menos ~12–15 servicios al mes**. El equilibrio está en 9.5, pero necesitas colchón para impuestos, imprevistos y tu sueldo.
  4. Los extras (pisos, acarreos, desarmado, horas adicionales) **se cobran aparte**.

  Con 20 servicios al mes dejan ~30 % de utilidad operativa (~$21,000 al mes por unidad, antes de impuestos y de tu sueldo). Con $1,800 de personal, o con IVA incluido y 10 servicios, **pierden dinero**.

- **¿Qué tiene que cambiar para sostener y renovar tus unidades?**
  1. **Subir el precio de lista a ~$3,900–$4,200 sin IVA** para el paquete Estándar y dejar $3,500 como **piso negociable**, no como precio de salida.
  2. **Definir y cobrar los paquetes Superior y Completo** y los extras por concepto.
  3. **Apartar cada mes la depreciación** (~$9,200 por unidad 3.5 t) en una cuenta de renovación. Así, al año 5 tienes los ~$550,000 que, junto con la reventa, permiten reponer la unidad. Si no apartas ese dinero, la utilidad que ves es en parte el desgaste de tu camioneta.
  4. **Priorizar el volumen por unidad** antes que comprar más unidades. Tu meta de 2 mudanzas diarias en todo el negocio equivale a ~17 por unidad con 3 unidades: rentable a $3,500 sin IVA, pero holgado solo a partir de ~$3,900.
  5. **No vender foráneos largos en 3.5 t exclusiva por debajo del costo calculado.** Querétaro sí (≥$12,400). Guadalajara, Mérida y Cancún solo con retorno confirmado, carga compartida o alianza.
  6. **Presupuestar una formalización laboral gradual.** Tu precio debe aguantar un costo de personal ~35 % mayor sin caer por debajo de un 25 % de margen.

---

### Fuentes (consultadas el 3 de noviembre de 2026 vía buscador)

- Mercado local: [Habitissimo Toluca](https://www.habitissimo.com.mx/presupuesto/mudanzas/estado-de-mexico/toluca) · [Habitissimo Edomex](https://www.habitissimo.com.mx/presupuesto/mudanzas/estado-de-mexico) · [Habitissimo CDMX](https://www.habitissimo.com.mx/presupuesto/mudanzas/ciudad-de-mexico) · [Muebles y Mudanzas Milenio](https://mueblesymudanzas.com.mx/mudanzas-cdmx/) · [mejoresmudanzas CDMX](https://mejoresmudanzas.com/precios/mudanzas/cdmx) · [Blog mejoresmudanzas](https://www.blog.mejoresmudanzas.com/mudanzas-cdmx/cuanto-cuesta-un-camion-de-mudanza/) · [Box2Box guía](https://www.box2boxstorage.com/mx/blog/fletes-y-mudanzas-mexico-guia) · [Box2Box CDMX](https://www.box2boxstorage.com/mx/blog/mudanzas-cdmx) · [tumudanza.mx](https://tumudanza.mx/mudanzas-en-cdmx/) · [Tus Fletes y Mudanzas Toluca](https://tusfletesymudanzas.com.mx/toluca/) · [Prummo Toluca](https://prummo.app/es-MX/remociones/toluca) · [Mudanzas de Toluca](https://mudanzasdetoluca.com/) · [Samano](https://www.samanofletesymudanzas.com.mx/) · [Mudango Toluca](https://www.mudango.com/mudanzas/mexico/toluca) · [AtlasMex](https://www.atlasmex.mx/) · [mobbit](https://mobbit.mx/mudanzas-locales-en-mexico-precios-por-hora-distancia-y-numero-de-muebles/) · [cuantomecuesta](https://cuantomecuesta.com/mx/mudanza/) · [cronoshare](https://www.cronoshare.com.mx/cuanto-cuesta/mudanza) · [movingmemx CDMX](https://movingmemx.com/cuanto-cuesta-una-mudanza-en-cdmx/)
- Plataformas y flete por km: [Lalamove tarifas](https://www.lalamove.com/mexico/tarifas) · [Lalamove vehículos](https://www.lalamove.com/es-mx/vehiculos-tarifa-detalles) · [Lalamove conductores](https://www.lalamove.com/es-mx/es-mx/ganancias-conductores) · [CotizadoraOnline](https://www.cotizadoraonline.com/cotizacion-transporte-fletes)
- Foráneo y compartido: [mejoresmudanzas Querétaro](https://mejoresmudanzas.com/mudanzas-df/a/queretaro) · [movingmemx Querétaro](https://movingmemx.com/mudanzas-queretaro/) · [mejoresmudanzas Guadalajara 2026](https://mejoresmudanzas.com/consejos/cuanto-cuesta-una-mudanza-de-cdmx-a-guadalajara-en-2026/) · [mudanzas.org.mx Cancún](https://www.mudanzas.org.mx/precio-de-mudanza-de-cdmx-a-cancun-cotizacion/) · [mudanzaseconomicas.mx](https://mudanzaseconomicas.mx/precios-de-mudanzas-en-mexico/) · [mudanzasnacionales.com.mx](https://mudanzasnacionales.com.mx/mudanzas-foraneas/)
- Costos: [El Heraldo combustibles 3 de noviembre de 2026](https://heraldodemexico.com.mx/economia/2026/11/3/antes-de-cargar-gasolina-revisa-estos-lugares-venden-el-litro-por-debajo-de-los-2382-pesos-hoy-de-noviembre-921757.html) · [Infobae combustibles](https://www.infobae.com/mexico/2026/11/03/nacionales-asi-quedo-el-precio-de-la-gasolina-hoy-en-mexico/) · [Salario mínimo 2026 (UnoTV)](https://www.unotv.com/negocios/salario-minimo-2026-aumento-montos-y-fecha-de-entrada-en-vigor/) · [Calculadora de costo patronal (hacecuentas)](https://hacecuentas.com/mx/calculadora-costo-empleado-patron-mexico-2026) · [Cuotas IMSS 2026 (Praxium)](https://praxiumconsultores.com/blog/cuotas-obrero-patronales-imss-2026-cuanto-paga-el-patron) · [Catálogo Ford Super Duty chasis 2026](https://s3-us-west-2.amazonaws.com/my-car-mexico/modelos/afb1cdbd/ford-super-duty-chasis-2026-catalogo-descargable.pdf) · [Autocosmos F-350](https://www.autocosmos.com.mx/catalogo/vigente/ford/f-350)
- Casetas: [Telediario México–Toluca 2026](https://www.telediario.mx/comunidad/autopista-mexico-toluca-cuanto-cuesta-caseta-en-2026) · [El Heraldo casetas Edomex](https://heraldodemexico.com.mx/nacional/2026/4/13/aumenta-precio-de-casetas-en-autopistas-del-estado-de-mexico-este-sera-su-nuevo-costo-partir-de-hoy-795410.html) · [Arco Norte tarifas](https://www.arconorte.com.mx/tarifas/) · [N+ México–Querétaro 2026](https://www.nmas.com.mx/ciudad-de-mexico/sube-costo-caseta-mexico-queretaro-2026-este-es-nuevo-precio-utilizar-autopista-de-capufe/) · [CAPUFE tarifas vigentes 2026 (PDF)](https://pot.capufe.mx/gobmx/transparencia/Doc/TransparenciaF/Tarifas/Vigentes/2026/Tarifas-vigentes-2026.pdf) · [SAASCAEM autopistas estatales](http://saascaem.edomex.gob.mx/tarifas-red-estatal-autopistas)
