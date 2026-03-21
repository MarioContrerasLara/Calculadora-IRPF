#!/usr/bin/env python3
"""
Independent mathematical verification of IRPF 2025 calculator logic.
Validates tax brackets, SS calculations, mínimo personal, reductions,
and especie exemption splitting against known legal values.

Run:  python3 tests/test_irpf.py
"""

import sys
import math

# ═══════════════════════════════════════════════════════════════
#  CONSTANTS (mirrors js/app.js)
# ═══════════════════════════════════════════════════════════════

ESCALA_ESTATAL = [
    (12_450, 9.5),
    (20_200, 12.0),
    (35_200, 15.0),
    (60_000, 18.5),
    (300_000, 22.5),
    (float('inf'), 24.5),
]

ESCALA_ANDALUCIA = [
    (13_000, 9.5),
    (21_100, 12.0),
    (35_200, 15.0),
    (60_000, 18.5),
    (float('inf'), 22.5),
]

SS_WORKER = {'cc': 4.70, 'fp': 0.10, 'mei': 0.13}
SS_DESEMP_W = {'indefinido': 1.55, 'temporal': 1.60}

SS_EMPLOYER = {'cc': 23.60, 'at': 2.00, 'fogasa': 0.20, 'fp': 0.60, 'mei': 0.67}
SS_DESEMP_E = {'indefinido': 5.50, 'temporal': 6.70}

BASES_MAX = 4909.50
BASES_MIN = {1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20}

MIN_EST = {
    'contribuyente': 5550, 'mayor65': 1150, 'mayor75': 1400,
    'disc33': 3000, 'disc65': 9000,
    'hijos': [2400, 2700, 4000, 4500],
    'asc65': 1150, 'asc75': 1400,
}
MIN_AUT = {
    'contribuyente': 5790, 'mayor65': 1200, 'mayor75': 1460,
    'disc33': 3130, 'disc65': 9390,
    'hijos': [2510, 2820, 4170, 4700],
    'asc65': 1200, 'asc75': 1460,
}

OTROS_GASTOS = 2000
SMI_ANUAL = 16_576

ESPECIE = {
    'seguro_medico_persona': 500,
    'seguro_medico_discapacidad': 1500,
    'ticket_rest_max_dia': 11,            # informational only; employee controls usage
    'transporte_exento': 1500,
}


# ═══════════════════════════════════════════════════════════════
#  PURE FUNCTIONS (mirrors js/app.js)
# ═══════════════════════════════════════════════════════════════

def reduccion_rendimientos(rend_neto):
    if rend_neto <= 14_852:
        return 7302
    if rend_neto <= 17_673.52:
        return max(7302 - 2.59 * (rend_neto - 14_852), 0)
    return 0


def aplicar_escala(base, escala):
    rest = max(base, 0)
    total = 0
    for i, (hasta, tipo) in enumerate(escala):
        lim_inf = 0 if i == 0 else escala[i - 1][0]
        ancho = float('inf') if hasta == float('inf') else hasta - lim_inf
        bt = min(rest, ancho)
        total += bt * tipo / 100
        rest -= bt
        if rest <= 0:
            break
    return total


def calcular_minimo(edad, discapacidad, num_hijos, num_asc, M):
    m = M['contribuyente']
    if edad in ('mayor65', 'mayor75'):
        m += M['mayor65']
    if edad == 'mayor75':
        m += M['mayor75']
    if discapacidad == '33':
        m += M['disc33']
    elif discapacidad == '65':
        m += M['disc65']
    hijos_arr = M['hijos']
    for i in range(num_hijos):
        m += hijos_arr[min(i, len(hijos_arr) - 1)]
    for _ in range(num_asc):
        m += M['asc65']
    return m


def split_exempt(ad, fl, limit):
    total = ad + fl
    if total <= 0:
        return (0, 0, ad, fl)
    exento = min(total, limit)
    ratio_ad = ad / total
    ex_ad = min(ad, exento * ratio_ad)
    ex_fl = min(fl, exento - ex_ad)
    return (ex_ad, ex_fl, ad - ex_ad, fl - ex_fl)


def full_calc(bruto, contrato='indefinido', grupo=4, edad='menor65',
              discapacidad='no', num_hijos=0, num_asc=0,
              seg_medico_ad=0, seg_medico_fl=0, seg_medico_benef=1,
              ticket_rest_ad=0, ticket_rest_fl=0,
              transporte_ad=0, transporte_fl=0,
              custom_ad=0, custom_fl=0):
    """Full IRPF + SS calculation. Returns dict with all key values."""

    # Transport cap
    raw_transport = transporte_ad + transporte_fl
    if raw_transport > ESPECIE['transporte_exento']:
        ratio = ESPECIE['transporte_exento'] / raw_transport
        transporte_ad *= ratio
        transporte_fl *= ratio

    # Exempt limits
    lim_seg = seg_medico_benef * (
        ESPECIE['seguro_medico_discapacidad'] if discapacidad != 'no'
        else ESPECIE['seguro_medico_persona']
    )
    lim_ticket = ticket_rest_ad + ticket_rest_fl  # employee controls usage → fully exempt
    lim_transp = ESPECIE['transporte_exento']

    sm = split_exempt(seg_medico_ad, seg_medico_fl, lim_seg)
    tr = split_exempt(ticket_rest_ad, ticket_rest_fl, lim_ticket)
    tp = split_exempt(transporte_ad, transporte_fl, lim_transp)

    gravada_ad = sm[2] + tr[2] + tp[2] + custom_ad
    exenta_ad = sm[0] + tr[0] + tp[0]
    total_ad = seg_medico_ad + ticket_rest_ad + transporte_ad + custom_ad

    gravada_fl = sm[3] + tr[3] + tp[3] + custom_fl
    exenta_fl = sm[1] + tr[1] + tp[1]
    total_fl = seg_medico_fl + ticket_rest_fl + transporte_fl + custom_fl

    # SS Worker
    base_min = BASES_MIN.get(grupo, BASES_MIN[4])
    base_ss = min(max(bruto / 12, base_min), BASES_MAX)
    desemp_w = SS_DESEMP_W[contrato]
    total_w_pct = SS_WORKER['cc'] + desemp_w + SS_WORKER['fp'] + SS_WORKER['mei']
    total_ss = base_ss * total_w_pct / 100 * 12

    # IRPF
    rend_int = bruto + gravada_ad - exenta_fl
    gastos = total_ss + OTROS_GASTOS
    rend_neto = max(rend_int - gastos, 0)
    reduccion = reduccion_rendimientos(rend_neto)
    base_liq = max(rend_neto - reduccion, 0)

    min_est = calcular_minimo(edad, discapacidad, num_hijos, num_asc, MIN_EST)
    min_aut = calcular_minimo(edad, discapacidad, num_hijos, num_asc, MIN_AUT)

    cuota_est = max(aplicar_escala(base_liq, ESCALA_ESTATAL) - aplicar_escala(min_est, ESCALA_ESTATAL), 0)
    cuota_aut = max(aplicar_escala(base_liq, ESCALA_ANDALUCIA) - aplicar_escala(min_aut, ESCALA_ANDALUCIA), 0)
    cuota_irpf = cuota_est + cuota_aut

    if bruto <= SMI_ANUAL:
        cuota_est = cuota_aut = cuota_irpf = 0

    # Tax savings from flexible
    ahorro_flex = 0
    if exenta_fl > 0 and bruto > SMI_ANUAL:
        ri_sin = bruto + gravada_ad
        rn_sin = max(ri_sin - gastos, 0)
        red_sin = reduccion_rendimientos(rn_sin)
        bl_sin = max(rn_sin - red_sin, 0)
        ce_sin = max(aplicar_escala(bl_sin, ESCALA_ESTATAL) - aplicar_escala(min_est, ESCALA_ESTATAL), 0)
        ca_sin = max(aplicar_escala(bl_sin, ESCALA_ANDALUCIA) - aplicar_escala(min_aut, ESCALA_ANDALUCIA), 0)
        ahorro_flex = (ce_sin + ca_sin) - cuota_irpf

    neto = bruto - total_fl - total_ss - cuota_irpf

    # SS Employer
    desemp_e = SS_DESEMP_E[contrato]
    total_e_pct = (SS_EMPLOYER['cc'] + desemp_e + SS_EMPLOYER['fogasa']
                   + SS_EMPLOYER['fp'] + SS_EMPLOYER['mei'] + SS_EMPLOYER['at'])
    total_emp = base_ss * total_e_pct / 100 * 12
    coste_total = bruto + total_emp + total_ad

    return {
        'base_ss': base_ss,
        'total_ss': total_ss,
        'rend_int': rend_int,
        'rend_neto': rend_neto,
        'reduccion': reduccion,
        'base_liq': base_liq,
        'min_est': min_est,
        'min_aut': min_aut,
        'cuota_est': cuota_est,
        'cuota_aut': cuota_aut,
        'cuota_irpf': cuota_irpf,
        'neto': neto,
        'total_emp': total_emp,
        'coste_total': coste_total,
        'exenta_ad': exenta_ad,
        'exenta_fl': exenta_fl,
        'gravada_ad': gravada_ad,
        'gravada_fl': gravada_fl,
        'total_ad': total_ad,
        'total_fl': total_fl,
        'ahorro_flex': ahorro_flex,
        'total_emp': total_emp,
        'coste_total': coste_total,
    }


# ═══════════════════════════════════════════════════════════════
#  TEST FRAMEWORK
# ═══════════════════════════════════════════════════════════════

_pass = 0
_fail = 0
_current_group = ''


def group(name):
    global _current_group
    _current_group = name
    print(f'\n\033[1m{name}\033[0m')


def assert_close(desc, actual, expected, tol=0.01):
    global _pass, _fail
    ok = abs(actual - expected) <= tol
    if ok:
        _pass += 1
        print(f'  \033[32m✓\033[0m {desc}')
    else:
        _fail += 1
        print(f'  \033[31m✗\033[0m {desc}  (expected {expected}, got {actual}, diff {abs(actual-expected):.4f})')


def assert_eq(desc, actual, expected):
    global _pass, _fail
    if actual == expected:
        _pass += 1
        print(f'  \033[32m✓\033[0m {desc}')
    else:
        _fail += 1
        print(f'  \033[31m✗\033[0m {desc}  (expected {expected!r}, got {actual!r})')


def assert_true(desc, condition):
    global _pass, _fail
    if condition:
        _pass += 1
        print(f'  \033[32m✓\033[0m {desc}')
    else:
        _fail += 1
        print(f'  \033[31m✗\033[0m {desc}  (was False)')


# ═══════════════════════════════════════════════════════════════
#  TESTS
# ═══════════════════════════════════════════════════════════════

print('='*60)
print(' IRPF 2025 Calculator — Python Verification Tests')
print('='*60)


# ── 1. reduccionRendimientos ──

group('reduccionRendimientos')

assert_close('rendNeto=0 → 7302', reduccion_rendimientos(0), 7302)
assert_close('rendNeto=14852 → 7302', reduccion_rendimientos(14852), 7302)
assert_close('rendNeto=15000', reduccion_rendimientos(15000), 7302 - 2.59 * (15000 - 14852))
assert_close('rendNeto=16000', reduccion_rendimientos(16000), 7302 - 2.59 * (16000 - 14852))
assert_close('rendNeto=17673.52 → ~0', reduccion_rendimientos(17673.52), max(7302 - 2.59 * 2821.52, 0))
assert_close('rendNeto=17674 → 0', reduccion_rendimientos(17674), 0)
assert_close('rendNeto=50000 → 0', reduccion_rendimientos(50000), 0)


# ── 2. aplicarEscala — Estatal official cumulative quotas ──

group('aplicarEscala — Estatal (cuotas acumuladas oficiales)')

assert_close('Base 0 → 0', aplicar_escala(0, ESCALA_ESTATAL), 0)
assert_close('Base 12450 → 1182.75', aplicar_escala(12450, ESCALA_ESTATAL), 1182.75)
assert_close('Base 20200 → 2112.75', aplicar_escala(20200, ESCALA_ESTATAL), 2112.75)
assert_close('Base 35200 → 4362.75', aplicar_escala(35200, ESCALA_ESTATAL), 4362.75)
assert_close('Base 60000 → 8950.75', aplicar_escala(60000, ESCALA_ESTATAL), 8950.75)
assert_close('Base 300000 → 62950.75', aplicar_escala(300000, ESCALA_ESTATAL), 62950.75)

# intermediate value
expected_25k = 12450 * 0.095 + (20200 - 12450) * 0.12 + (25000 - 20200) * 0.15
assert_close('Base 25000', aplicar_escala(25000, ESCALA_ESTATAL), expected_25k)

# all 6 brackets (400k)
expected_400k = (12450 * 0.095 + (20200 - 12450) * 0.12 + (35200 - 20200) * 0.15
    + (60000 - 35200) * 0.185 + (300000 - 60000) * 0.225 + (400000 - 300000) * 0.245)
assert_close('Base 400000', aplicar_escala(400000, ESCALA_ESTATAL), expected_400k)

# negative base
assert_close('Negative base → 0', aplicar_escala(-5000, ESCALA_ESTATAL), 0)


group('aplicarEscala — Andalucía')

assert_close('Base 0 → 0', aplicar_escala(0, ESCALA_ANDALUCIA), 0)
assert_close('Base 13000 → 1235', aplicar_escala(13000, ESCALA_ANDALUCIA), 1235)
expected_21100 = 13000 * 0.095 + (21100 - 13000) * 0.12
assert_close('Base 21100', aplicar_escala(21100, ESCALA_ANDALUCIA), expected_21100)
expected_35200_a = 13000 * 0.095 + (21100 - 13000) * 0.12 + (35200 - 21100) * 0.15
assert_close('Base 35200', aplicar_escala(35200, ESCALA_ANDALUCIA), expected_35200_a)


# ── 3. calcularMinimo ──

group('calcularMinimo')

assert_close('Base: 5550 est', calcular_minimo('menor65', 'no', 0, 0, MIN_EST), 5550)
assert_close('Base: 5790 aut', calcular_minimo('menor65', 'no', 0, 0, MIN_AUT), 5790)
assert_close('Mayor65 est: 6700', calcular_minimo('mayor65', 'no', 0, 0, MIN_EST), 6700)
assert_close('Mayor75 est: 8100', calcular_minimo('mayor75', 'no', 0, 0, MIN_EST), 8100)
assert_close('Disc33 est: 8550', calcular_minimo('menor65', '33', 0, 0, MIN_EST), 8550)
assert_close('Disc65 est: 14550', calcular_minimo('menor65', '65', 0, 0, MIN_EST), 14550)
assert_close('1 hijo est: 7950', calcular_minimo('menor65', 'no', 1, 0, MIN_EST), 7950)
assert_close('2 hijos est: 10650', calcular_minimo('menor65', 'no', 2, 0, MIN_EST), 10650)
assert_close('3 hijos est: 14650', calcular_minimo('menor65', 'no', 3, 0, MIN_EST), 14650)
assert_close('4 hijos est: 19150', calcular_minimo('menor65', 'no', 4, 0, MIN_EST), 19150)
assert_close('1 asc est: 6700', calcular_minimo('menor65', 'no', 0, 1, MIN_EST), 6700)
assert_close('2 asc est: 7850', calcular_minimo('menor65', 'no', 0, 2, MIN_EST), 7850)

# Combined
exp_est = 5550 + 1150 + 1400 + 3000 + 2400 + 2700 + 1150  # 17350
exp_aut = 5790 + 1200 + 1460 + 3130 + 2510 + 2820 + 1200  # 18110
assert_close('Combined est: 17350', calcular_minimo('mayor75', '33', 2, 1, MIN_EST), exp_est)
assert_close('Combined aut: 18110', calcular_minimo('mayor75', '33', 2, 1, MIN_AUT), exp_aut)


# ── 4. splitExempt ──

group('splitExempt')

# All zero
r = split_exempt(0, 0, 500)
assert_close('0+0: exAd=0', r[0], 0)
assert_close('0+0: exFl=0', r[1], 0)

# Under limit
r = split_exempt(400, 0, 500)
assert_close('400+0 lim 500: exAd=400', r[0], 400)
assert_close('400+0 lim 500: grAd=0', r[2], 0)

# Over limit (single)
r = split_exempt(800, 0, 500)
assert_close('800+0 lim 500: exAd=500', r[0], 500)
assert_close('800+0 lim 500: grAd=300', r[2], 300)

# Mixed under limit
r = split_exempt(200, 100, 500)
assert_close('200+100 lim 500: exAd=200', r[0], 200)
assert_close('200+100 lim 500: exFl=100', r[1], 100)

# Mixed over limit (proportional)
r = split_exempt(600, 400, 500)
assert_close('600+400 lim 500: exAd=300', r[0], 300)
assert_close('600+400 lim 500: exFl=200', r[1], 200)
assert_close('600+400 lim 500: grAd=300', r[2], 300)
assert_close('600+400 lim 500: grFl=200', r[3], 200)

# Ticket restaurante: 2052+348, limit 2420 (all exempt)
r = split_exempt(2052, 348, 2420)
assert_close('TR 2052+348 lim 2420: exAd=2052', r[0], 2052)
assert_close('TR 2052+348 lim 2420: exFl=348', r[1], 348)

# Seguro médico: 979.32+0, limit 500
r = split_exempt(979.32, 0, 500)
assert_close('SM 979.32+0 lim 500: exAd=500', r[0], 500)
assert_close('SM: grAd=479.32', r[2], 479.32)

# Transport: 0+1636.32, limit 1500
r = split_exempt(0, 1636.32, 1500)
assert_close('TP 0+1636.32 lim 1500: exFl=1500', r[1], 1500)
assert_close('TP: grFl=136.32', r[3], 136.32)

# Zero limit
r = split_exempt(100, 200, 0)
assert_close('lim 0: exAd=0', r[0], 0)
assert_close('lim 0: exFl=0', r[1], 0)
assert_close('lim 0: grAd=100', r[2], 100)
assert_close('lim 0: grFl=200', r[3], 200)


# ── 5. SS Worker calculation ──

group('SS Worker calculation')

# 30k bruto, grupo 4, indefinido
base_ss = min(max(30000 / 12, BASES_MIN[4]), BASES_MAX)
assert_close('Base SS 30k grupo 4 = 2500', base_ss, 2500)

total_w_pct = SS_WORKER['cc'] + SS_DESEMP_W['indefinido'] + SS_WORKER['fp'] + SS_WORKER['mei']
assert_close('Total worker % indef = 6.48', total_w_pct, 6.48)

ss_anual = base_ss * total_w_pct / 100 * 12
assert_close('SS anual 30k = 1944', ss_anual, 1944)

# 100k bruto → base capped
base_100 = min(max(100000 / 12, BASES_MIN[4]), BASES_MAX)
assert_close('Base SS capped for 100k', base_100, BASES_MAX)

# 10k bruto, grupo 1 → base at minimum
base_10 = min(max(10000 / 12, BASES_MIN[1]), BASES_MAX)
assert_close('Base SS floored at grupo 1 for 10k', base_10, BASES_MIN[1])


# ── 6. Transport cap ──

group('Transport annual cap')

# Under cap -> no change
ad, fl = 600, 600
assert_true('1200 < 1500 → no cap', ad + fl <= 1500)

# Over cap -> proportional
ad, fl = 1200, 600
total = ad + fl  # 1800
ratio = 1500 / total
ad_c, fl_c = ad * ratio, fl * ratio
assert_close('Capped ad = 1000', ad_c, 1000)
assert_close('Capped fl = 500', fl_c, 500)
assert_close('Capped total = 1500', ad_c + fl_c, 1500)


# ── 7. Full integration: 30k ──

group('Full integration — 30k bruto')

res = full_calc(30000)
assert_close('Base SS = 2500', res['base_ss'], 2500)
assert_close('SS anual = 1944', res['total_ss'], 1944)
assert_close('Rend. íntegro = 30000', res['rend_int'], 30000)
assert_close('Rend. neto = 26056', res['rend_neto'], 26056)
assert_close('Reducción = 0', res['reduccion'], 0)
assert_close('Base liquidable = 26056', res['base_liq'], 26056)
assert_close('Mín. estatal = 5550', res['min_est'], 5550)
assert_close('Mín. autonómico = 5790', res['min_aut'], 5790)
assert_true('Cuota IRPF > 0', res['cuota_irpf'] > 0)
assert_true('Cuota IRPF < 10000', res['cuota_irpf'] < 10_000)
assert_true('Neto > 20000', res['neto'] > 20_000)
assert_true('Neto < 30000', res['neto'] < 30_000)

# Exact cuota estatal check
cuota_est = max(aplicar_escala(26056, ESCALA_ESTATAL) - aplicar_escala(5550, ESCALA_ESTATAL), 0)
cuota_aut = max(aplicar_escala(26056, ESCALA_ANDALUCIA) - aplicar_escala(5790, ESCALA_ANDALUCIA), 0)
assert_close('Cuota estatal matches', res['cuota_est'], cuota_est)
assert_close('Cuota autonómica matches', res['cuota_aut'], cuota_aut)
neto = 30000 - 1944 - cuota_est - cuota_aut
assert_close('Neto matches', res['neto'], neto)


# ── 8. Full integration: SMI → 0% IRPF ──

group('Full integration — SMI (16576)')

res = full_calc(16576)
assert_close('Cuota IRPF = 0 (SMI)', res['cuota_irpf'], 0)
assert_close('Cuota est = 0', res['cuota_est'], 0)
assert_close('Cuota aut = 0', res['cuota_aut'], 0)

base_ss_smi = min(max(16576 / 12, BASES_MIN[4]), BASES_MAX)
ss_smi = base_ss_smi * 6.48 / 100 * 12
assert_close('Neto = bruto - SS', res['neto'], 16576 - ss_smi, 0.1)


# ── 9. Full integration: with especie ──

group('Full integration — 35k with especie')

res = full_calc(
    35000,
    seg_medico_ad=81.61 * 12,   # 979.32
    ticket_rest_ad=171 * 12,    # 2052
    ticket_rest_fl=29 * 12,     # 348
    transporte_fl=136.36 * 12,  # 1636.32 → capped to 1500
)

# Transport gets capped: 1636.32 → 1500 (all flexible)
assert_close('Transport capped total flex ≤ 1500', res['total_fl'], 29 * 12 + 1500, 0.1)
# Actually total_fl = ticket_rest_fl(348) + transporte_fl(capped to 1500) = 1848
assert_close('Total flexible = 348 + 1500 = 1848', res['total_fl'], 1848, 0.1)

# Seg médico: 979.32 ad, lim 500 → exAd=500, grAd=479.32
# Ticket rest: 2052 ad + 348 fl, lim 2420 → all exempt
# Transport: 0 ad + 1500 fl, lim 1500 → all exempt
assert_close('Exenta ad = 500 (seg) + 2052 (ticket) + 0 (transp)', res['exenta_ad'], 2552, 0.1)
assert_close('Exenta fl = 0 (seg) + 348 (ticket) + 1500 (transp)', res['exenta_fl'], 1848, 0.1)

assert_true('Neto > 0', res['neto'] > 0)
assert_true('Coste total > bruto', res['coste_total'] > 35000)


# ── 10. Full integration: high income ──

group('Full integration — 150k high income')

res = full_calc(150000)
assert_close('Base SS = max (capped)', res['base_ss'], BASES_MAX)
assert_true('Cuota IRPF substantial', res['cuota_irpf'] > 30_000)
assert_true('Neto < bruto', res['neto'] < 150_000)
assert_true('Tipo efectivo > 30%', (res['total_ss'] + res['cuota_irpf']) / 150_000 * 100 > 30)


# ── 11. Full integration: temporal contract ──

group('Full integration — Temporal contract')

res_indef = full_calc(30000, contrato='indefinido')
res_temp = full_calc(30000, contrato='temporal')
assert_true('Temporal SS > indefinido SS', res_temp['total_ss'] > res_indef['total_ss'])
assert_true('Temporal neto < indefinido neto', res_temp['neto'] < res_indef['neto'])


# ── 12. Mínimo personal effect on cuota ──

group('Mínimo personal reduces cuota')

res_0 = full_calc(40000, num_hijos=0)
res_2 = full_calc(40000, num_hijos=2)
assert_true('2 hijos → less IRPF', res_2['cuota_irpf'] < res_0['cuota_irpf'])
assert_true('2 hijos → more neto', res_2['neto'] > res_0['neto'])


# ── 13. Discapacidad increases seguro médico limit ──

group('Discapacidad affects seguro médico exemption')

res_no = full_calc(35000, seg_medico_ad=1200, discapacidad='no')
res_33 = full_calc(35000, seg_medico_ad=1200, discapacidad='33')
# no: limit=500 → exenta_ad=500
# 33: limit=1500 → exenta_ad=1200 (all exempt)
assert_close('No disc: exenta_ad in seg medico range', res_no['exenta_ad'], 500)
assert_close('Disc 33: exenta_ad=1200 (all under 1500)', res_33['exenta_ad'], 1200)


# ── 14. Edge cases ──

group('Edge cases')

assert_true('Bruto 0 → neto negative (SS min base applies)', full_calc(0)['neto'] < 0)
assert_close('Bruto 0 → IRPF 0', full_calc(0)['cuota_irpf'], 0)

# Just above SMI
res_above = full_calc(16577)
assert_true('16577 → IRPF may be > 0 or reduced', res_above['cuota_irpf'] >= 0)

# Very low salary (below min base SS)
res_low = full_calc(5000, grupo=1)
assert_close('Low salary: base SS = min grupo 1', res_low['base_ss'], BASES_MIN[1])

# All especie at 0
res_no_esp = full_calc(30000)
assert_close('No especie: total_ad = 0', res_no_esp['total_ad'], 0)
assert_close('No especie: total_fl = 0', res_no_esp['total_fl'], 0)


# ── 15. SS Employer calculation ──

group('SS Employer calculation')

res = full_calc(30000)
base_ss_30 = min(max(30000 / 12, BASES_MIN[4]), BASES_MAX)
total_e_pct = (SS_EMPLOYER['cc'] + SS_DESEMP_E['indefinido'] + SS_EMPLOYER['fogasa']
               + SS_EMPLOYER['fp'] + SS_EMPLOYER['mei'] + SS_EMPLOYER['at'])
assert_close('Employer total % indef = 32.57', total_e_pct, 32.57, 0.01)
exp_emp = base_ss_30 * total_e_pct / 100 * 12
assert_close('Employer SS 30k = ' + str(round(exp_emp, 2)), res['total_emp'], exp_emp)

# Temporal employer
res_t = full_calc(30000, contrato='temporal')
total_e_pct_t = (SS_EMPLOYER['cc'] + SS_DESEMP_E['temporal'] + SS_EMPLOYER['fogasa']
                 + SS_EMPLOYER['fp'] + SS_EMPLOYER['mei'] + SS_EMPLOYER['at'])
exp_emp_t = base_ss_30 * total_e_pct_t / 100 * 12
assert_close('Employer SS temporal > indefinido', res_t['total_emp'], exp_emp_t)
assert_true('Temporal employer > indef employer', res_t['total_emp'] > res['total_emp'])

# High salary: capped base
res_h = full_calc(120000)
exp_emp_h = BASES_MAX * total_e_pct / 100 * 12
assert_close('Employer SS 120k (capped base)', res_h['total_emp'], exp_emp_h)


# ── 16. Accounting identities ──

group('Accounting identities')

for bruto_test in [15000, 25000, 30000, 50000, 80000, 150000]:
    r = full_calc(bruto_test)
    # Identity: neto + SS + IRPF + flexible = bruto
    recon = r['neto'] + r['total_ss'] + r['cuota_irpf'] + r['total_fl']
    assert_close(f'bruto={bruto_test}: neto+SS+IRPF+flex=bruto', recon, bruto_test, 0.02)

# With especie
r = full_calc(35000, seg_medico_ad=500, ticket_rest_fl=2000, transporte_fl=800)
recon = r['neto'] + r['total_ss'] + r['cuota_irpf'] + r['total_fl']
assert_close('With especie: neto+SS+IRPF+flex=bruto', recon, 35000, 0.02)


# ── 17. Iceberg identity (3 zones = coste total) ──

group('Iceberg identity — 3 zones = coste total')

for bruto_test, kwargs in [
    (30000, {}),
    (50000, {'seg_medico_ad': 600, 'ticket_rest_fl': 1800}),
    (40000, {'transporte_ad': 500, 'transporte_fl': 500, 'custom_ad': 300}),
    (80000, {'seg_medico_ad': 1200, 'seg_medico_fl': 300, 'ticket_rest_ad': 2400, 'custom_fl': 100}),
]:
    r = full_calc(bruto_test, **kwargs)
    neto_zone = max(r['neto'], 0)
    employee_zone = r['total_ss'] + r['cuota_irpf'] + r['total_fl']
    employer_zone = r['total_emp'] + r['total_ad']
    total = neto_zone + employee_zone + employer_zone
    assert_close(f'Iceberg bruto={bruto_test}: 3 zones ≈ coste', total, r['coste_total'], 0.1)


# ── 18. Grupos 2 & 3 SS base minimums ──

group('SS base minimums — grupos 2 & 3')

for grupo, base_min in [(2, BASES_MIN[2]), (3, BASES_MIN[3])]:
    r = full_calc(10000, grupo=grupo)
    expected_base = min(max(10000 / 12, base_min), BASES_MAX)
    assert_close(f'Grupo {grupo} 10k: base_ss = {expected_base}', r['base_ss'], expected_base)
    assert_close(f'Grupo {grupo} 10k: base_ss = base_min (floored)', r['base_ss'], base_min)


# ── 19. Multiple beneficiarios seguro médico ──

group('Multiple beneficiarios seguro médico')

# 3 beneficiarios, no discapacidad: limit = 3 × 500 = 1500
r3 = full_calc(35000, seg_medico_ad=1200, seg_medico_benef=3)
assert_close('3 benef: exenta_ad = 1200 (all under 1500)', r3['exenta_ad'], 1200)

r3_over = full_calc(35000, seg_medico_ad=2000, seg_medico_benef=3)
assert_close('3 benef, 2000 ad: exenta_ad = 1500', r3_over['exenta_ad'], 1500)
assert_close('3 benef, 2000 ad: gravada_ad = 500', r3_over['gravada_ad'], 500)

# 2 beneficiarios with discapacidad: limit = 2 × 1500 = 3000
r2d = full_calc(35000, seg_medico_ad=2500, seg_medico_benef=2, discapacidad='33')
assert_close('2 benef disc33: exenta_ad = 2500 (under 3000)', r2d['exenta_ad'], 2500)


# ── 20. Custom especie (always gravada) ──

group('Custom especie (always gravada)')

r_cust = full_calc(30000, custom_ad=1000)
assert_close('Custom ad: gravada_ad = 1000', r_cust['gravada_ad'], 1000)
assert_close('Custom ad: exenta_ad = 0', r_cust['exenta_ad'], 0)
assert_close('Custom ad: total_ad = 1000', r_cust['total_ad'], 1000)
# Custom increases rend_int
assert_close('Custom ad: rend_int = bruto + 1000', r_cust['rend_int'], 31000)

r_cust2 = full_calc(30000, custom_fl=500)
assert_close('Custom fl: gravada_fl = 500', r_cust2['gravada_fl'], 500)
assert_close('Custom fl: exenta_fl = 0', r_cust2['exenta_fl'], 0)
assert_close('Custom fl: total_fl = 500', r_cust2['total_fl'], 500)
# Custom flexible does NOT reduce taxable base (no exemption)
assert_close('Custom fl: rend_int = bruto (no exemption)', r_cust2['rend_int'], 30000)

# Both
r_both = full_calc(30000, custom_ad=800, custom_fl=400)
assert_close('Both custom: gravada_ad = 800', r_both['gravada_ad'], 800)
assert_close('Both custom: gravada_fl = 400', r_both['gravada_fl'], 400)


# ── 21. Flexible tax savings (ahorro fiscal) ──

group('Flexible tax savings')

# With exempt flexible especie, there should be tax savings
r_flex = full_calc(35000, ticket_rest_fl=2000)
assert_true('Ahorro flex > 0 with exempt flexible', r_flex['ahorro_flex'] > 0)

# Without flexible, ahorro = 0
r_no = full_calc(35000)
assert_close('Ahorro flex = 0 without flexible', r_no['ahorro_flex'], 0)

# SMI → no savings even with flexible (IRPF is 0 anyway)
r_smi = full_calc(16576, ticket_rest_fl=500)
assert_close('SMI: ahorro flex = 0', r_smi['ahorro_flex'], 0)

# Custom flexible (not exempt) → no savings
r_cfl = full_calc(35000, custom_fl=1000)
assert_close('Custom flex (gravada): ahorro = 0', r_cfl['ahorro_flex'], 0)

# Savings ≈ marginal_rate × exenta_fl (rough check)
r_sav = full_calc(40000, transporte_fl=1200)
# At 40k the marginal rate is ~30% combined → savings should be roughly 360 but let's just check positive
assert_true('40k + 1200 transport flex: ahorro > 200', r_sav['ahorro_flex'] > 200)
assert_true('40k + 1200 transport flex: ahorro < exenta', r_sav['ahorro_flex'] < r_sav['exenta_fl'])


# ── 22. Edad variants — full integration ──

group('Edad variants in full integration')

r_65 = full_calc(40000, edad='mayor65')
r_75 = full_calc(40000, edad='mayor75')
r_joven = full_calc(40000, edad='menor65')

assert_close('Mayor65: min_est = 6700', r_65['min_est'], 6700)
assert_close('Mayor65: min_aut = 6990', r_65['min_aut'], 6990)
assert_close('Mayor75: min_est = 8100', r_75['min_est'], 8100)
assert_close('Mayor75: min_aut = 8450', r_75['min_aut'], 8450)
assert_true('Mayor65 pays less IRPF than menor65', r_65['cuota_irpf'] < r_joven['cuota_irpf'])
assert_true('Mayor75 pays less IRPF than mayor65', r_75['cuota_irpf'] < r_65['cuota_irpf'])
assert_true('Mayor75 neto > mayor65 neto', r_75['neto'] > r_65['neto'])


# ── 23. Ascendientes in full integration ──

group('Ascendientes in full integration')

r_0a = full_calc(40000, num_asc=0)
r_1a = full_calc(40000, num_asc=1)
r_2a = full_calc(40000, num_asc=2)

assert_close('0 asc: min_est = 5550', r_0a['min_est'], 5550)
assert_close('1 asc: min_est = 6700', r_1a['min_est'], 6700)
assert_close('2 asc: min_est = 7850', r_2a['min_est'], 7850)
assert_true('1 asc pays less IRPF', r_1a['cuota_irpf'] < r_0a['cuota_irpf'])
assert_true('2 asc pays less IRPF', r_2a['cuota_irpf'] < r_1a['cuota_irpf'])


# ── 24. 5+ hijos (reuses 4th bracket) ──

group('5+ hijos')

r_5h = full_calc(60000, num_hijos=5)
# hijos: 2400 + 2700 + 4000 + 4500 + 4500 = 18100
exp_min = 5550 + 2400 + 2700 + 4000 + 4500 + 4500
assert_close('5 hijos min_est = ' + str(exp_min), r_5h['min_est'], exp_min)

r_6h = full_calc(60000, num_hijos=6)
exp_min_6 = exp_min + 4500
assert_close('6 hijos min_est = ' + str(exp_min_6), r_6h['min_est'], exp_min_6)


# ── 25. Bracket boundary values ──

group('Bracket boundaries — exact edges')

# Exactly at first bracket boundary
r_12450 = full_calc(12450 + 2000 + 1944)  # reverse: base_liq should be ~12450
# Just test that the function doesn't crash and produces reasonable output
assert_true('Bracket boundary: neto > 0', full_calc(12450)['neto'] > 0)

# Exactly at estatal bracket edges — verify cumulative tax
for base_liq, expected_tax in [
    (12450, 12450 * 0.095),
    (20200, 12450 * 0.095 + (20200 - 12450) * 0.12),
    (35200, 12450 * 0.095 + (20200 - 12450) * 0.12 + (35200 - 20200) * 0.15),
    (60000, 12450 * 0.095 + (20200 - 12450) * 0.12 + (35200 - 20200) * 0.15 + (60000 - 35200) * 0.185),
]:
    assert_close(f'Estatal bracket edge {base_liq}', aplicar_escala(base_liq, ESCALA_ESTATAL), expected_tax)

# Andalucía bracket edges
for base_liq, expected_tax in [
    (13000, 13000 * 0.095),
    (21100, 13000 * 0.095 + (21100 - 13000) * 0.12),
    (35200, 13000 * 0.095 + (21100 - 13000) * 0.12 + (35200 - 21100) * 0.15),
    (60000, 13000 * 0.095 + (21100 - 13000) * 0.12 + (35200 - 21100) * 0.15 + (60000 - 35200) * 0.185),
]:
    assert_close(f'Andalucía bracket edge {base_liq}', aplicar_escala(base_liq, ESCALA_ANDALUCIA), expected_tax)


# ── 26. Mixed transport ad + fl exceeding cap ──

group('Transport cap — mixed ad + fl')

r_mix = full_calc(35000, transporte_ad=800, transporte_fl=900)
# 800 + 900 = 1700 > 1500 → ratio = 1500/1700
ratio = 1500 / 1700
exp_ad = 800 * ratio
exp_fl = 900 * ratio
assert_close('Mixed transp: total_ad includes capped', r_mix['total_ad'], exp_ad, 0.1)
assert_close('Mixed transp: total_fl includes capped', r_mix['total_fl'], exp_fl, 0.1)
assert_close('Mixed transp: ad + fl = 1500', exp_ad + exp_fl, 1500, 0.01)

# Under cap: no change
r_under = full_calc(35000, transporte_ad=600, transporte_fl=800)
assert_close('Under cap: total_ad = 600', r_under['total_ad'], 600)
assert_close('Under cap: total_fl = 800', r_under['total_fl'], 800)


# ── 27. Especie-only adicional ──

group('Especie — only adicional')

r_ad_only = full_calc(35000, seg_medico_ad=900, ticket_rest_ad=1500)
assert_close('Only ad: total_fl = 0', r_ad_only['total_fl'], 0)
assert_true('Only ad: total_ad > 0', r_ad_only['total_ad'] > 0)
assert_close('Only ad: total_ad = 2400', r_ad_only['total_ad'], 2400)
# Coste = bruto + emp + adicional
assert_close('Only ad: coste_total', r_ad_only['coste_total'],
             35000 + r_ad_only['total_emp'] + 2400, 0.1)


# ── 28. Especie-only flexible ──

group('Especie — only flexible')

r_fl_only = full_calc(35000, seg_medico_fl=400, ticket_rest_fl=1500, transporte_fl=1000)
assert_close('Only fl: total_ad = 0', r_fl_only['total_ad'], 0)
assert_true('Only fl: total_fl > 0', r_fl_only['total_fl'] > 0)
# Flexible reduces taxable base → lower IRPF
r_no_fl = full_calc(35000)
assert_true('Flexible → less IRPF', r_fl_only['cuota_irpf'] < r_no_fl['cuota_irpf'])


# ── 29. Discapacidad 65% full integration ──

group('Discapacidad 65% full integration')

r_d65 = full_calc(40000, discapacidad='65')
assert_close('Disc65: min_est = 14550', r_d65['min_est'], 14550)
assert_close('Disc65: min_aut = 15180', r_d65['min_aut'], 15180)
r_d33 = full_calc(40000, discapacidad='33')
assert_true('Disc65 less IRPF than disc33', r_d65['cuota_irpf'] < r_d33['cuota_irpf'])
assert_true('Disc65 more neto than disc33', r_d65['neto'] > r_d33['neto'])

# Disc65 with seg médico: limit = 1500/person
r_d65_sm = full_calc(40000, discapacidad='65', seg_medico_ad=1400)
assert_close('Disc65 seg med 1400: all exempt', r_d65_sm['exenta_ad'], 1400)


# ── 30. Negative base liquidable → cuota = 0 ──

group('Low income — minimo exceeds base liquidable')

# Low income with lots of minimos → cuota should be 0
r_low = full_calc(18000, num_hijos=4, edad='mayor75', discapacidad='33')
# min_est = 5550+1150+1400+3000+2400+2700+4000+4500 = 24700
exp_min_low = 5550 + 1150 + 1400 + 3000 + 2400 + 2700 + 4000 + 4500
assert_close('Low income high minimo: min_est', r_low['min_est'], exp_min_low)
# At 18k, base_liq is very low → scale(base_liq) < scale(minimo), so cuota = 0
assert_close('Low income: cuota IRPF = 0', r_low['cuota_irpf'], 0)


# ── 31. Very high income Andalucía top bracket ──

group('Very high income — top brackets')

r_500 = full_calc(500000)
assert_close('500k: base_ss = max', r_500['base_ss'], BASES_MAX)
# Should use the top estatal bracket (24.5%) and top Andalucía (22.5%)
assert_true('500k: cuota IRPF > 100k', r_500['cuota_irpf'] > 100_000)
# Effective total type over 40%
tipo = (r_500['total_ss'] + r_500['cuota_irpf']) / 500000 * 100
assert_true('500k: tipo efectivo > 40%', tipo > 40)
# Coste total sanity
assert_true('500k: coste > bruto + emp', r_500['coste_total'] >= 500000 + r_500['total_emp'])


# ── 32. Reducción boundary precision ──

group('Reducción boundary precision')

# Exactly at rend_neto = 14852 → 7302
assert_close('rendNeto=14852 → 7302', reduccion_rendimientos(14852), 7302)
# One cent above → just below 7302
assert_close('rendNeto=14852.01', reduccion_rendimientos(14852.01), 7302 - 2.59 * 0.01, 0.001)
# Right at upper boundary where it reaches 0
upper = 14852 + 7302 / 2.59  # 17673.5135...
assert_close('Upper boundary ≈ 0', reduccion_rendimientos(upper), 0, 0.05)
# One cent above upper → forced to 0
assert_close('Above upper → 0', reduccion_rendimientos(upper + 0.01), 0)


# ── 33. Coste total composition ──

group('Coste total composition')

for bruto_test, kwargs in [
    (30000, {}),
    (35000, {'seg_medico_ad': 600, 'custom_ad': 200}),
    (40000, {'transporte_ad': 800, 'ticket_rest_ad': 1200}),
]:
    r = full_calc(bruto_test, **kwargs)
    exp_coste = bruto_test + r['total_emp'] + r['total_ad']
    assert_close(f'Coste bruto={bruto_test}: bruto + emp + ad', r['coste_total'], exp_coste, 0.02)


# ── 34. Combined complex scenario ──

group('Combined complex scenario')

r_complex = full_calc(
    45000,
    contrato='temporal',
    grupo=2,
    edad='mayor65',
    discapacidad='33',
    num_hijos=3,
    num_asc=1,
    seg_medico_ad=1200,
    seg_medico_fl=300,
    seg_medico_benef=4,
    ticket_rest_ad=2000,
    ticket_rest_fl=400,
    transporte_ad=600,
    transporte_fl=1000,
    custom_ad=500,
    custom_fl=200,
)

# Verify this doesn't crash and has sane values
assert_true('Complex: neto > 0', r_complex['neto'] > 0)
assert_true('Complex: neto < bruto', r_complex['neto'] < 45000)
assert_true('Complex: coste > bruto', r_complex['coste_total'] > 45000)
assert_true('Complex: cuota >= 0', r_complex['cuota_irpf'] >= 0)

# Base SS capped by grupo 2 min
base_2 = min(max(45000 / 12, BASES_MIN[2]), BASES_MAX)
assert_close('Complex: base_ss for grupo 2', r_complex['base_ss'], base_2)

# Transport capped: 600 + 1000 = 1600 > 1500
assert_true('Complex: transport within cap', r_complex['total_ad'] - 500 - 1200 - 2000 < 600 + 1)

# Accounting identity
recon = r_complex['neto'] + r_complex['total_ss'] + r_complex['cuota_irpf'] + r_complex['total_fl']
assert_close('Complex: accounting identity', recon, 45000, 0.1)

# Iceberg identity
neto_z = max(r_complex['neto'], 0)
emp_z = r_complex['total_ss'] + r_complex['cuota_irpf'] + r_complex['total_fl']
emp_er_z = r_complex['total_emp'] + r_complex['total_ad']
assert_close('Complex: iceberg identity', neto_z + emp_z + emp_er_z, r_complex['coste_total'], 0.1)

# Min personal
exp_est = MIN_EST['contribuyente'] + MIN_EST['mayor65'] + MIN_EST['disc33'] + 2400 + 2700 + 4000 + 1150
assert_close('Complex: min_est', r_complex['min_est'], exp_est)


# ── 35. Monotonicity: more bruto → more neto (no especie) ──

group('Monotonicity — more bruto → more neto')

prev_neto = -9999
for b in range(10000, 100001, 5000):
    r = full_calc(b)
    assert_true(f'bruto={b}: neto > prev', r['neto'] > prev_neto)
    prev_neto = r['neto']


# ═══════════════════════════════════════════════════════════════
#  SUMMARY
# ═══════════════════════════════════════════════════════════════

print('\n' + '='*60)
total = _pass + _fail
if _fail == 0:
    print(f'\033[32m  ALL {total} TESTS PASSED ✓\033[0m')
else:
    print(f'\033[31m  {_fail} FAILED\033[0m / {total} total ({_pass} passed)')
print('='*60)

sys.exit(0 if _fail == 0 else 1)
