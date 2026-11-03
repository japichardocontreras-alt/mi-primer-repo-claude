"""
Modelo de costos, precios e inversión - Mudanzas Metepec.
Todas las cifras en MXN SIN IVA salvo que se indique.
Cada supuesto está etiquetado: [MIO] dato del dueño, [SUP] supuesto, [MKT] dato de mercado.
Ejecutar:  python3 modelo_costos.py
"""
import math

# ---------------- 1. Unidad 3.5 t (escenario de referencia) ----------------
U = dict(
    compra=800_000,        # [MIO] incluye caja? -> confirmar
    reventa=250_000,       # [MIO]
    anios=5,               # [MIO]
    km_total=200_000,      # [MIO]
    rend_km_l=4.0,         # [MIO]
    comb_l=25.0,           # [MIO] supuesto de cálculo
    servicio=6_000, servicio_cada=10_000,      # [MIO]
    llantas_juego=6*5_000, llantas_km=50_000,  # [MIO]
    reparaciones_km=0.80,  # [SUP] frenos, clutch/transmisión, suspensión, eléctrico, caja
    gps_ini=2_000, gps_mes=250,                # [MIO]
    seguro_anual=30_000, verif_anual=3_000, tenencia_anual=4_500,  # [MIO]
    estacionamiento_mes=1_500,  # [SUP]
    otros_unidad_mes=700,       # [SUP] placas/refrendo, lavado, celular de chofer, permisos
)

def var_km(u=U, comb=None, rend=None, rep=None):
    comb = u['comb_l'] if comb is None else comb
    rend = u['rend_km_l'] if rend is None else rend
    rep = u['reparaciones_km'] if rep is None else rep
    return dict(
        combustible=comb/rend,
        servicios=u['servicio']/u['servicio_cada'],
        llantas=u['llantas_juego']/u['llantas_km'],
        reparaciones=rep,
    )

def fijos_unidad_mes(u=U):
    return dict(
        seguro=u['seguro_anual']/12,
        verificaciones=u['verif_anual']/12,
        tenencia=u['tenencia_anual']/12,
        gps=u['gps_mes'] + u['gps_ini']/(u['anios']*12),
        estacionamiento=u['estacionamiento_mes'],
        otros=u['otros_unidad_mes'],
    )

def deprec_mes(u=U):
    return (u['compra']-u['reventa'])/(u['anios']*12)

# Gastos generales del negocio (no de la unidad) [SUP] -> se reparten entre unidades
GENERALES_MES = dict(marketing=6_000, admin_contador_telefono=4_000, oficina_bodega_otros=3_000)
UNIDADES = 3  # [MIO] 1.5, 2.5 y 3.5 t -> confirmar cuántas operan de verdad

# Costos directos por servicio LOCAL (~40 km) [MIO]/[SUP]
LOCAL = dict(
    km=40,
    chofer=300, ayudantes=2*200,   # [MIO] pago por servicio
    carga_laboral=0.0,             # [SUP] 0 si pago informal; ~0.35 si nómina formal
    comidas=200,                   # [SUP] agua/comida cuadrilla
    materiales=250,                # [SUP] emplaye, cinta, desgaste de cobijas
    comision_pago=0.0,             # [SUP] 0.035 si cobras con terminal
)

def costo_directo_local(precio, l=LOCAL, u=U, comb=None):
    vk = sum(var_km(u, comb).values())
    vehiculo = l['km']*vk
    personal = (l['chofer']+l['ayudantes'])*(1+l['carga_laboral'])
    return dict(vehiculo=vehiculo, personal=personal, comidas=l['comidas'],
                materiales=l['materiales'], comision=precio*l['comision_pago'])

def fmt(x): return f"{x:,.0f}"

def tabla(headers, rows):
    s = "| " + " | ".join(headers) + " |\n|" + "|".join(["---"]*len(headers)) + "|\n"
    for r in rows: s += "| " + " | ".join(str(c) for c in r) + " |\n"
    return s

def pmt(tasa_mes, n, pv):
    return pv*tasa_mes/(1-(1+tasa_mes)**-n)

def irr(flujos, lo=-0.99, hi=1.0):
    f = lambda r: sum(c/(1+r)**t for t, c in enumerate(flujos))
    for _ in range(200):
        mid = (lo+hi)/2
        if f(mid) > 0: lo = mid
        else: hi = mid
    return mid

if __name__ == "__main__":
    out = []
    vk = var_km(); vk_tot = sum(vk.values())
    out.append("## A. Costo variable por km (3.5 t)\n")
    out.append(tabla(["Concepto", "$/km", "Origen"], [
        ["Combustible (25 $/l ÷ 4 km/l)", f"{vk['combustible']:.2f}", "Dato tuyo / supuesto"],
        ["Servicios (6,000 ÷ 10,000 km)", f"{vk['servicios']:.2f}", "Dato tuyo"],
        ["Llantas (30,000 ÷ 50,000 km)", f"{vk['llantas']:.2f}", "Dato tuyo"],
        ["Reparaciones y desgaste", f"{vk['reparaciones']:.2f}", "Supuesto"],
        ["**Total variable**", f"**{vk_tot:.2f}**", "Estimación"],
    ]))
    out.append("Sensibilidad combustible: " + "; ".join(
        f"{c} $/l y {r} km/l → {sum(var_km(comb=c, rend=r).values()):.2f} $/km"
        for c, r in [(23.5,4),(25,4),(27,4),(25,3.5),(27,3.5),(25,5)]) + "\n")

    fu = fijos_unidad_mes(); fu_tot = sum(fu.values()); dep = deprec_mes()
    gen = sum(GENERALES_MES.values())/UNIDADES
    out.append("\n## B. Costos fijos mensuales por unidad\n")
    out.append(tabla(["Concepto", "$/mes"], [[k, fmt(v)] for k, v in fu.items()] + [
        ["**Subtotal fijos de la unidad**", f"**{fmt(fu_tot)}**"],
        [f"Generales del negocio asignados (÷{UNIDADES})", fmt(gen)],
        ["Depreciación económica (800k-250k)/60", fmt(dep)],
        ["**Total fijo + depreciación**", f"**{fmt(fu_tot+gen+dep)}**"]]))

    out.append("\n## C. Costo total por km según utilización\n")
    rows = []
    for km_mes in [1_000, 2_000, 3_333, 5_000]:
        fijo_km = (fu_tot+gen+dep)/km_mes
        rows.append([fmt(km_mes), fmt(km_mes*12*5), f"{vk_tot:.2f}", f"{fijo_km:.2f}", f"{vk_tot+fijo_km:.2f}"])
    out.append(tabla(["km/mes", "km en 5 años", "Variable $/km", "Fijo+dep $/km", "Total $/km"], rows))

    # ---------- D. Escenarios locales ----------
    out.append("\n## D. Escenarios servicio local (~40 km), precios SIN IVA, por unidad 3.5\n")
    fijos = fu_tot + gen
    rows = []
    for n in [10, 20, 26, 40]:
        for p in [3_100, 3_500, 4_000, 4_500]:
            cd = sum(costo_directo_local(p).values())
            ventas = n*p; cv = n*cd; mc = ventas-cv
            uo = mc - fijos - dep
            rows.append([n, fmt(p), fmt(ventas), fmt(cv), fmt(mc), fmt(fijos), fmt(dep), fmt(uo),
                         f"{uo/ventas*100:.0f}%"])
    out.append(tabla(["Serv/mes", "Precio", "Ventas", "C. variables", "Margen contrib.", "Fijos asignados",
                      "Depreciación", "Utilidad operativa", "Margen"], rows))
    cd35 = costo_directo_local(3_500)
    out.append("\nCosto directo por servicio local: " + ", ".join(f"{k} {fmt(v)}" for k, v in cd35.items())
               + f" = **{fmt(sum(cd35.values()))}**\n")
    be = (fijos+dep)/(3_500-sum(cd35.values()))
    out.append(f"Punto de equilibrio a $3,500 sin IVA: {be:.1f} servicios/mes por unidad.\n")
    be_iva = (fijos+dep)/(3_500/1.16-sum(costo_directo_local(3_500/1.16).values()))
    out.append(f"Punto de equilibrio si $3,500 INCLUYE IVA (ingreso propio {fmt(3500/1.16)}): {be_iva:.1f} servicios/mes.\n")

    # costo total por servicio y precios por margen
    out.append("\n## E. Costo total por servicio local y precio por margen objetivo\n")
    rows = []
    for n in [10, 20, 26]:
        ct = sum(cd35.values()) + (fijos+dep)/n
        rows.append([n, fmt(ct)] + [fmt(ct/(1-m)) for m in (0.30, 0.40, 0.50)])
    out.append(tabla(["Serv/mes", "Costo total/servicio", "Precio m30%", "Precio m40%", "Precio m50%"], rows))

    # ---------- F. Inversión 5 años ----------
    out.append("\n## F. Inversión a 5 años construida desde servicios LOCALES (contado)\n")
    out.append("Flujo operativo = margen de contribución − fijos de la unidad − generales asignados (sin depreciación, que no es salida de efectivo). "
               "Año 0: −compra −GPS. Año 5: + reventa. Sin impuestos ni sueldo del dueño.\n\n")
    rows = []
    for n, p in [(10,3_500),(20,3_100),(20,3_500),(20,4_000),(26,3_500),(26,4_000)]:
        cd = sum(costo_directo_local(p).values())
        anual = 12*(n*(p-cd) - fijos)
        for rev in [150_000, 250_000, 350_000]:
            flujos = [-U['compra']-U['gps_ini']] + [anual]*4 + [anual+rev]
            acum = 0; payback = None
            for t, c in enumerate(flujos):
                prev = acum; acum += c
                if t > 0 and payback is None and acum >= 0:
                    payback = t-1 + (-prev)/c
            tir = irr(flujos, hi=3.0)
            ganancia = sum(flujos)
            km5 = n*LOCAL['km']*12*5
            rows.append([n, fmt(p), fmt(rev), fmt(anual), fmt(anual - (U['compra']-rev)/5),
                         ('%.1f' % payback) if payback else '>5', f"{tir*100:.0f}%",
                         f"{ganancia/U['compra']*100:.0f}%", fmt(km5)])
    out.append(tabla(["Serv/mes","Precio s/IVA","Reventa","Flujo operativo/año","Utilidad operativa/año",
                      "Recuperación (años)","TIR anual","Ganancia neta acumulada / inversión","km en 5 años"], rows))

    out.append("\n## G. Financiamiento HIPOTÉTICO (no es tu crédito)\n")
    eng = 0.20*U['compra']; fin = U['compra']-eng
    for tasa in [0.14, 0.18, 0.22]:
        for n in [36, 48, 60]:
            m = pmt(tasa/12, n, fin*1.0)
            intereses = m*n - fin
            out.append(f"- Enganche 20% ({fmt(eng)}), {tasa*100:.0f}% anual, {n} meses: mensualidad {fmt(m)} (+IVA de intereses si aplica), intereses totales {fmt(intereses)}\n")

    out.append("\n## H. Rutas foráneas desde Metepec/Toluca (3.5 t, exclusivo, regreso vacío)\n")
    # km ida = estimación aproximada; casetas ida clase camión 2 ejes = estimación gruesa a verificar en SICT 'Traza tu ruta'
    RUTAS = [("CDMX (zona poniente/centro)", 65, 250), ("Querétaro", 215, 600), ("León", 390, 1_300),
             ("Guadalajara", 540, 1_700), ("Veracruz", 470, 1_500), ("Mérida", 1_380, 3_500), ("Cancún", 1_680, 4_200)]
    fijo_dia = (fu_tot + gen + dep)/26
    rows = []
    for nombre, ida, cas in RUTAS:
        km_tot = 2*ida + 20                 # base->origen 10 km, destino->base = ida, +10 ajuste
        h_man = 4 + 3                        # carga + descarga
        h_conduc = km_tot/55
        dias = max(1, math.ceil((h_man + h_conduc)/11))
        if ida <= 250: dias = 1               # jornada larga (salida temprana), sin hospedaje
        noches = dias - 1
        # [SUP] pago foráneo por día: chofer 600, ayudante 400; viaje corto a CDMX: pago local + 300 extra
        personal = dias*(600 + 2*400) if ida > 80 else 300 + 2*200 + 300
        # [SUP] comidas 250/persona/día en viaje de 1 día, 450 si pernocta; hotel 900/noche (1 cuarto)
        viaticos = (3*250 if dias == 1 else dias*3*450) + noches*900
        vehiculo = km_tot*vk_tot
        casetas = 2*cas
        directo = vehiculo + casetas + personal + viaticos + LOCAL['materiales']
        ocup = dias*fijo_dia
        total = directo + ocup
        rows.append([nombre, fmt(ida), fmt(km_tot), dias, fmt(vehiculo), fmt(casetas), fmt(personal),
                     fmt(viaticos), fmt(ocup), fmt(total), f"{total/km_tot:.1f}", fmt(total/0.65), fmt(total/0.60)])
    out.append(tabla(["Destino","km ida","km operativos","Días unidad","Vehículo","Casetas i/v","Personal",
                      "Viáticos","Fijo+dep por días","Costo total","Costo $/km oper.","Precio m35%","Precio m40%"], rows))
    out.append(f"\nCosto fijo + depreciación por día de ocupación (÷26 días): {fmt(fijo_dia)}\n")
    print("".join(out))
