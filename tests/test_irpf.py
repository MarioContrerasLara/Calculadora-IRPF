#!/usr/bin/env python3
"""
Independent mathematical verification of IRPF 2025 calculator logic.
Validates tax brackets, SS calculations, mínimo personal, reductions,
and especie exemption splitting against known legal values.

Run:  python3 tests/test_irpf.py
"""

import sys
import math
import re

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
#  NEW COMPREHENSIVE TESTS
# ═══════════════════════════════════════════════════════════════

# ──────────────────────────────────────────────────────────────
# A. MEI_BY_YEAR — all official years and values
# ──────────────────────────────────────────────────────────────

MEI_BY_YEAR = {
    2023: {'worker': 0.10, 'employer': 0.50},
    2024: {'worker': 0.12, 'employer': 0.58},
    2025: {'worker': 0.13, 'employer': 0.67},
    2026: {'worker': 0.15, 'employer': 0.75},
    2027: {'worker': 0.17, 'employer': 0.83},
    2028: {'worker': 0.18, 'employer': 0.92},
    2029: {'worker': 0.20, 'employer': 1.00},
}

group('MEI_BY_YEAR — all years and values')

for anio, vals in MEI_BY_YEAR.items():
    assert_close(f'MEI {anio} worker={vals["worker"]}', MEI_BY_YEAR[anio]['worker'], vals['worker'], 0.001)
    assert_close(f'MEI {anio} employer={vals["employer"]}', MEI_BY_YEAR[anio]['employer'], vals['employer'], 0.001)

# Worker + employer combined total should increase each year (DT 43ª RDL 2/2023)
years = sorted(MEI_BY_YEAR.keys())
for i in range(1, len(years)):
    prev = MEI_BY_YEAR[years[i-1]]
    curr = MEI_BY_YEAR[years[i]]
    assert_true(f'MEI total {years[i]} > {years[i-1]}',
                curr['worker'] + curr['employer'] > prev['worker'] + prev['employer'])

# 2029 combined = 1.20%
assert_close('MEI 2029 total = 1.20', MEI_BY_YEAR[2029]['worker'] + MEI_BY_YEAR[2029]['employer'], 1.20, 0.001)


# ──────────────────────────────────────────────────────────────
# B. BASES_BY_YEAR — all years, all groups
# ──────────────────────────────────────────────────────────────

BASES_BY_YEAR = {
    2021: {'max': 4070.10, 'min': {1: 1572.30, 2: 1303.80, 3: 1134.30, 4: 1125.90}},
    2022: {'max': 4139.40, 'min': {1: 1629.30, 2: 1351.20, 3: 1175.40, 4: 1166.70}},
    2023: {'max': 4495.50, 'min': {1: 1759.50, 2: 1459.20, 3: 1269.30, 4: 1260.00}},
    2024: {'max': 4720.50, 'min': {1: 1847.40, 2: 1532.10, 3: 1332.90, 4: 1323.00}},
    2025: {'max': 4909.50, 'min': {1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20}},
    2026: {'max': 5101.20, 'min': {1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20}},
}

group('BASES_BY_YEAR — all years and groups present')

for anio, data in BASES_BY_YEAR.items():
    assert_true(f'{anio} max > 0', data['max'] > 0)
    for g in [1, 2, 3, 4]:
        assert_true(f'{anio} grupo {g} min > 0', data['min'][g] > 0)
        assert_true(f'{anio} grupo {g}: min < max', data['min'][g] < data['max'])

# Groups within a year: group 1 > group 2 > group 3 >= group 4
group('BASES_BY_YEAR — group ordering (g1 ≥ g2 ≥ g3 ≥ g4)')

for anio, data in BASES_BY_YEAR.items():
    m = data['min']
    assert_true(f'{anio}: g1 ≥ g2', m[1] >= m[2])
    assert_true(f'{anio}: g2 ≥ g3', m[2] >= m[3])
    assert_true(f'{anio}: g3 ≥ g4', m[3] >= m[4])

# Max base increases year over year (2021→2026)
group('BASES_BY_YEAR — max increases each year')

BY_years = sorted(BASES_BY_YEAR.keys())
for i in range(1, len(BY_years)):
    assert_true(f'max {BY_years[i]} > max {BY_years[i-1]}',
                BASES_BY_YEAR[BY_years[i]]['max'] > BASES_BY_YEAR[BY_years[i-1]]['max'])


# ──────────────────────────────────────────────────────────────
# C. SOLIDARIDAD_BY_YEAR — all years, rates, monotonicity
# ──────────────────────────────────────────────────────────────

SOLIDARIDAD_BY_YEAR = {
    2025: [0.92, 1.00, 1.17],
    2026: [1.15, 1.25, 1.46],
    2027: [1.38, 1.50, 1.75],
    2028: [1.60, 1.75, 2.04],
    2029: [1.83, 2.00, 2.33],
    2030: [2.06, 2.25, 2.63],
    2031: [2.29, 2.50, 2.92],
    2032: [2.52, 2.75, 3.21],
    2033: [2.75, 3.00, 3.50],
    2034: [2.98, 3.25, 3.79],
    2035: [3.21, 3.50, 4.08],
    2036: [3.44, 3.75, 4.38],
    2037: [3.67, 4.00, 4.67],
    2038: [3.90, 4.25, 4.96],
    2039: [4.13, 4.50, 5.25],
    2040: [4.35, 4.75, 5.54],
    2041: [4.58, 5.00, 5.83],
    2042: [4.81, 5.25, 6.13],
    2043: [5.04, 5.50, 6.42],
    2044: [5.27, 5.75, 6.71],
    2045: [5.50, 6.00, 7.00],
}
SOLIDARIDAD_WORKER_RATIO = 4.70 / 28.30
SOLIDARIDAD_TRAMO_LIMS = [0.10, 0.50, float('inf')]

group('SOLIDARIDAD_BY_YEAR — correct count and boundaries')

assert_eq('21 years defined (2025–2045)', len(SOLIDARIDAD_BY_YEAR), 21)
for anio in range(2025, 2046):
    assert_true(f'{anio} in SOLIDARIDAD_BY_YEAR', anio in SOLIDARIDAD_BY_YEAR)
    tipos = SOLIDARIDAD_BY_YEAR[anio]
    assert_eq(f'{anio} has 3 tramos', len(tipos), 3)
    # T1 < T2 < T3 within each year
    assert_true(f'{anio} T1 < T2', tipos[0] < tipos[1])
    assert_true(f'{anio} T2 < T3', tipos[1] < tipos[2])
    # All rates positive
    assert_true(f'{anio} all rates > 0', all(t > 0 for t in tipos))

# Official exact values at boundary years
group('SOLIDARIDAD_BY_YEAR — official rate values')
assert_close('2025 T1=0.92', SOLIDARIDAD_BY_YEAR[2025][0], 0.92, 0.001)
assert_close('2025 T2=1.00', SOLIDARIDAD_BY_YEAR[2025][1], 1.00, 0.001)
assert_close('2025 T3=1.17', SOLIDARIDAD_BY_YEAR[2025][2], 1.17, 0.001)
assert_close('2045 T1=5.50', SOLIDARIDAD_BY_YEAR[2045][0], 5.50, 0.001)
assert_close('2045 T2=6.00', SOLIDARIDAD_BY_YEAR[2045][1], 6.00, 0.001)
assert_close('2045 T3=7.00', SOLIDARIDAD_BY_YEAR[2045][2], 7.00, 0.001)
assert_close('2033 T1=2.75', SOLIDARIDAD_BY_YEAR[2033][0], 2.75, 0.001)

# Rates increase each year (phase-in)
group('SOLIDARIDAD_BY_YEAR — rates increase each year')

sol_years = sorted(SOLIDARIDAD_BY_YEAR.keys())
for i in range(1, len(sol_years)):
    for t in range(3):
        assert_true(f'T{t+1}: {sol_years[i]} > {sol_years[i-1]}',
                    SOLIDARIDAD_BY_YEAR[sol_years[i]][t] > SOLIDARIDAD_BY_YEAR[sol_years[i-1]][t])


# ──────────────────────────────────────────────────────────────
# D. calc_solidaridad — pure function tests
# ──────────────────────────────────────────────────────────────

def calc_solidaridad(bruto_anual, max_base_anual, anio):
    exceso = max(bruto_anual - max_base_anual, 0)
    if exceso <= 0:
        return {'worker': 0, 'employer': 0, 'tramos': []}
    tipos = SOLIDARIDAD_BY_YEAR.get(anio)
    if not tipos:
        return {'worker': 0, 'employer': 0, 'tramos': []}

    remaining = exceso
    worker_total = 0
    employer_total = 0
    tramos = []

    for i, lim_sup in enumerate(SOLIDARIDAD_TRAMO_LIMS):
        prev_lim = 0 if i == 0 else max_base_anual * SOLIDARIDAD_TRAMO_LIMS[i-1]
        lim_sup_abs = float('inf') if lim_sup == float('inf') else max_base_anual * lim_sup
        tramo_w = float('inf') if lim_sup_abs == float('inf') else lim_sup_abs - prev_lim
        base = remaining if tramo_w == float('inf') else min(remaining, tramo_w)
        if base <= 0:
            continue
        tipo_total = tipos[i]
        tipo_w = tipo_total * SOLIDARIDAD_WORKER_RATIO
        tipo_e = tipo_total * (1 - SOLIDARIDAD_WORKER_RATIO)
        cuota_w = base * tipo_w / 100
        cuota_e = base * tipo_e / 100
        worker_total += cuota_w
        employer_total += cuota_e
        remaining -= base
        tramos.append({'base': base, 'tipoTotal': tipo_total, 'tipoW': tipo_w,
                        'tipoE': tipo_e, 'cuotaW': cuota_w, 'cuotaE': cuota_e})

    return {'worker': worker_total, 'employer': employer_total, 'tramos': tramos}


group('calcSolidaridad — no exceso')

max_base_2026 = 5101.20 * 12  # 61214.40
# Exactly at max base → no solidaridad
s = calc_solidaridad(max_base_2026, max_base_2026, 2026)
assert_close('At max base: worker=0', s['worker'], 0)
assert_close('At max base: employer=0', s['employer'], 0)
assert_eq('At max base: 0 tramos', len(s['tramos']), 0)

# Below max base
s = calc_solidaridad(30000, max_base_2026, 2026)
assert_close('Below max base: worker=0', s['worker'], 0)

# Unknown year
s = calc_solidaridad(100000, max_base_2026, 2020)
assert_close('Unknown year: worker=0', s['worker'], 0)
assert_eq('Unknown year: 0 tramos', len(s['tramos']), 0)

group('calcSolidaridad — only T1 (small exceso)')

# T1 covers 0–10% of max_base_anual = 0–6121.44
exceso = max_base_2026 * 0.05  # 3060.72 — entirely in T1
s = calc_solidaridad(max_base_2026 + exceso, max_base_2026, 2026)
assert_eq('Only T1: 1 tramo', len(s['tramos']), 1)
# 2026 T1 = 1.15% total
tipo_total = 1.15
tipo_w_exp = tipo_total * SOLIDARIDAD_WORKER_RATIO
cuota_w_exp = exceso * tipo_w_exp / 100
assert_close('T1 only: cuotaWorker', s['worker'], cuota_w_exp, 0.001)
# Worker + employer = total
assert_close('T1: worker+employer = exceso × tipo/100', s['worker'] + s['employer'], exceso * tipo_total / 100, 0.001)

group('calcSolidaridad — T1 and T2')

# Exceso spanning T1 and T2: 15% of max (10% in T1, 5% in T2)
exceso_t12 = max_base_2026 * 0.15
s = calc_solidaridad(max_base_2026 + exceso_t12, max_base_2026, 2026)
assert_eq('T1+T2: 2 tramos', len(s['tramos']), 2)
t1_base = max_base_2026 * 0.10
t2_base = max_base_2026 * 0.05
exp_worker = (t1_base * 1.15 + t2_base * 1.25) * SOLIDARIDAD_WORKER_RATIO / 100
assert_close('T1+T2: worker cuota', s['worker'], exp_worker, 0.01)

group('calcSolidaridad — all 3 tramos')

# Exceso = 60% of max → T1 (10%), T2 (40%), T3 (10%)
exceso_all = max_base_2026 * 0.60
s = calc_solidaridad(max_base_2026 + exceso_all, max_base_2026, 2026)
assert_eq('All tramos: 3 tramos', len(s['tramos']), 3)
t1b = max_base_2026 * 0.10
t2b = max_base_2026 * 0.40
t3b = max_base_2026 * 0.10
tipos = SOLIDARIDAD_BY_YEAR[2026]  # [1.15, 1.25, 1.46]
exp_total = (t1b * tipos[0] + t2b * tipos[1] + t3b * tipos[2]) / 100
assert_close('All tramos: worker+emp', s['worker'] + s['employer'], exp_total, 0.01)

group('calcSolidaridad — worker/employer split ratio')

# Worker ratio = 4.70/28.30 for every tramo
s = calc_solidaridad(max_base_2026 * 2, max_base_2026, 2026)
assert_true('3 tramos present', len(s['tramos']) == 3)
total = s['worker'] + s['employer']
if total > 0:
    actual_ratio = s['worker'] / total
    assert_close('Worker ratio = 4.70/28.30', actual_ratio, SOLIDARIDAD_WORKER_RATIO, 0.0001)

group('calcSolidaridad — all years produce correct T1 for same exceso')

exceso_fixed = 5000.0
for anio in range(2025, 2046):
    max_b = 4909.50 * 12  # use 2025 base for isolation
    s = calc_solidaridad(max_b + exceso_fixed, max_b, anio)
    # T1 entirely covers 5000 (since 10% of ~58914 = 5891 > 5000)
    exp_total = exceso_fixed * SOLIDARIDAD_BY_YEAR[anio][0] / 100
    assert_close(f'{anio}: T1 fixed exceso worker+emp', s['worker'] + s['employer'], exp_total, 0.01)


# ──────────────────────────────────────────────────────────────
# E. Per-month SS base with bonus (brutoMensual + bonusPorMes logic)
# ──────────────────────────────────────────────────────────────

def calc_ss_base_with_bonus(bruto, bonus_por_mes, base_min, base_max):
    """Per-month SS base calculation matching app.js logic."""
    bruto_mensual = bruto / 12
    total = 0
    for m in range(1, 13):
        bruto_mes = bruto_mensual + bonus_por_mes.get(m, 0)
        base_mes = min(max(bruto_mes, base_min), base_max)
        total += base_mes
    return total, total / 12  # (anual, promedio_mensual)


group('Per-month SS base — no bonus')

base_min = BASES_MIN[4]  # 1381.20
base_max = BASES_MAX     # 4909.50

# At 30k, monthly = 2500 → base_mes = 2500 for all months
total, avg = calc_ss_base_with_bonus(30000, {}, base_min, base_max)
assert_close('30k, no bonus: total anual = 2500×12', total, 2500 * 12)
assert_close('30k, no bonus: promedio = 2500', avg, 2500)

# Very low salary → floored at base_min
total_low, avg_low = calc_ss_base_with_bonus(5000, {}, base_min, base_max)
assert_close('5k: total = base_min×12', total_low, base_min * 12)

# Very high salary → capped at base_max
total_high, avg_high = calc_ss_base_with_bonus(200000, {}, base_min, base_max)
assert_close('200k: total = base_max×12', total_high, base_max * 12)

group('Per-month SS base — single bonus in June')

# 30k bruto, bonus of 5000 in June (month 6)
bonus_june = {6: 5000}
bruto_mensual = 30000 / 12  # 2500
total_b, avg_b = calc_ss_base_with_bonus(30000, bonus_june, base_min, base_max)
# Month 6: min(max(2500+5000, 1381.20), 4909.50) = min(7500, 4909.50) = 4909.50 (capped)
# Other 11 months: 2500 each
exp_total = 11 * 2500 + 4909.50
assert_close('Bonus capped in June: total', total_b, exp_total, 0.01)

group('Per-month SS base — bonus below cap')

# 20k bruto, bonus 500 in March (1666.67 + 500 = 2166.67 < cap)
bonus_mar = {3: 500}
bruto_mensual_20 = 20000 / 12
total_c, _ = calc_ss_base_with_bonus(20000, bonus_mar, base_min, base_max)
base_mar = min(max(bruto_mensual_20 + 500, base_min), base_max)
base_other = min(max(bruto_mensual_20, base_min), base_max)
exp_total_c = 11 * base_other + base_mar
assert_close('20k + 500 bonus Mar: total', total_c, exp_total_c, 0.01)

group('Per-month SS base — multiple bonuses same month are additive')

# Two bonuses in December: 3000 + 2000 = 5000
bonus_dec_multi = {12: 5000}  # aggregated externally
bruto_mensual_30 = 30000 / 12  # 2500
total_dm, _ = calc_ss_base_with_bonus(30000, bonus_dec_multi, base_min, base_max)
base_dec = min(max(2500 + 5000, base_min), base_max)  # capped
exp_dm = 11 * 2500 + base_dec
assert_close('30k + 5000 Dec: total', total_dm, exp_dm, 0.01)

group('Per-month SS base — bonus at exactly the cap boundary')

# 30k monthly = 2500, bonus = 4909.50 - 2500 = 2409.50 → exactly at cap
exact_bonus = base_max - 2500
bonus_exact = {1: exact_bonus}
total_exact, _ = calc_ss_base_with_bonus(30000, bonus_exact, base_min, base_max)
exp_exact = 11 * 2500 + base_max  # month 1 exactly at cap
assert_close('Exact cap bonus: total', total_exact, exp_exact, 0.001)

# One cent above cap
bonus_over = {1: exact_bonus + 0.01}
total_over, _ = calc_ss_base_with_bonus(30000, bonus_over, base_min, base_max)
assert_close('One cent over cap: same total', total_over, exp_exact, 0.01)


# ──────────────────────────────────────────────────────────────
# F. parseRawEuro — input parsing (mirrors getBonusItems/parseRawEuro)
# ──────────────────────────────────────────────────────────────

def parse_raw_euro(raw):
    """Python equivalent of parseRawEuro in app.js."""
    v = re.sub(r'[^\d,.\-]', '', raw)
    if not v:
        return 0
    n = v
    if ',' in v:
        n = v.replace('.', '').replace(',', '.')
    try:
        f = float(n)
    except ValueError:
        return 0
    return 0 if (math.isnan(f) or f < 0) else f


group('parseRawEuro — standard inputs')

assert_close('Integer "30000"', parse_raw_euro('30000'), 30000)
assert_close('Float dot "30000.50"', parse_raw_euro('30000.50'), 30000.50)
assert_close('Spanish "30.000,50"', parse_raw_euro('30.000,50'), 30000.50)
assert_close('Comma only "1500,25"', parse_raw_euro('1500,25'), 1500.25)
assert_close('Zero ""', parse_raw_euro(''), 0)
assert_close('Just spaces "  "', parse_raw_euro('  '), 0)

group('parseRawEuro — edge and special inputs')

assert_close('Negative "-500" → 0', parse_raw_euro('-500'), 0)
assert_close('Zero "0"', parse_raw_euro('0'), 0.0)
assert_close('With currency "1.200 €"', parse_raw_euro('1.200 €'), 1.2)  # no comma → decimal
assert_close('With text "abc"', parse_raw_euro('abc'), 0)
assert_close('Large comma "1.000.000,99"→needs comma for thousands sep', parse_raw_euro('1.000.000,99'), 1000000.99)
assert_close('Large comma "1.000.000,99"', parse_raw_euro('1.000.000,99'), 1000000.99)
assert_close('Decimals "150,00"', parse_raw_euro('150,00'), 150.0)
assert_close('Single cent "0,01"', parse_raw_euro('0,01'), 0.01)

group('parseRawEuro — bonus import (×1, not ×12)')

# parseRawEuro is used as-is for bonus (the importe is already annual in the row)
assert_close('Bonus "5000" → 5000', parse_raw_euro('5000'), 5000)
assert_close('Bonus "5.000" → 5.0 (decimal, no comma)', parse_raw_euro('5.000'), 5.0)
assert_close('Bonus "5.000,00" → 5000', parse_raw_euro('5.000,00'), 5000.0)


# ──────────────────────────────────────────────────────────────
# G. Dinerario custom items (new feature)
# ──────────────────────────────────────────────────────────────

def full_calc_with_din(bruto, din_anual=0, contrato='indefinido', grupo=4,
                       edad='menor65', discapacidad='no', num_hijos=0, num_asc=0):
    """Simulates app.js with a dinerario custom item.
    Din. items add to bruto for SS base and IRPF; they're part of brutoConBonus."""
    bruto_con = bruto + din_anual

    base_min = BASES_MIN.get(grupo, BASES_MIN[4])
    base_max_v = BASES_MAX
    bruto_mensual = bruto_con / 12
    total_ss_base = 0
    for m in range(1, 13):
        base_mes = min(max(bruto_mensual, base_min), base_max_v)
        total_ss_base += base_mes

    desemp_w = SS_DESEMP_W[contrato]
    total_w_pct = SS_WORKER['cc'] + desemp_w + SS_WORKER['fp'] + SS_WORKER['mei']
    total_ss = total_ss_base * total_w_pct / 100

    rend_int = bruto_con  # no especie
    gastos = total_ss + OTROS_GASTOS
    rend_neto = max(rend_int - gastos, 0)
    reduccion = reduccion_rendimientos(rend_neto)
    base_liq = max(rend_neto - reduccion, 0)

    min_est = calcular_minimo(edad, discapacidad, num_hijos, num_asc, MIN_EST)
    min_aut = calcular_minimo(edad, discapacidad, num_hijos, num_asc, MIN_AUT)

    cuota_est = max(aplicar_escala(base_liq, ESCALA_ESTATAL) - aplicar_escala(min_est, ESCALA_ESTATAL), 0)
    cuota_aut = max(aplicar_escala(base_liq, ESCALA_ANDALUCIA) - aplicar_escala(min_aut, ESCALA_ANDALUCIA), 0)
    cuota_irpf = cuota_est + cuota_aut
    if bruto_con <= SMI_ANUAL:
        cuota_irpf = 0

    neto = bruto_con - total_ss - cuota_irpf
    desemp_e = SS_DESEMP_E[contrato]
    total_e_pct = (SS_EMPLOYER['cc'] + desemp_e + SS_EMPLOYER['fogasa'] +
                   SS_EMPLOYER['fp'] + SS_EMPLOYER['mei'] + SS_EMPLOYER['at'])
    total_emp = total_ss_base * total_e_pct / 100
    coste_total = bruto_con + total_emp  # no adicional here

    return {
        'bruto_con': bruto_con,
        'total_ss': total_ss,
        'cuota_irpf': cuota_irpf,
        'neto': neto,
        'total_emp': total_emp,
        'coste_total': coste_total,
    }


group('Dinerario custom items — basic effect')

r_no_din = full_calc_with_din(30000, din_anual=0)
r_with_din = full_calc_with_din(30000, din_anual=3600)  # 300/mes × 12

# Dinerario adds to bruto
assert_close('Din adds to brutoConBonus', r_with_din['bruto_con'], 33600)

# SS base is higher (or capped) — so SS is higher
assert_true('Din: SS >= no-din SS', r_with_din['total_ss'] >= r_no_din['total_ss'])

# IRPF: higher taxable base
assert_true('Din: IRPF >= no-din IRPF', r_with_din['cuota_irpf'] >= r_no_din['cuota_irpf'])

# Accounting identity still holds
recon = r_with_din['neto'] + r_with_din['total_ss'] + r_with_din['cuota_irpf']
assert_close('Din: neto + SS + IRPF = brutoConBonus', recon, 33600, 0.02)

group('Dinerario — SS base capped for very high din')

# 30k + 50k din = 80k, monthly 6666 > cap 4909.50
r_cap = full_calc_with_din(30000, din_anual=50000)
expected_ss_base_12 = BASES_MAX * 12
total_w_pct = SS_WORKER['cc'] + SS_DESEMP_W['indefinido'] + SS_WORKER['fp'] + SS_WORKER['mei']
exp_ss = expected_ss_base_12 * total_w_pct / 100
assert_close('Din capped: total_ss = base_max × total_pct', r_cap['total_ss'], exp_ss, 0.01)


# ──────────────────────────────────────────────────────────────
# H. SS rates by year — MEI substitution
# ──────────────────────────────────────────────────────────────

def total_worker_pct(anio, contrato='indefinido'):
    mei = MEI_BY_YEAR.get(anio, MEI_BY_YEAR[2026])['worker']
    return SS_WORKER['cc'] + SS_DESEMP_W[contrato] + SS_WORKER['fp'] + mei


def total_employer_pct(anio, contrato='indefinido'):
    mei = MEI_BY_YEAR.get(anio, MEI_BY_YEAR[2026])['employer']
    return (SS_EMPLOYER['cc'] + SS_DESEMP_E[contrato] + SS_EMPLOYER['fogasa'] +
            SS_EMPLOYER['fp'] + SS_EMPLOYER['at'] + mei)


group('Total SS worker % per year increases (MEI phase-in)')

for anio in sorted(MEI_BY_YEAR.keys()):
    total_w = total_worker_pct(anio)
    total_e = total_employer_pct(anio)
    assert_true(f'{anio}: worker total > 6%', total_w > 6)
    assert_true(f'{anio}: employer total > 30%', total_e > 30)

# Rates grow year over year for indefinido
for i, anio in enumerate(sorted(MEI_BY_YEAR.keys())[1:], 1):
    prev_anio = sorted(MEI_BY_YEAR.keys())[i-1]
    assert_true(f'Worker {anio} ≥ {prev_anio}',
                total_worker_pct(anio) >= total_worker_pct(prev_anio))
    assert_true(f'Employer {anio} ≥ {prev_anio}',
                total_employer_pct(anio) >= total_employer_pct(prev_anio))


# ──────────────────────────────────────────────────────────────
# I. Reducción rendimientos — precision and boundary exhaustion
# ──────────────────────────────────────────────────────────────

group('reduccionRendimientos — step function continuity')

# Must be exactly 7302 for any value ≤ 14852
for v in [0, 1, 100, 5000, 10000, 14000, 14851, 14852]:
    assert_close(f'rendNeto={v} → 7302', reduccion_rendimientos(v), 7302, 0.001)

# Must be exactly 0 for values well above 17673.52
for v in [17674, 18000, 20000, 30000, 100000]:
    assert_close(f'rendNeto={v} → 0', reduccion_rendimientos(v), 0, 0.001)

# Intermediate: slope = -2.59, continuous
for delta in [1, 50, 200, 500, 1000, 2000]:
    v = 14852 + delta
    exp = max(7302 - 2.59 * delta, 0)
    assert_close(f'rendNeto=14852+{delta}', reduccion_rendimientos(v), exp, 0.001)

# At upper exact boundary
upper_exact = 14852 + 7302 / 2.59
assert_close('Upper exact boundary → 0 or ε', reduccion_rendimientos(upper_exact), 0, 0.05)

# Never negative
for v in [0, 10000, 14852, 16000, 17673, 17674, 50000]:
    assert_true(f'reduccion({v}) ≥ 0', reduccion_rendimientos(v) >= 0)


# ──────────────────────────────────────────────────────────────
# J. aplicarEscala — structural and mathematical properties
# ──────────────────────────────────────────────────────────────

group('aplicarEscala — strictly increasing total with base')

for escala_name, escala in [('Estatal', ESCALA_ESTATAL), ('Andalucia', ESCALA_ANDALUCIA)]:
    prev_t = -1
    for base in [0, 1, 5000, 12450, 20000, 35200, 50000, 60000, 100000, 300000, 500000]:
        t = aplicar_escala(base, escala)
        assert_true(f'{escala_name} base={base}: total ≥ prev', t >= prev_t)
        prev_t = t

group('aplicarEscala — marginal rate never exceeds top bracket')

for escala_name, escala, top_rate in [
    ('Estatal', ESCALA_ESTATAL, 24.5),
    ('Andalucia', ESCALA_ANDALUCIA, 22.5),
]:
    for base in [500000, 1000000]:
        t = aplicar_escala(base, escala)
        avg_rate = t / base * 100
        assert_true(f'{escala_name} {base}: avg rate < top rate {top_rate}',
                    avg_rate < top_rate)

group('aplicarEscala — zero and negative base')

assert_close('Estatal: base=0', aplicar_escala(0, ESCALA_ESTATAL), 0)
assert_close('Estatal: base=-1', aplicar_escala(-1, ESCALA_ESTATAL), 0)
assert_close('Andalucia: base=0', aplicar_escala(0, ESCALA_ANDALUCIA), 0)
assert_close('Andalucia: base=-100', aplicar_escala(-100, ESCALA_ANDALUCIA), 0)

group('aplicarEscala — large bases use all brackets')

# 400k uses all 6 estatal brackets
e400 = aplicar_escala(400000, ESCALA_ESTATAL)
e300 = aplicar_escala(300000, ESCALA_ESTATAL)
expected_diff = 100000 * 0.245  # top bracket
assert_close('400k - 300k = 100k × 24.5%', e400 - e300, expected_diff, 0.01)


# ──────────────────────────────────────────────────────────────
# K. splitExempt — exhaustive property tests
# ──────────────────────────────────────────────────────────────

group('splitExempt — properties: exento ≤ limit and ≤ total')

import random
random.seed(42)
for _ in range(50):
    ad = random.uniform(0, 3000)
    fl = random.uniform(0, 3000)
    lim = random.uniform(0, 5000)
    ex_ad, ex_fl, gr_ad, gr_fl = split_exempt(ad, fl, lim)
    total_exento = ex_ad + ex_fl
    assert_true(f'exento ≤ limit ({total_exento:.2f} ≤ {lim:.2f})',
                total_exento <= lim + 1e-9)
    assert_true(f'exento ≤ total ({total_exento:.2f} ≤ {ad+fl:.2f})',
                total_exento <= ad + fl + 1e-9)
    assert_close(f'ex+gr = ad  (ad={ad:.2f})', ex_ad + gr_ad, ad, 0.001)
    assert_close(f'ex+gr = fl  (fl={fl:.2f})', ex_fl + gr_fl, fl, 0.001)
    assert_true('ex_ad ≥ 0', ex_ad >= -1e-9)
    assert_true('ex_fl ≥ 0', ex_fl >= -1e-9)
    assert_true('gr_ad ≥ 0', gr_ad >= -1e-9)
    assert_true('gr_fl ≥ 0', gr_fl >= -1e-9)


# ──────────────────────────────────────────────────────────────
# L. SS base group fallback (grupo > 4 falls back to grupo 4)
# ──────────────────────────────────────────────────────────────

group('SS base group — unknown group falls back to grupo 4')

# grupo 4 and grupo 5 (if used) should both resolve to BASES_MIN[4]
base_g4 = min(max(10000 / 12, BASES_MIN[4]), BASES_MAX)
# This mirrors app.js: BASES.minByGroup[grupo] || BASES.minByGroup[4]
# Simulate with group 5 (not in dict) → fallback to group 4
BASES_MIN_TEST = {1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20}
fallback = BASES_MIN_TEST.get(5, BASES_MIN_TEST[4])
assert_close('Group 5 (unknown): fallback = grupo 4 min', fallback, BASES_MIN_TEST[4], 0.001)

# All defined groups are accessible
for g in [1, 2, 3, 4]:
    assert_true(f'Group {g} defined', g in BASES_MIN_TEST)


# ──────────────────────────────────────────────────────────────
# M. SMI exención — boundary conditions
# ──────────────────────────────────────────────────────────────

group('SMI exencion — at, below, and above boundary')

# Exactly at SMI: IRPF = 0
r_at = full_calc(SMI_ANUAL)
assert_close('At SMI: cuota_irpf = 0', r_at['cuota_irpf'], 0)

# 1€ below SMI
r_below = full_calc(SMI_ANUAL - 1)
assert_close('1€ below SMI: cuota_irpf = 0', r_below['cuota_irpf'], 0)

# 1€ above SMI: may have IRPF > 0 (base liquidable may still be below minimo at that level)
r_above = full_calc(SMI_ANUAL + 1)
assert_true('1€ above SMI: cuota_irpf ≥ 0', r_above['cuota_irpf'] >= 0)

# 5k above SMI: definitely has some IRPF
r_5k_above = full_calc(SMI_ANUAL + 5000)
assert_true('5k above SMI: cuota_irpf ≥ 0', r_5k_above['cuota_irpf'] >= 0)

# Neto always positive above SMI (reasonable assumption)
for bruto_t in [SMI_ANUAL, SMI_ANUAL + 1000, 25000, 50000]:
    r_t = full_calc(bruto_t)
    assert_true(f'bruto={bruto_t}: neto > 0', r_t['neto'] > 0)


# ──────────────────────────────────────────────────────────────
# N. SS worker types (official percentages 2025)
# ──────────────────────────────────────────────────────────────

group('SS worker official percentages 2025')

assert_close('CC worker = 4.70%', SS_WORKER['cc'], 4.70, 0.001)
assert_close('FP worker = 0.10%', SS_WORKER['fp'], 0.10, 0.001)
assert_close('MEI worker 2025 = 0.13%', MEI_BY_YEAR[2025]['worker'], 0.13, 0.001)
assert_close('Desempleo indef worker = 1.55%', SS_DESEMP_W['indefinido'], 1.55, 0.001)
assert_close('Desempleo temporal worker = 1.60%', SS_DESEMP_W['temporal'], 1.60, 0.001)
# 2025 total indefinido: 4.70 + 1.55 + 0.10 + 0.13 = 6.48
assert_close('Total worker 2025 indef = 6.48%',
             SS_WORKER['cc'] + SS_DESEMP_W['indefinido'] + SS_WORKER['fp'] + MEI_BY_YEAR[2025]['worker'],
             6.48, 0.001)
# 2025 total temporal: 4.70 + 1.60 + 0.10 + 0.13 = 6.53
assert_close('Total worker 2025 temporal = 6.53%',
             SS_WORKER['cc'] + SS_DESEMP_W['temporal'] + SS_WORKER['fp'] + MEI_BY_YEAR[2025]['worker'],
             6.53, 0.001)

group('SS employer official percentages 2025')

assert_close('CC employer = 23.60%', SS_EMPLOYER['cc'], 23.60, 0.001)
assert_close('AT/EP default = 2.00%', SS_EMPLOYER['at'], 2.00, 0.001)
assert_close('FOGASA = 0.20%', SS_EMPLOYER['fogasa'], 0.20, 0.001)
assert_close('FP employer = 0.60%', SS_EMPLOYER['fp'], 0.60, 0.001)
assert_close('MEI employer 2025 = 0.67%', MEI_BY_YEAR[2025]['employer'], 0.67, 0.001)
assert_close('Desempleo indef employer = 5.50%', SS_DESEMP_E['indefinido'], 5.50, 0.001)
assert_close('Desempleo temporal employer = 6.70%', SS_DESEMP_E['temporal'], 6.70, 0.001)
# 2025 total indef: 23.60 + 5.50 + 0.20 + 0.60 + 0.67 + 2.00 = 32.57
assert_close('Total employer 2025 indef = 32.57%',
             SS_EMPLOYER['cc'] + SS_DESEMP_E['indefinido'] + SS_EMPLOYER['fogasa'] +
             SS_EMPLOYER['fp'] + MEI_BY_YEAR[2025]['employer'] + SS_EMPLOYER['at'],
             32.57, 0.001)


# ──────────────────────────────────────────────────────────────
# O. Solidaridad worker ratio constant
# ──────────────────────────────────────────────────────────────

group('SOLIDARIDAD_WORKER_RATIO — fixed at 4.70/28.30')

assert_close('Ratio = 4.70/28.30', SOLIDARIDAD_WORKER_RATIO, 4.70 / 28.30, 1e-8)
assert_true('Ratio in (0, 1)', 0 < SOLIDARIDAD_WORKER_RATIO < 1)
# Worker gets the minority share (4.70 out of 28.30 total CC)
assert_true('Worker ratio < 0.5', SOLIDARIDAD_WORKER_RATIO < 0.5)
assert_close('Worker part ≈ 16.6%', SOLIDARIDAD_WORKER_RATIO * 100, 16.61, 0.01)


# ──────────────────────────────────────────────────────────────
# P. Especie exemptions — legal limits
# ──────────────────────────────────────────────────────────────

group('Especie exemption constants (Art. 42.3 LIRPF)')

assert_close('Seguro medico/persona = 500', ESPECIE['seguro_medico_persona'], 500, 0.001)
assert_close('Seguro medico/discapacidad = 1500', ESPECIE['seguro_medico_discapacidad'], 1500, 0.001)
assert_close('Transporte exento = 1500/año', ESPECIE['transporte_exento'], 1500, 0.001)
assert_true('Disc limit > normal limit',
            ESPECIE['seguro_medico_discapacidad'] > ESPECIE['seguro_medico_persona'])

group('Especie — transport proportional capping')

# Proportional cap: if total > 1500, both ad and fl scale down equally
for ad, fl in [(900, 900), (1200, 600), (0, 2000), (1500, 500), (1000, 1000)]:
    total_t = ad + fl
    if total_t > 1500:
        ratio = 1500 / total_t
        ad_c, fl_c = ad * ratio, fl * ratio
        assert_close(f'Capped total({ad},{fl})=1500', ad_c + fl_c, 1500, 0.001)
        assert_true(f'Ratio preserved ({ad},{fl})',
                    abs(ad_c / (ad + 1e-9) - fl_c / (fl + 1e-9)) < 0.001 or fl == 0 or ad == 0)


# ──────────────────────────────────────────────────────────────
# Q. OTROS_GASTOS constant
# ──────────────────────────────────────────────────────────────

group('OTROS_GASTOS = 2000 (Art. 19.2 LIRPF)')

assert_close('OTROS_GASTOS = 2000', OTROS_GASTOS, 2000, 0.001)

# This means a salary of 2000 + SS can have rend_neto ≥ 0
# At 5000 bruto, without reduction the rend_neto would be 5000 - SS - 2000 ≈ 2700
r_5k = full_calc(5000)
rend_neto_5k = r_5k['rend_neto']
assert_true('5k: rend_neto ≥ 0 (clamped)', rend_neto_5k >= 0)


# ──────────────────────────────────────────────────────────────
# R. Flexible tax savings (ahorroFlexible) deep tests
# ──────────────────────────────────────────════════════════════

group('ahorroFlexible — cannot exceed IRPF itself')

for bruto_t, fl_esp in [(30000, 1000), (40000, 1200), (50000, 1500)]:
    r_fl = full_calc(bruto_t, ticket_rest_fl=fl_esp)
    if r_fl['ahorro_flex'] > 0:
        assert_true(f'bruto={bruto_t}: ahorro ≤ cuota_irpf',
                    r_fl['ahorro_flex'] <= r_fl['cuota_irpf'] + 0.01)

group('ahorroFlexible — increases with exempt amount (more exempt → more savings)')

r_500 = full_calc(40000, transporte_fl=1200)   # exenta_fl = 1200 (under 1500)
r_1500 = full_calc(40000, transporte_fl=1500)  # exenta_fl = 1500 (exactly at limit)
assert_true('More exenta → more ahorro', r_1500['ahorro_flex'] >= r_500['ahorro_flex'])

group('ahorroFlexible — zero when there is no exenta_fl')

# Custom flexible has no exemption → no ahorro
r_cfl = full_calc(40000, custom_fl=2000)
assert_close('Custom fl (non-exempt): ahorro = 0', r_cfl['ahorro_flex'], 0)

# Zero flexible → zero ahorro
r_no_fl = full_calc(40000)
assert_close('No flexible: ahorro = 0', r_no_fl['ahorro_flex'], 0)


# ──────────────────────────────────────────────────────────────
# S. Neto identity with all components
# ──────────────────────────────────────────────────────────────

group('Neto accounting identity — bruto + din = neto + SS + IRPF + flex')

test_cases = [
    (20000, {}),
    (30000, {}),
    (35000, {'ticket_rest_fl': 1800, 'seg_medico_ad': 600}),
    (50000, {'transporte_fl': 1500, 'custom_ad': 1200}),
    (80000, {'seg_medico_fl': 400, 'num_hijos': 2}),
    (16576, {}),   # SMI
    (200000, {}),  # high income
]

for bruto_t, kwargs in test_cases:
    r_id = full_calc(bruto_t, **kwargs)
    identity = r_id['neto'] + r_id['total_ss'] + r_id['cuota_irpf'] + r_id['total_fl']
    assert_close(f'Identity bruto={bruto_t} kwargs={kwargs}', identity, bruto_t, 0.02)


# ──────────────────────────────────────────────────────────────
# T. All years 2021–2026: BASES produce non-zero distinct SS
# ──────────────────────────────────────────────────────────────

def full_calc_year(bruto, anio):
    """Full calc using the per-year bases and MEI."""
    bases = BASES_BY_YEAR.get(anio, BASES_BY_YEAR[2025])
    base_max_y = bases['max']
    base_min_y = bases['min'][4]

    mei_rates = MEI_BY_YEAR.get(anio, MEI_BY_YEAR[2026])
    w_pct = SS_WORKER['cc'] + SS_DESEMP_W['indefinido'] + SS_WORKER['fp'] + mei_rates['worker']

    base_ss = min(max(bruto / 12, base_min_y), base_max_y)
    total_ss = base_ss * w_pct / 100 * 12

    # solidaridad using the year's max base
    max_base_y = base_max_y * 12
    sol = calc_solidaridad(bruto, max_base_y, anio)
    total_ss_with_sol = total_ss + sol['worker']

    rend_neto = max(bruto - total_ss_with_sol - OTROS_GASTOS, 0)
    reduccion = reduccion_rendimientos(rend_neto)
    base_liq = max(rend_neto - reduccion, 0)
    min_est = calcular_minimo('menor65', 'no', 0, 0, MIN_EST)
    cuota_est = max(aplicar_escala(base_liq, ESCALA_ESTATAL) - aplicar_escala(min_est, ESCALA_ESTATAL), 0)
    cuota_aut = max(aplicar_escala(base_liq, ESCALA_ANDALUCIA) - aplicar_escala(min_est, ESCALA_ANDALUCIA), 0)
    if bruto <= SMI_ANUAL:
        cuota_est = cuota_aut = 0
    return {'total_ss': total_ss_with_sol, 'cuota_irpf': cuota_est + cuota_aut,
            'base_ss': base_ss}


group('Per-year calc 2021–2026 — non-zero, sane, increasing SS cap')

prev_max = 0
for anio in range(2021, 2027):
    r_y = full_calc_year(30000, anio)
    assert_true(f'{anio}: total_ss > 0', r_y['total_ss'] > 0)
    assert_true(f'{anio}: neto would be > 0', 30000 - r_y['total_ss'] - r_y['cuota_irpf'] > 0)
    cur_max = BASES_BY_YEAR[anio]['max']
    # max base strictly increases every year
    assert_true(f'{anio}: max > prev max', cur_max > prev_max)
    prev_max = cur_max

# For very high salary 200k, solidaridad applies from 2025 onwards
group('Per-year calc — solidaridad present >= 2025, absent < 2025')

for anio in range(2021, 2025):
    r_y = full_calc_year(200000, anio)
    max_b = BASES_BY_YEAR[anio]['max'] * 12
    s = calc_solidaridad(200000, max_b, anio)
    assert_close(f'{anio}: no solidaridad', s['worker'], 0, 0.001)

for anio in range(2025, 2046):
    max_b = (BASES_BY_YEAR.get(anio, BASES_BY_YEAR[2026]))['max'] * 12
    s = calc_solidaridad(200000, max_b, anio)
    assert_true(f'{anio}: solidaridad worker > 0', s['worker'] > 0)


# ──────────────────────────────────────────────────────────────
# U. calcularMinimo — Andalucía always ≥ Estatal (more generous)
# ──────────────────────────────────────────────────────────────

group('calcularMinimo — Andalucía ≥ Estatal for all combinations')

for edad_t in ['menor65', 'mayor65', 'mayor75']:
    for disc_t in ['no', '33', '65']:
        for hijos_t in range(0, 4):
            for asc_t in range(0, 3):
                m_est = calcular_minimo(edad_t, disc_t, hijos_t, asc_t, MIN_EST)
                m_aut = calcular_minimo(edad_t, disc_t, hijos_t, asc_t, MIN_AUT)
                assert_true(
                    f'Aut≥Est: edad={edad_t} disc={disc_t} hijos={hijos_t} asc={asc_t}',
                    m_aut >= m_est
                )


# ──────────────────────────────────────────────────────────────
# V. calcularMinimo — values are additive
# ──────────────────────────────────────────────────────────────

group('calcularMinimo — mínimos are additive')

base_est = MIN_EST['contribuyente']
# Each child adds the corresponding bracket amount
m1 = calcular_minimo('menor65', 'no', 1, 0, MIN_EST)
m2 = calcular_minimo('menor65', 'no', 2, 0, MIN_EST)
m3 = calcular_minimo('menor65', 'no', 3, 0, MIN_EST)
assert_close('1→2 hijos adds MIN_EST[hijos][1]', m2 - m1, MIN_EST['hijos'][1], 0.001)
assert_close('2→3 hijos adds MIN_EST[hijos][2]', m3 - m2, MIN_EST['hijos'][2], 0.001)

# Each ascendiente adds ascendiente65
ma0 = calcular_minimo('menor65', 'no', 0, 0, MIN_EST)
ma1 = calcular_minimo('menor65', 'no', 0, 1, MIN_EST)
ma2 = calcular_minimo('menor65', 'no', 0, 2, MIN_EST)
assert_close('0→1 asc', ma1 - ma0, MIN_EST['asc65'], 0.001)
assert_close('1→2 asc', ma2 - ma1, MIN_EST['asc65'], 0.001)

# Age increments
m_menor = calcular_minimo('menor65', 'no', 0, 0, MIN_EST)
m_mayor65 = calcular_minimo('mayor65', 'no', 0, 0, MIN_EST)
m_mayor75 = calcular_minimo('mayor75', 'no', 0, 0, MIN_EST)
assert_close('menor→mayor65 adds mayor65', m_mayor65 - m_menor, MIN_EST['mayor65'], 0.001)
assert_close('mayor65→mayor75 adds mayor75', m_mayor75 - m_mayor65, MIN_EST['mayor75'], 0.001)


# ──────────────────────────────────────────────────────────────
# W. Coste total = bruto + SS_employer + especie_adicional
# ──────────────────────────────────────────────────────────────

group('Coste total exact composition')

for bruto_t, kwargs in [
    (30000, {}),
    (40000, {'seg_medico_ad': 1200}),
    (50000, {'custom_ad': 3000, 'transporte_ad': 1200}),
    (60000, {'ticket_rest_ad': 2400, 'seg_medico_fl': 600}),
]:
    r_ct = full_calc(bruto_t, **kwargs)
    # coste_total = bruto + total_emp + total_ad
    exp_ct = bruto_t + r_ct['total_emp'] + r_ct['total_ad']
    assert_close(f'Coste bruto={bruto_t}: bruto+emp+ad={exp_ct:.2f}', r_ct['coste_total'], exp_ct, 0.02)
    # Coste always > bruto
    assert_true(f'Coste > bruto ({bruto_t})', r_ct['coste_total'] > bruto_t)


# ──────────────────────────────────────────────────────────────
# X. Numeric stability — very large salaries
# ──────────────────────────────────────────────────────────────

group('Numeric stability — very large salaries (500k, 1M)')

for big_bruto in [500_000, 1_000_000]:
    r_big = full_calc(big_bruto)
    assert_true(f'{big_bruto}: neto > 0', r_big['neto'] > 0)
    assert_true(f'{big_bruto}: neto < bruto', r_big['neto'] < big_bruto)
    assert_true(f'{big_bruto}: cuota_irpf > 0', r_big['cuota_irpf'] > 0)
    assert_false = lambda desc, cond: assert_true(desc, not cond)
    assert_true(f'{big_bruto}: no NaN neto', not math.isnan(r_big['neto']))
    assert_true(f'{big_bruto}: no NaN IRPF', not math.isnan(r_big['cuota_irpf']))
    assert_true(f'{big_bruto}: no NaN SS', not math.isnan(r_big['total_ss']))

group('Numeric stability — near-zero salaries')

for tiny_bruto in [1, 100, 500, 1000]:
    r_tiny = full_calc(tiny_bruto)
    assert_true(f'{tiny_bruto}: cuota_irpf = 0 (≤ SMI)', r_tiny['cuota_irpf'] == 0)
    assert_true(f'{tiny_bruto}: no NaN SS', not math.isnan(r_tiny['total_ss']))
    assert_true(f'{tiny_bruto}: base_ss = base_min', r_tiny['base_ss'] >= BASES_MIN[4] - 0.01)


# ──────────────────────────────────────────────────────────────
# Y. Solidaridad worker ratio: complement must add to 100%
# ──────────────────────────────────────────────────────────────

group('Solidaridad worker + employer = 100%')

for exceso in [10000, 50000, 100000]:
    max_b = BASES_MAX * 12
    s = calc_solidaridad(max_b + exceso, max_b, 2026)
    for t in s['tramos']:
        assert_close(f'Tramo tipoW + tipoE = tipoTotal (exceso={exceso})',
                     t['tipoW'] + t['tipoE'], t['tipoTotal'], 0.0001)


# ──────────────────────────────────────────────────────────────
# Z. Bonus aggregation by month
# ──────────────────────────────────────────────────────────────

group('Bonus aggregation — multiple bonuses same month sum correctly')

# Two bonuses in July: 3000 + 1200 = 4200
bonus_july = {7: 4200}  # app.js aggregates before computing
total_bonus_b, _ = calc_ss_base_with_bonus(30000, bonus_july, BASES_MIN[4], BASES_MAX)
base_july = min(max(30000/12 + 4200, BASES_MIN[4]), BASES_MAX)
exp_b = 11 * (30000/12) + base_july
assert_close('July 3000+1200 bonus: correct base', total_bonus_b, exp_b, 0.01)

group('Bonus in different months are independent')

bonus_jan = {1: 2000}
bonus_dec = {12: 2000}
bonus_both = {1: 2000, 12: 2000}

t_jan, _ = calc_ss_base_with_bonus(30000, bonus_jan, BASES_MIN[4], BASES_MAX)
t_dec, _ = calc_ss_base_with_bonus(30000, bonus_dec, BASES_MIN[4], BASES_MAX)
t_both, _ = calc_ss_base_with_bonus(30000, bonus_both, BASES_MIN[4], BASES_MAX)
base_no_bonus, _ = calc_ss_base_with_bonus(30000, {}, BASES_MIN[4], BASES_MAX)

# Difference: each bonus month adds its delta independently
delta_jan = t_jan - base_no_bonus
delta_dec = t_dec - base_no_bonus
assert_close('Both bonuses: delta = sum of individual deltas',
             t_both - base_no_bonus, delta_jan + delta_dec, 0.01)

group('Bonus 0€ has no effect')

t_no_bonus, _ = calc_ss_base_with_bonus(30000, {}, BASES_MIN[4], BASES_MAX)
t_zero_bonus, _ = calc_ss_base_with_bonus(30000, {5: 0}, BASES_MIN[4], BASES_MAX)
assert_close('Bonus 0: same as no bonus', t_no_bonus, t_zero_bonus, 0.001)


# ──────────────────────────────────────────────────────────────
# AA. MESES_LABELS — correct count, content, and month mapping
# ──────────────────────────────────────────────────────────────

MESES_LABELS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

group('MESES_LABELS — 12 months, correct Spanish names')

assert_eq('12 months', len(MESES_LABELS), 12)
assert_eq('Month 1 = Enero', MESES_LABELS[0], 'Enero')
assert_eq('Month 6 = Junio', MESES_LABELS[5], 'Junio')
assert_eq('Month 12 = Diciembre', MESES_LABELS[11], 'Diciembre')
# All unique
assert_eq('All months unique', len(set(MESES_LABELS)), 12)
# 1-based index for JS (m-1 in JS):
for i, mes in enumerate(MESES_LABELS, 1):
    assert_eq(f'Month {i} = {mes}', MESES_LABELS[i-1], mes)


# ──────────────────────────────────────────────────────────────
# BB. Iceberg composition identity (exhaustive)
# ──────────────────────────────────────────────────────────────

group('Iceberg 3-zone identity (neto + workerTax + employerTax ≈ costeTotal)')

iceberg_cases = [
    (20000, {}),
    (30000, {}),
    (30000, {'seg_medico_ad': 600}),
    (40000, {'ticket_rest_fl': 1800, 'transporte_fl': 800}),
    (50000, {'custom_ad': 1200, 'custom_fl': 400}),
    (80000, {}),
    (150000, {}),
    (25000, {'num_hijos': 3, 'edad': 'mayor75'}),
    (200000, {}),
]

for bruto_t, kwargs in iceberg_cases:
    r_ice = full_calc(bruto_t, **kwargs)
    neto_z = max(r_ice['neto'], 0)
    worker_z = r_ice['total_ss'] + r_ice['cuota_irpf'] + r_ice['total_fl']
    employer_z = r_ice['total_emp'] + r_ice['total_ad']
    total_zones = neto_z + worker_z + employer_z
    assert_close(f'Iceberg bruto={bruto_t}: zones = coste',
                 total_zones, r_ice['coste_total'], 0.1)


# ──────────────────────────────────────────────────────────────
# CC. Solidaridad — 2026 base is 5101.20/month official
# ──────────────────────────────────────────────────────────────

group('2026 base max official (5101.20 €/mes)')

assert_close('2026 max = 5101.20', BASES_BY_YEAR[2026]['max'], 5101.20, 0.01)
max_base_2026_anual = 5101.20 * 12
assert_close('2026 max anual = 61214.40', max_base_2026_anual, 61214.40, 0.01)

# Test solidaridad triggers at correct threshold
s_below = calc_solidaridad(max_base_2026_anual, max_base_2026_anual, 2026)
assert_close('2026: exactly at max → sol=0', s_below['worker'], 0, 0.001)

s_above = calc_solidaridad(max_base_2026_anual + 100, max_base_2026_anual, 2026)
assert_true('2026: 100€ above → sol > 0', s_above['worker'] > 0)


# ──────────────────────────────────────────────────────────────
# DD. Full integration for 2026 year — new SS base
# ──────────────────────────────────────────────────────────────

group('Full integration — 2026 year: correct max base 5101.20')

BASES_2026 = BASES_BY_YEAR[2026]
base_g4_2026 = BASES_2026['min'][4]   # 1381.20
base_max_2026 = BASES_2026['max']     # 5101.20

# At 30k with 2026 base, monthly = 2500 → base_ss = 2500 (same result as 2025)
base_ss_2026 = min(max(30000 / 12, base_g4_2026), base_max_2026)
assert_close('2026 30k grupo 4: base_ss = 2500', base_ss_2026, 2500)

# At 60k: monthly = 5000 > 4909.50 (2025 cap) but < 5101.20 (2026 cap)
# In 2025 it would be capped at 4909.50; in 2026 it is NOT capped
base_ss_2026_60k = min(max(60000 / 12, base_g4_2026), base_max_2026)
assert_close('2026 60k: base_ss = 5000 (not capped)', base_ss_2026_60k, 5000, 0.01)

# Compare with 2025 where 60k/12 = 5000 > 4909.50 → capped at 4909.50
base_ss_2025_60k = min(max(60000 / 12, BASES_BY_YEAR[2025]['min'][4]), BASES_BY_YEAR[2025]['max'])
assert_close('2025 60k: base_ss = 4909.50 (capped)', base_ss_2025_60k, 4909.50, 0.01)
assert_true('2026 SS base 60k > 2025 SS base (cap raised)', base_ss_2026_60k > base_ss_2025_60k)



print('\n' + '='*60)
total = _pass + _fail
if _fail == 0:
    print(f'\033[32m  ALL {total} TESTS PASSED ✓\033[0m')
else:
    print(f'\033[31m  {_fail} FAILED\033[0m / {total} total ({_pass} passed)')
print('='*60)

sys.exit(0 if _fail == 0 else 1)
