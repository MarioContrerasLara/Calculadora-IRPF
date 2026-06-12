'use strict';

// =============================================================
//  ESCALAS IRPF 2025
// =============================================================

// Escala estatal (Art. 63.1.1º Ley IRPF)
const ESCALA_ESTATAL = [
    { hasta: 12450, tipo: 9.5 },
    { hasta: 20200, tipo: 12 },
    { hasta: 35200, tipo: 15 },
    { hasta: 60000, tipo: 18.5 },
    { hasta: 300000, tipo: 22.5 },
    { hasta: Infinity, tipo: 24.5 },
];

// Escala autonómica Andalucía (Art. 23 Ley 5/2021)
const ESCALA_ANDALUCIA = [
    { hasta: 13000, tipo: 9.5 },
    { hasta: 21100, tipo: 12 },
    { hasta: 35200, tipo: 15 },
    { hasta: 60000, tipo: 18.5 },
    { hasta: Infinity, tipo: 22.5 },
];

// =============================================================
//  SEGURIDAD SOCIAL 2025 — Régimen General
//  Fuente: seg-social.es/wps/portal/wss/internet/Trabajadores/
//          CotizacionRecaudacionTrabajadores/10721/10957/9932/4315
// =============================================================

// MEI (Mecanismo de Equidad Intergeneracional) by year — DT 43ª RDL 2/2023
const MEI_BY_YEAR = {
    2023: { worker: 0.10, employer: 0.50 },
    2024: { worker: 0.12, employer: 0.58 },
    2025: { worker: 0.13, employer: 0.67 },
    2026: { worker: 0.15, employer: 0.75 },
    2027: { worker: 0.17, employer: 0.83 },
    2028: { worker: 0.18, employer: 0.92 },
    2029: { worker: 0.20, employer: 1.00 },
};

// Tipos del TRABAJADOR
const SS_WORKER = {
    contingenciasComunes: 4.70,
    formacionProfesional: 0.10,
    mei: 0.13,  // default 2025; overridden at runtime by selected year
};
const SS_DESEMPLEO_WORKER = { indefinido: 1.55, temporal: 1.60 };

// Tipos del EMPLEADOR
const SS_EMPLOYER = {
    contingenciasComunes: 23.60,
    accidentesTrabajo: 2.00,  // AT y EP (Disp. Adic. 4ª Ley 42/2006)
    fogasa: 0.20,
    formacionProfesional: 0.60,
    mei: 0.67,  // default 2025; overridden at runtime by selected year
};
const SS_DESEMPLEO_EMPLOYER = { indefinido: 5.50, temporal: 6.70 };

// =============================================================
//  CUOTA DE SOLIDARIDAD — DA 50ª LGSS (añadida por Ley 21/2021)
//  Tramos aplicados al exceso de salario anual sobre la BM anual
//  Fuente: Seg-Social BNR 07-2024 (tabla oficial por año y tramo)
//  Tramo 1: exceso de 0 % a 10 % de la BM anual
//  Tramo 2: exceso del 10 % al 50 % de la BM anual
//  Tramo 3: exceso a partir del 50 % de la BM anual
// =============================================================
const SOLIDARIDAD_BY_YEAR = {
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
};
// Límites superiores de cada tramo (como fracción de la BM anual)
const SOLIDARIDAD_TRAMO_LIMS = [0.10, 0.50, Infinity];
const SOLIDARIDAD_WORKER_RATIO = 4.70 / 28.30;  // misma proporción que CC

// Bases de cotización mensuales por año — Régimen General
//  Fuente: seg-social.es/.../9932/4327 (últimos 5 años)
const BASES_BY_YEAR = {
    2021: { max: 4070.10, minByGroup: { 1: 1572.30, 2: 1303.80, 3: 1134.30, 4: 1125.90 } },
    2022: { max: 4139.40, minByGroup: { 1: 1629.30, 2: 1351.20, 3: 1175.40, 4: 1166.70 } },
    2023: { max: 4495.50, minByGroup: { 1: 1759.50, 2: 1459.20, 3: 1269.30, 4: 1260.00 } },
    2024: { max: 4720.50, minByGroup: { 1: 1847.40, 2: 1532.10, 3: 1332.90, 4: 1323.00 } },
    2025: { max: 4909.50, minByGroup: { 1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20 } },
    2026: { max: 5101.20, minByGroup: { 1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20 } },
};

// Bases de cotización mensuales (default: 2025 — overridden at runtime by selected year)
const BASES = {
    max: 4909.50,
    minByGroup: { 1: 1929.00, 2: 1599.60, 3: 1391.70, 4: 1381.20 },
};

// =============================================================
//  MÍNIMO PERSONAL Y FAMILIAR — Estatal (Art. 57-61 Ley IRPF)
// =============================================================

const MIN_EST = {
    contribuyente: 5550,
    mayor65: 1150,
    mayor75: 1400,
    discapacidad33: 3000,
    discapacidad65: 9000,
    hijos: [2400, 2700, 4000, 4500],
    ascendiente65: 1150,
    ascendiente75: 1400,
};

// =============================================================
//  MÍNIMO PERSONAL Y FAMILIAR — Andalucía
//  (Art. 23 bis Ley 5/2021, de 20 de octubre)
// =============================================================

const MIN_AUT = {
    contribuyente: 5790,
    mayor65: 1200,
    mayor75: 1460,
    discapacidad33: 3130,
    discapacidad65: 9390,
    hijos: [2510, 2820, 4170, 4700],
    ascendiente65: 1200,
    ascendiente75: 1460,
};

// =============================================================
//  OTROS GASTOS DEDUCIBLES (Art. 19.2 Ley IRPF)
// =============================================================

const OTROS_GASTOS = 2000;

// =============================================================
//  RETRIBUCIÓN EN ESPECIE — LÍMITES EXENTOS
//  Art. 42.3 Ley IRPF + Arts. 45, 46, 46 bis Reglamento IRPF
// =============================================================

const ESPECIE = {
    seguroMedicoExentoPorPersona: 500,      // €/año por persona (Art. 42.3.c)
    seguroMedicoExentoDiscapacidad: 1500,   // €/año si discapacidad
    ticketRestauranteMaxDia: 11,            // €/día laborable (Art. 42.3.a, Art. 45 RIRPF)
    transporteExentoAnual: 1500,            // €/año (Art. 42.3.e, Art. 46 bis RIRPF)
};

// =============================================================
//  SALARIO MÍNIMO INTERPROFESIONAL 2025
//  RD 87/2025, de 11 de febrero (BOE 12-02-2025)
//  1.184 €/mes × 14 pagas = 16.576 €/año
//  Bruto anual ≤ SMI → retención IRPF = 0 (Art. 81 bis RIRPF)
// =============================================================

const SMI_ANUAL = 16576;

// =============================================================
//  REDUCCIÓN POR RENDIMIENTOS DEL TRABAJO (Art. 20 Ley IRPF)
//  Ejercicio 2025
// =============================================================

function reduccionRendimientos(rendNeto) {
    if (rendNeto <= 14852) return 7302;
    if (rendNeto <= 17673.52) {
        return Math.max(7302 - 2.59 * (rendNeto - 14852), 0);
    }
    return 0;
}

// =============================================================
//  SPLIT EXEMPTION — Reparto proporcional entre adicional y flexible
// =============================================================

function splitExempt(ad, fl, limit) {
    const total = ad + fl;
    if (total <= 0) return { exAd: 0, exFl: 0, grAd: ad, grFl: fl };
    const exento = Math.min(total, limit);
    const ratioAd = ad / total;
    const exAd = Math.min(ad, exento * ratioAd);
    const exFl = Math.min(fl, exento - exAd);
    return { exAd, exFl, grAd: ad - exAd, grFl: fl - exFl };
}

// =============================================================
//  FUNCIONES DE CÁLCULO
// =============================================================

function calcularMinimo(edad, discapacidad, numHijos, numAscendientes) {
    function build(M) {
        let m = M.contribuyente;
        const d = [{ c: 'Mínimo del contribuyente', v: M.contribuyente }];

        // Art. 57 — Incremento por edad
        if (edad === 'mayor65' || edad === 'mayor75') {
            m += M.mayor65;
            d.push({ c: 'Incremento mayores 65 años', v: M.mayor65 });
        }
        if (edad === 'mayor75') {
            m += M.mayor75;
            d.push({ c: 'Incremento adicional mayores 75 años', v: M.mayor75 });
        }

        // Art. 60 — Mínimo por discapacidad del contribuyente
        if (discapacidad === '33') {
            m += M.discapacidad33;
            d.push({ c: 'Mínimo discapacidad ≥ 33% (Art. 60)', v: M.discapacidad33 });
        } else if (discapacidad === '65') {
            m += M.discapacidad65;
            d.push({ c: 'Mínimo discapacidad ≥ 65% (Art. 60)', v: M.discapacidad65 });
        }

        // Art. 58 — Mínimo por descendientes
        for (let i = 0; i < numHijos; i++) {
            const imp = M.hijos[Math.min(i, M.hijos.length - 1)];
            m += imp;
            d.push({ c: `Mínimo ${i + 1}º descendiente (Art. 58)`, v: imp });
        }

        // Art. 59 — Mínimo por ascendientes
        for (let i = 0; i < numAscendientes; i++) {
            m += M.ascendiente65;
            d.push({ c: `Mínimo ${i + 1}º ascendiente (Art. 59)`, v: M.ascendiente65 });
        }

        return { minimo: m, detalles: d };
    }

    return {
        estatal: build(MIN_EST),
        autonomico: build(MIN_AUT),
    };
}

function aplicarEscala(base, escala) {
    const tramos = [];
    let rest = Math.max(base, 0);
    let total = 0;

    for (let i = 0; i < escala.length; i++) {
        const limInf = i === 0 ? 0 : escala[i - 1].hasta;
        const ancho = escala[i].hasta === Infinity ? Infinity : escala[i].hasta - limInf;
        const bt = Math.min(rest, ancho);
        const ct = bt * escala[i].tipo / 100;

        tramos.push({
            desde: limInf,
            hasta: escala[i].hasta,
            base: bt,
            tipo: escala[i].tipo,
            cuota: ct,
            activo: bt > 0,
        });

        total += ct;
        rest -= bt;
        if (rest <= 0) break;
    }
    return { tramos, total };
}

// =============================================================
//  FORMATO
// =============================================================

// Manual Spanish number formatting — never relies on browser locale support.
// Falls back to Intl.NumberFormat only when toFixed returns scientific notation
// (numbers ≥ 1e21, where JS double precision is already meaningless).
const fmt = n => {
    const neg = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    const fixed = abs.toFixed(2);
    if (fixed.includes('e')) {
        // toFixed gave scientific notation → use Intl (avoids "e+" in output)
        return neg + new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
        }).format(abs);
    }
    const [i, d] = fixed.split('.');
    const dots = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return neg + dots + ',' + d;
};
const fmtPct = n => fmt(n) + '\xa0%';
const fmtTramo = (d, h) =>
    h === Infinity ? fmt(d) + ' en adelante' : fmt(d) + ' — ' + fmt(h);



// =============================================================
//  RENDER HELPERS
// =============================================================

function renderBrackets(tramos, tbId, tfId, cuotaNeta) {
    const tb = document.getElementById(tbId);
    const tf = document.getElementById(tfId);
    tb.innerHTML = '';
    tf.innerHTML = '';

    tramos.forEach(t => {
        const tr = document.createElement('tr');
        if (t.activo) tr.classList.add('hi');
        tr.innerHTML =
            `<td>${fmtTramo(t.desde, t.hasta)}</td>` +
            `<td>${fmt(t.base)} €</td>` +
            `<td>${fmtPct(t.tipo)}</td>` +
            `<td class="text-right">${fmt(t.cuota)} €</td>`;
        tb.appendChild(tr);
    });

    tf.innerHTML =
        `<tr><td colspan="3">Cuota íntegra (tras minorar mínimo personal)</td>` +
        `<td class="text-right">${fmt(cuotaNeta)} €</td></tr>`;
}

// =============================================================
//  PIE CHART (SVG)
// =============================================================

// =============================================================
//  MONTHLY BAR CHART (SVG)
// =============================================================

// Active metric for the monthly chart
// Stored at module scope so the toggle buttons can re-render the chart
// without needing to recompute the upstream IRPF numbers.
let _monthlyChartView = 'neto';
let _monthlyChartArgs = null;
const MONTHLY_VIEW_LABELS = {
    neto:     { title: 'Lo que cobras cada mes (neto)',                    short: 'Neto' },
    bruto:    { title: 'Salario bruto de cada mes',                        short: 'Bruto' },
    total:    { title: 'Coste total para la empresa (por mes)',            short: 'Total' },
    tax:      { title: 'Impuestos del trabajador (SS + IRPF)',            short: 'Impuestos' },
    employee: { title: 'Lo que cobras cada mes (neto + deducciones)',     short: 'Trabajador' },
    employer: { title: 'Costes del empleador (por mes)',                  short: 'Empresa' },
    both:     { title: 'Coste total (trabajador + empresa)',              short: 'Ambos' },
};

// Stacked-bar segment layout per view. Each row is [key, label, color-var].
// The bar's total length is the sum of the listed segments; segments with a
// value of 0 collapse to zero width.
const SEGMENT_COLORS = {
    neto:     'var(--chart-neto)',       // green
    ss:       'var(--chart-ss)',         // orange
    irpf_est: 'var(--chart-irpf-est)',   // blue
    irpf_aut: 'var(--chart-irpf-aut)',   // pink
    flex:     'var(--chart-esp-ad)',     // cyan
    empSS:    'var(--chart-emp)',        // purple
    espAd:    'var(--chart-flex)',       // teal
};
const VIEW_SEGMENTS = {
    neto:  [['neto', 'Neto']],
    bruto: [
        ['neto',     'Neto'],
        ['ss',       'SS trabajador'],
        ['irpf_est', 'IRPF estatal'],
        ['irpf_aut', 'IRPF autonómico'],
        ['flex',     'Especie flexible'],
    ],
    total: [
        ['neto',     'Neto'],
        ['ss',       'SS trabajador'],
        ['irpf_est', 'IRPF estatal'],
        ['irpf_aut', 'IRPF autonómico'],
        ['flex',     'Especie flexible'],
        ['empSS',    'SS empresa'],
        ['espAd',    'Especie adicional'],
    ],
    tax: [
        ['ss',       'SS trabajador'],
        ['irpf_est', 'IRPF estatal'],
        ['irpf_aut', 'IRPF autonómico'],
    ],
    employee: [
        ['neto',     'Neto'],
        ['ss',       'SS trabajador'],
        ['irpf_est', 'IRPF estatal'],
        ['irpf_aut', 'IRPF autonómico'],
        ['flex',     'Especie flexible'],
    ],
    employer: [
        ['empSS',    'SS empresa'],
        ['espAd',    'Especie adicional'],
    ],
    both: [
        ['neto',     'Neto'],
        ['ss',       'SS trabajador'],
        ['irpf_est', 'IRPF estatal'],
        ['irpf_aut', 'IRPF autonómico'],
        ['flex',     'Especie flexible'],
        ['empSS',    'SS empresa'],
        ['espAd',    'Especie adicional'],
    ],
};

// Chart layout — fixed columns.
// CHART_W = CHART_BAR_END + (CHART_VAL_COL - _CHART_MAX_W)
const CHART_VAL_COL = 155;
const CHART_MONTH_X = CHART_VAL_COL + 28;
const CHART_BAR_X = CHART_MONTH_X + 44;
const CHART_BAR_W = 460;
const CHART_BAR_END = CHART_BAR_X + CHART_BAR_W;
const CHART_H = 520;
// Max number the chart is designed for: width of "9.999.999,99 €" ≈ 150px
const _CHART_MAX_W = 150;
const _leftPad = CHART_VAL_COL - _CHART_MAX_W;  // 5
const CHART_W = CHART_BAR_END + _leftPad;         // 676

function updateLegendForView(viewKey) {
    const items = document.querySelectorAll('#monthlyChartLegend .color-scheme-item');
    if (!items.length) return;
    const activeKeys = new Set((VIEW_SEGMENTS[viewKey] || []).map(([k]) => k));
    // Map segment key → whether the user has any non-zero value for it.
    // If a segment is 0 across the board, hide its legend item (nothing to explain).
    const args = _monthlyChartArgs || {};
    const pm = args.perMonth || {};
    const entries = Object.values(pm);
    const hasValue = {
        neto:     true,
        ss:       entries.some(m => m.ss > 0),
        irpf_est: entries.some(m => m.irpf_est > 0),
        irpf_aut: entries.some(m => m.irpf_aut > 0),
        flex:     entries.some(m => m.flex > 0),
        empSS:    (args.mensualEmpSS || 0) > 0,
        espAd:    (args.mensualEspAd || 0) > 0,
    };
    items.forEach(item => {
        const key = item.getAttribute('data-key');
        const show = activeKeys.has(key) && hasValue[key] !== false;
        item.style.display = show ? '' : 'none';
    });
}

function renderMonthlyChart(salarioPorMes, bonusPorMes, brutoMensualBase, numPagas, perMonth, mensualEmpSS, mensualEspAd) {
    _monthlyChartArgs = {
        salarioPorMes, bonusPorMes, brutoMensualBase, numPagas,
        perMonth, mensualEmpSS, mensualEspAd
    };

    const monthAbbr = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const viewKey = _monthlyChartView;

    const months = [];
    for (let m = 1; m <= 12; m++) {
        const salarioMes = salarioPorMes[m] != null ? salarioPorMes[m] : brutoMensualBase;
        const mesBonus  = bonusPorMes[m] || 0;
        const isExtra   = numPagas === 14 && (m === 6 || m === 12);
        const isUpdate  = m > 1 && salarioPorMes[m] != null && salarioPorMes[m] !== salarioPorMes[m - 1];

        // 7-component breakdown per month. All segments are non-negative.
        // SS/IRPF/Flex are pre-computed per month by the caller so a salary
        // update mid-year scales the deductions with the new salary. Extra
        // pagas skip employee deductions (SS/IRPF/Flex) but still accrue
        // employer-side costs (empSS/espAd). Bonuses land in the neto segment.
        const pm = perMonth[m];
        const comps = {
            neto:     pm.totalBrutoMes - pm.ss - pm.irpf_est - pm.irpf_aut - pm.flex,
            ss:       pm.ss,
            irpf_est: pm.irpf_est,
            irpf_aut: pm.irpf_aut,
            flex:     pm.flex,
            empSS:    mensualEmpSS || 0,
            espAd:    mensualEspAd || 0,
        };
        const viewTotal = VIEW_SEGMENTS[viewKey].reduce((s, [k]) => s + (comps[k] || 0), 0);

        months.push({ m, comps, viewTotal, isExtra, isUpdate, hasBonus: mesBonus > 0, salario: salarioMes, bonus: mesBonus });
    }

    const maxValueActual = Math.max(...months.map(x => x.viewTotal), 1);
    // 5% headroom — just enough so the tallest bar doesn't kiss the chart top
    const maxValue = maxValueActual * 1.05;

    // Fixed viewBox: CHART_W = CHART_BAR_END + _leftPad
    let W = CHART_W;
    const H = CHART_H;
    const padT = 10, padB = 10;
    const rowH = (H - padT - padB) / 12;
    const barH = rowH * 0.55;

    // Fixed column widths — value column is wide enough for ~99.999.999,99 €
    const valueColEnd = CHART_VAL_COL;
    const monthColX   = CHART_MONTH_X;
    const barAreaX    = CHART_BAR_X;
    const barAreaEnd  = CHART_BAR_X + CHART_BAR_W;
    const barAreaW    = CHART_BAR_W;

    // Update the h3 to reflect the current view
    const titleEl = document.querySelector('.monthly-chart-head h3');
    if (titleEl) titleEl.textContent = MONTHLY_VIEW_LABELS[viewKey].title;

    const parts = [];
    parts.push(`<svg class="monthly-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de cobro mensual" style="color: var(--text-1)">`);
    parts.push(`<rect width="${W}" height="${H}" fill="var(--bg-elevated)" rx="8"/>`);

    months.forEach((mo, i) => {
        const rowY = padT + i * rowH;
        const cy   = rowY + rowH / 2;

        // Value (right-aligned, at row center) — shows the view's total
        const valueText = fmt(mo.viewTotal) + ' €';
        parts.push(`<text class="bar-value" x="${CHART_VAL_COL / 2}" y="${(cy + 5).toFixed(1)}" text-anchor="middle">${valueText}</text>`);

        // Month name (left-aligned, at row center)
        parts.push(`<text class="month-label" x="${monthColX}" y="${(cy + 5).toFixed(1)}" text-anchor="middle">${monthAbbr[mo.m - 1]}</text>`);

        // Stacked bar: one <rect> per segment, placed left-to-right.
        // Total bar length = mo.viewTotal; each segment's width is proportional
        // to its share of the view's max.
        const by = cy - barH / 2;
        const totalBarW = Math.max(2, (mo.viewTotal / maxValue) * barAreaW);
        const scale = mo.viewTotal > 0 ? totalBarW / mo.viewTotal : 0;
        let xCursor = barAreaX;
        let lastSegX = barAreaX, lastSegW = 0;
        VIEW_SEGMENTS[viewKey].forEach(([key, label]) => {
            const v = mo.comps[key] || 0;
            if (v <= 0) return;
            const segW = Math.max(0, v * scale);
            const segX = xCursor;
            const tipParts = [`${label}: ${fmt(v)} €`];
            if (mo.isExtra) tipParts.push('Paga extra');
            if (mo.isUpdate) tipParts.push('Salario actualizado');
            if (mo.hasBonus) tipParts.push(`Bonus: +${fmt(mo.bonus)} €`);
            const tip = tipParts.join(' · ');
            // rounded only on the outermost edges of the whole bar
            const isFirst = segX === barAreaX;
            const isLast  = (xCursor + segW) >= (barAreaX + totalBarW - 0.5);
            const rx = (isFirst || isLast) ? 5 : 0;
            parts.push(`<rect class="bar bar-seg" x="${segX.toFixed(1)}" y="${by.toFixed(1)}" width="${segW.toFixed(1)}" height="${barH.toFixed(1)}" rx="${rx}" style="fill: ${SEGMENT_COLORS[key]};transition:opacity 0.15s ease;cursor:pointer;"><title>${tip}</title></rect>`);
            xCursor += segW;
            lastSegX = segX; lastSegW = segW;
        });

        // Badges: at the right end of the bar (inside the bar if it reaches
        // the right edge, otherwise in the empty space to the right of short bars).
        // Each badge type gets a distinct color matching the legend below.
        const badgeMap = {
            '+': { fill: '#10b981', label: 'Paga extra' },   // green
            '€': { fill: '#f59e0b', label: 'Bonus' },         // amber
            '↑': { fill: '#3b82f6', label: 'Salario actualizado' }, // blue
        };
        const badges = [];
        if (mo.isExtra)  badges.push('+');
        if (mo.hasBonus) badges.push('€');
        if (mo.isUpdate) badges.push('↑');
        if (badges.length) {
            const badgeW = 16, badgeH = 16;
            const stripW = badges.length * (badgeW + 2) - 2;
            const barEndX = lastSegX + lastSegW;
            let bxB = barEndX - stripW;                         // default: inside right end
            if (bxB + stripW > barAreaEnd) bxB = barEndX + 4;    // overflow → outside
            if (bxB + stripW > barAreaEnd) bxB = barAreaX;      // still overflow → at bar start
            const byB = cy - badgeH / 2;
            badges.forEach(b => {
                const color = badgeMap[b].fill;
                const tip = badgeMap[b].label;
                parts.push(`<rect class="badge" x="${bxB.toFixed(1)}" y="${byB.toFixed(1)}" width="${badgeW}" height="${badgeH}" rx="8" style="fill:${color};stroke:#fff;stroke-width:1;"><title>${tip}</title></rect>`);
                parts.push(`<text class="badge-text" x="${(bxB + badgeW/2).toFixed(1)}" y="${(byB + badgeH - 4.5).toFixed(1)}" style="fill:#fff;font-size:11px;font-weight:700;text-anchor:middle;">${b}</text>`);
                bxB += badgeW + 2;
            });
        }
    });
    parts.push('</svg>');
    document.getElementById('monthlyChart').innerHTML = parts.join('');

    // Scrollable HTML overlay for value numbers (foreignObject inside SVG can't scroll)
    // Skip if SVG is not visible yet (panel hidden) — overlay and viewBox refinement
    // happen in _rebuildMonthlyChartOverlay when the mensual tab activates.
    const chartEl = document.getElementById('monthlyChart');
    const svgEl = chartEl.querySelector('.monthly-chart-svg');
    const svgW = svgEl.getBoundingClientRect().width;
    if (svgW > 0) {
        // Panel is visible — catch content (e.g. badge rects) past CHART_BAR_END.
        let visRight = 0;
        svgEl.querySelectorAll('.bar-seg').forEach(r => {
            try { const b = r.getBBox(); const rgt = b.x + b.width; if (rgt > visRight) visRight = rgt; } catch(e) {}
        });
        if (visRight > 0) {
            const idealW = Math.ceil(Math.max(W, 560, visRight + 20));
            if (Math.abs(idealW - W) > 1) {
                W = idealW;
                svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
                const bgRect = svgEl.querySelector('rect');
                if (bgRect) bgRect.setAttribute('width', W);
            }
        }
        const svgW2 = svgEl.getBoundingClientRect().width;
        _buildChartOverlay(chartEl, svgEl, svgW2, months, padT, rowH, W, H, valueColEnd);
    }

    // Indicators (badges in the chart): only show markers that have actual data.
    const indicators = [];
    if (numPagas === 14) {
        indicators.push(`<span class="chart-indicator" style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#10b981;color:#fff;font-size:11px;font-weight:700;line-height:1;">+</span>Paga extra (jun/dic)</span>`);
    }
    if (Object.values(bonusPorMes || {}).some(v => (v || 0) > 0)) {
        indicators.push(`<span class="chart-indicator" style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#f59e0b;color:#fff;font-size:11px;font-weight:700;line-height:1;">€</span>Bonus aplicado ese mes</span>`);
    }
    if (Object.values(salarioPorMes || {}).some(v => v != null && Math.abs(v - brutoMensualBase) > 0.01)) {
        indicators.push(`<span class="chart-indicator" style="display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;line-height:1;">↑</span>Salario actualizado</span>`);
    }
    const indicatorsEl = document.getElementById('monthlyChartIndicators');
    if (indicatorsEl) {
        if (indicators.length === 0) {
            indicatorsEl.style.display = 'none';
        } else {
            indicatorsEl.innerHTML = '<span style="font-weight:600;color:var(--text-1);">Marcas del gráfico:</span> ' + indicators.join(' &nbsp; ');
        }
    }

    // Sync the color-scheme legend with the active view
    updateLegendForView(viewKey);
}

function _buildChartOverlay(chartEl, svgEl, svgW, months, padT, rowH, W, H, valueColEnd) {
    // Remove any existing overlay first
    const old = chartEl.querySelector('.chart-value-overlay');
    if (old) old.remove();
    chartEl.style.position = 'relative';
    const chartRect = chartEl.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();
    const svgH = svgRect.height;
    const svgOffL = svgRect.left - chartRect.left;
    const svgOffT = svgRect.top - chartRect.top;
    const sx = svgW / W;
    const sy = svgH / H;
    const colW = Math.round(valueColEnd * sx) + 6;
    const overlay = document.createElement('div');
    overlay.className = 'chart-value-overlay';
    overlay.style.cssText = 'position:absolute;left:' + svgOffL + 'px;top:' + svgOffT + 'px;width:' + colW + 'px;height:' + svgH + 'px;overflow:hidden;';
    for (let i = 0; i < months.length; i++) {
        const mo = months[i];
        const rowY = padT + i * rowH;
        const rowPx = Math.round(rowY * sy);
        const rowHPx = Math.max(16, Math.round(rowH * sy));
        const row = document.createElement('div');
        row.className = 'chart-value-overlay-row';
        row.textContent = fmt(mo.viewTotal) + ' €';
        row.style.cssText = 'position:absolute;left:0;top:' + rowPx + 'px;width:100%;height:' + rowHPx + 'px;overflow-x:auto;scrollbar-width:thin;scrollbar-gutter:stable both-edges;display:flex;justify-content:center;align-items:center;white-space:nowrap;font-size:15px;font-variant-numeric:tabular-nums;line-height:' + rowHPx + 'px;padding:0;box-sizing:border-box;color:var(--text-1);';
        overlay.appendChild(row);
    }
    chartEl.appendChild(overlay);
    requestAnimationFrame(() => {
        const rows = overlay.querySelectorAll('.chart-value-overlay-row');
        rows.forEach(r => { r.scrollLeft = 0; });
    });
}

// Called from the mensual tab click handler to rebuild the overlay when panel becomes visible
window._rebuildMonthlyChartOverlay = function () {
    const args = _monthlyChartArgs;
    if (!args) return;
    const chartEl = document.getElementById('monthlyChart');
    const svgEl = chartEl && chartEl.querySelector('.monthly-chart-svg');
    if (!svgEl) return;
    const svgW = svgEl.getBoundingClientRect().width;
    if (svgW > 0) {
        // Re-derive months array from args (same logic as renderMonthlyChart)
        const viewKey = _monthlyChartView;
        const { salarioPorMes, bonusPorMes, brutoMensualBase, numPagas, perMonth, mensualEmpSS, mensualEspAd } = args;
        const months = [];
        for (let m = 1; m <= 12; m++) {
            const pm = perMonth[m];
            const comps = {
                neto:     pm.totalBrutoMes - pm.ss - pm.irpf_est - pm.irpf_aut - pm.flex,
                ss:       pm.ss,
                irpf_est: pm.irpf_est,
                irpf_aut: pm.irpf_aut,
                flex:     pm.flex,
                empSS:    mensualEmpSS || 0,
                espAd:    mensualEspAd || 0,
            };
            const viewTotal = VIEW_SEGMENTS[viewKey].reduce((s, [k]) => s + (comps[k] || 0), 0);
            months.push({ m: m, comps, viewTotal });
        }
        const padT = 10;
        // Fixed viewBox: CHART_W = CHART_BAR_END + _leftPad
        let W = CHART_W;
        const H = CHART_H;
        // Catch content (e.g. badge rects) past CHART_BAR_END
        let visRight = 0;
        svgEl.querySelectorAll('.bar-seg').forEach(r => {
            try { const b = r.getBBox(); const rgt = b.x + b.width; if (rgt > visRight) visRight = rgt; } catch(e) {}
        });
        if (visRight > 0) {
            const idealW = Math.ceil(Math.max(W, 560, visRight + 20));
            if (Math.abs(idealW - W) > 1) {
                W = idealW;
                svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
                const bgRect = svgEl.querySelector('rect');
                if (bgRect) bgRect.setAttribute('width', W);
            }
        }
        const rowH = (H - padT - 10) / 12;
        _buildChartOverlay(chartEl, svgEl, svgEl.getBoundingClientRect().width, months, padT, rowH, W, H, CHART_VAL_COL);
    }
};

function renderPie(svgId, legendId, slices, total) {
    const svg = document.getElementById(svgId);
    const legend = document.getElementById(legendId);
    svg.innerHTML = '';
    legend.innerHTML = '';

    const cx = 100, cy = 100, r = 85;
    let cumAngle = -Math.PI / 2; // start from top

    slices.forEach(s => {
        const pct = total > 0 ? s.value / total : 0;
        if (pct <= 0) return;
        const angle = pct * 2 * Math.PI;
        const x1 = cx + r * Math.cos(cumAngle);
        const y1 = cy + r * Math.sin(cumAngle);
        const x2 = cx + r * Math.cos(cumAngle + angle);
        const y2 = cy + r * Math.sin(cumAngle + angle);
        const large = angle > Math.PI ? 1 : 0;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = pct >= 0.9999
            ? `M${cx},${cy - r}A${r},${r},0,1,1,${cx - 0.001},${cy - r}Z`
            : `M${cx},${cy}L${x1},${y1}A${r},${r},0,${large},1,${x2},${y2}Z`;
        path.setAttribute('d', d);
        path.style.fill = s.color;
        path.setAttribute('stroke', '#fff');
        path.setAttribute('stroke-width', '1.5');

        // Tooltip
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${s.label}: ${fmt(s.value)} € (${fmt(pct * 100)}%)`;
        path.appendChild(title);

        svg.appendChild(path);
        cumAngle += angle;
    });

    // Legend
    legend.innerHTML = slices.filter(s => s.value > 0).map(s => {
        const pct = total > 0 ? (s.value / total * 100) : 0;
        return `<div class="pie-leg-item">` +
            `<span class="pie-swatch" style="background:${s.color}"></span>` +
            `<span class="pie-leg-text">${s.label}: <strong>${fmt(s.value)} €</strong> (${fmt(pct)}%)</span>` +
            `</div>`;
    }).join('');
}

// =============================================================
//  ICEBERG DIAGRAM
// =============================================================

// Cache the iceberg layout (svg vs scene rects). The layout only changes
// on window resize, so we can avoid forced reflows on every render.
let _iceLayoutCache = null;
// The dynamic Y of the tip/body waterline in SVG viewBox coords. The waterline
// CSS pseudo-elements (.iceberg-scene::before / ::after) are positioned at
// this Y so the visual surface line stays aligned with the SVG.
let _iceWaterlineY = 170;
// The dynamic Y of the employee/employer split in SVG viewBox coords.
// Exposed for debugging / future use; the visual waterline is _iceWaterlineY.
let _iceSplitY = 305;
window.addEventListener('resize', () => { _iceLayoutCache = null; });

// Save the last set of values passed to renderIceberg so we can re-position
// the labels if the user reveals the Distribución tab after the initial
// calculation (the layout cache is only populated when the SVG is visible).
let _iceLastArgs = null;

function getIceLayout() {
    if (_iceLayoutCache) return _iceLayoutCache;
    const svgEl   = document.querySelector('.ice-svg');
    const sceneEl = document.querySelector('.ice-scene');
    const wrapEl  = document.querySelector('.iceberg-scene');
    const netEl   = document.getElementById('iceZoneNet');
    if (!svgEl || !sceneEl || !netEl) return null;
    // The iceberg now lives inside the Distribución panel. If that tab hasn't
    // been opened yet, the SVG is hidden and would measure as 0×0. Skip
    // caching in that case so the next visible call gets a fresh measurement.
    // We check actual dimensions rather than offsetParent, which can be
    // unreliable inside flex/grid layouts.
    const probeRect = svgEl.getBoundingClientRect();
    if (probeRect.width === 0 || probeRect.height === 0) return null;
    const svgRect   = probeRect;
    const sceneRect = sceneEl.getBoundingClientRect();
    // Read the row height once — it's determined by CSS line-height which
    // doesn't change between renders.
    const rowH = netEl.querySelector('.ice-row')?.offsetHeight || 28;
    _iceLayoutCache = {
        svgRelL: svgRect.left - sceneRect.left,
        svgRelT: svgRect.top  - sceneRect.top,
        sx: svgRect.width  / 300,
        sy: svgRect.height / 440,
        sceneW: sceneRect.width,
        sceneH: sceneRect.height,
        rowH,
    };
    // Position the waterline (CSS .iceberg-scene::before / ::after) at the
    // current tip/body boundary. The waterline separates the visible "tip"
    // (net salary) from the underwater body (taxes), so it follows _iceWaterlineY
    // (NOT the employee/employer split, which sits deeper inside the body).
    if (wrapEl) {
        const wrapRect = wrapEl.getBoundingClientRect();
        if (wrapRect.height > 0) {
            const waterlineSceneY = svgRect.top - wrapRect.top + (_iceWaterlineY / 440) * svgRect.height;
            const pct = (waterlineSceneY / wrapRect.height) * 100;
            wrapEl.style.setProperty('--ice-waterline-top', pct.toFixed(3) + '%');
            wrapEl.style.setProperty('--ice-waterline-pct', pct.toFixed(3) + '%');
        }
    }
    return _iceLayoutCache;
}

function renderIceberg(neto, ssWorker, irpfEst, irpfAut, ssEmp, espAdicional, espFlexible, costeTotal) {
    if (costeTotal <= 0) return;
    _iceLastArgs = [neto, ssWorker, irpfEst, irpfAut, ssEmp, espAdicional, espFlexible, costeTotal];
    _iceLayoutCache = null;

    const workerTax = ssWorker + irpfEst + irpfAut + espFlexible;
    const employerTax = ssEmp + espAdicional;
    const totalTax = workerTax + employerTax;
    const netoClean = Math.max(neto, 0);
    const realRate = costeTotal > 0 ? (totalTax / costeTotal * 100) : 0;
    const brutoVisible = netoClean + workerTax;
    const apparentRate = brutoVisible > 0 ? (workerTax / brutoVisible * 100) : 0;

    // ── Iceberg geometry constants (original design space) ──
    const L = [[50,170],[38,200],[22,240],[8,280],[5,290],[8,320],[22,360],[50,395],[85,420],[140,440]];
    const R = [[250,170],[275,195],[290,225],[293,260],[295,290],[293,325],[285,365],[255,400],[210,425],[140,440]];
    // Tip outline (clockwise from base-left) — irregular iceberg silhouette with multiple peaks.
    // The above-water portion; y goes 38 (apex) to 170 (waterline at base).
    const TIP_OUTLINE = [
        [50,170],[60,135],[78,108],[95,128],[115,98],[140,68],
        [155,82],[175,38],[195,72],[215,98],[235,128],[250,150],[250,170]
    ];
    const TIP_RIDGE_PATHS = [
        'M 78,165 L 86,128 L 95,118',
        'M 115,165 L 122,108 L 132,82',
        'M 140,165 L 148,95 L 155,75',
        'M 175,165 L 180,72 L 188,55',
        'M 195,165 L 202,95 L 210,82',
        'M 215,165 L 222,118 L 228,105',
    ];
    const BODY_STROKE_PATHS = [
        'M 25,200 Q 18,250 22,300',
        'M 50,180 Q 35,260 45,360',
        'M 275,200 Q 282,250 278,300',
        'M 250,180 Q 265,260 255,360',
    ];
    const RIPPLE_D1 = 'M 5,172 Q 25,168 45,172 T 85,172 T 125,172 T 165,172 T 205,172 T 245,172 T 285,172';
    const RIPPLE_D2 = 'M 0,178 Q 22,174 44,178 T 88,178 T 132,178 T 176,178 T 220,178 T 264,178 T 300,178';

    // SVG viewBox anchor values (original design)
    const TOTAL_H      = 440;
    const ORIG_TIP_APEX = 38;
    const ORIG_TIP_BASE = 170;
    const ORIG_TIP_H    = ORIG_TIP_BASE - ORIG_TIP_APEX;  // 132
    const ORIG_BODY_H   = TOTAL_H - ORIG_TIP_BASE;         // 270

    // ── Compute new dimensions from the data (strictly proportional) ──
    const netoFrac   = costeTotal > 0 ? netoClean / costeTotal : 0;
    const tipH       = netoFrac * TOTAL_H;
    const bodyH      = TOTAL_H - tipH;
    const bodyTop    = tipH;
    const bodyBot    = TOTAL_H;
    const tipApexNew = bodyTop - tipH;

    // Employee/employer split, positioned inside the new body
    const workerFrac = totalTax > 0 ? (workerTax / totalTax) : 0.5;
    const splitY     = bodyTop + workerFrac * bodyH;

    // Y-axis remap helpers
    const tipScale  = ORIG_TIP_H  > 0 ? tipH  / ORIG_TIP_H  : 1;
    const bodyScale = ORIG_BODY_H > 0 ? bodyH / ORIG_BODY_H : 1;
    function remapTipY(y) {
        if (y <= ORIG_TIP_APEX) return tipApexNew;
        if (y >= ORIG_TIP_BASE) return bodyTop;
        return tipApexNew + (y - ORIG_TIP_APEX) * tipScale;
    }
    function remapBodyY(y) {
        if (y <= ORIG_TIP_BASE) return bodyTop;
        if (y >= TOTAL_H)       return bodyBot;
        return bodyTop + (y - ORIG_TIP_BASE) * bodyScale;
    }
    // Body X scaling: top fixed at tip base (50/250), bottom fixed at center (140),
    // middle bulges with bodyScale. Prevents "mushroom" (body narrower than tip)
    // and keeps the iceberg shape at any tax level.
    function remapBodyX(x) {
        if (x <= 50)  return 50;                 // top-left and points left of it: fixed
        if (x >= 250) return 250;                // top-right and points right of it: fixed
        if (x === 140) return 140;               // bottom-center: fixed (single point)
        if (x < 140)  return 50 - (50 - x) * bodyScale;   // left bulge, anchored at top
        if (x > 140)  return 250 + (x - 250) * bodyScale; // right bulge, anchored at top
        return x;
    }
    function shiftFromWaterline(y) { return bodyTop + (y - ORIG_TIP_BASE); }
    function remapPathY(pathStr, remapY, remapX) {
        return (pathStr.match(/[MLQT][^MLQT]*/g) || []).map(token => {
            const cmd = token[0];
            const nums = token.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
            if (nums.length === 0 || nums.length % 2 !== 0) return token;
            const out = [];
            for (let i = 0; i < nums.length; i += 2) {
                const nx = remapX ? remapX(nums[i]) : nums[i];
                const ny = remapY(nums[i + 1]);
                out.push(Number.isInteger(nx) ? nx : nx.toFixed(1));
                out.push(Number.isInteger(ny) ? ny : ny.toFixed(1));
            }
            return cmd + out.join(',');
        }).join(' ');
    }
    const pointsToPath = pts => 'M ' + pts.map(([x, y]) => `${x},${(+y.toFixed(1))}`).join(' L ') + ' Z';

    // ── Build the new geometry as point lists (used by both SVG and label positioning) ──
    const tipPtsNew  = TIP_OUTLINE.map(([x, y]) => [x, remapTipY(y)]);
    const Lnew       = L.map(([x, y]) => [remapBodyX(x), remapBodyY(y)]);
    const Rnew       = R.map(([x, y]) => [remapBodyX(x), remapBodyY(y)]);
    const bodyOutline = [...Lnew, ...Rnew.slice().reverse()];
    // Outer outline: tip clockwise + R top→bottom + L bottom→top + close
    const outlinePts  = [...tipPtsNew, ...Rnew, ...Lnew.slice().reverse()];

    // ── Update SVG: paths, clipPaths, ellipse, body rects ──
    const tipPath = pointsToPath(tipPtsNew);
    const bodyPath = pointsToPath(bodyOutline);
    const outlinePath = pointsToPath(outlinePts);

    const $ = id => document.getElementById(id);
    if ($('iceTipPath'))        $('iceTipPath').setAttribute('d', tipPath);
    if ($('iceTipClipPath'))    $('iceTipClipPath').setAttribute('d', tipPath);
    if ($('iceBodyClipPath'))   $('iceBodyClipPath').setAttribute('d', bodyPath);
    if ($('iceOutlinePath'))    $('iceOutlinePath').setAttribute('d', outlinePath);

    const ridgeEls = document.querySelectorAll('.ice-tip-ridge');
    ridgeEls.forEach((el, i) => {
        if (i < TIP_RIDGE_PATHS.length) el.setAttribute('d', remapPathY(TIP_RIDGE_PATHS[i], remapTipY));
    });
    const strokeEls = document.querySelectorAll('.ice-body-stroke');
    strokeEls.forEach((el, i) => {
        if (i < BODY_STROKE_PATHS.length) el.setAttribute('d', remapPathY(BODY_STROKE_PATHS[i], remapBodyY, remapBodyX));
    });
    if ($('iceWaterlineRipple1')) $('iceWaterlineRipple1').setAttribute('d', remapPathY(RIPPLE_D1, shiftFromWaterline));
    if ($('iceWaterlineRipple2')) $('iceWaterlineRipple2').setAttribute('d', remapPathY(RIPPLE_D2, shiftFromWaterline));

    const tipHL = $('iceTipHighlight');
    if (tipHL) {
        tipHL.setAttribute('cy', (tipApexNew + (55 - ORIG_TIP_APEX) * tipScale).toFixed(1));
        tipHL.setAttribute('ry', (55 * tipScale).toFixed(1));
    }

    const wRect = $('iceWorkerRect');
    wRect.setAttribute('y', bodyTop);
    wRect.setAttribute('height', splitY - bodyTop);
    const eRect = $('iceEmployerRect');
    eRect.setAttribute('y', splitY);
    eRect.setAttribute('height', bodyBot - splitY);

    // Expose for the CSS waterline positioning
    _iceWaterlineY = bodyTop;
    _iceSplitY     = splitY;

    // Zone midpoints in SVG Y coords
    const netMidSvgY    = tipApexNew + tipH / 2;
    const workerMidSvgY = (bodyTop + splitY) / 2;
    const empMidSvgY    = (splitY + bodyBot) / 2;

    // ── Label text content (no layout needed) ──
    const netEl  = document.getElementById('iceZoneNet');
    const wrkEl  = document.getElementById('iceZoneEmployee');
    const empEl  = document.getElementById('iceZoneEmployer');

    netEl.innerHTML =
        `<div class="ice-row"><span class="ice-val">€ ${fmt(netoClean)}</span><span class="ice-connector"><span class="ice-connector-dot"></span></span></div>` +
        `<div class="ice-lbl-text">Pago neto</div>`;

    wrkEl.innerHTML =
        `<div class="ice-row"><span class="ice-val">€ ${fmt(workerTax)}</span><span class="ice-connector"><span class="ice-connector-dot"></span></span></div>` +
        `<div class="ice-lbl-text">Impuestos pagados<br>por ti</div>`;

    empEl.innerHTML =
        `<div class="ice-row"><span class="ice-connector"><span class="ice-connector-dot"></span></span><span class="ice-val">€ ${fmt(employerTax)}</span></div>` +
        `<div class="ice-lbl-text">Impuestos pagados<br>por tu empleador</div>`;

    // Summary cards (no layout needed)
    const perEuro = costeTotal > 0 ? (totalTax / costeTotal * 10).toFixed(2).replace('.', ',') : '0';
    document.getElementById('iceSummary').innerHTML =
        `<div class="ice-card">` +
            `<div class="ice-card-title">Impuestos totales pagados</div>` +
            `<div class="ice-card-value">${fmt(totalTax)} €</div>` +
            `<div class="ice-card-text">¿Sabías que tu empleador también paga impuestos por tu salario? ` +
            `Tu empleador paga € ${fmt(employerTax)} sobre tu salario de € ${fmt(brutoVisible)}. ` +
            `Es decir, cada vez que gastas 10 € del dinero por el que tanto te esforzaste, ${perEuro} € va directo al Estado.</div>` +
        `</div>` +
        `<div class="ice-card">` +
            `<div class="ice-card-title">Tasa impositiva real</div>` +
            `<div class="ice-card-value">${fmt(realRate)}%</div>` +
            `<div class="ice-card-text">Ahora, ya que tanto tú como tu empleador pagáis impuestos, ` +
            `lo que solía ser un ${fmt(apparentRate)}% de la tasa de impuestos, aumenta a ${fmt(realRate)}%. ` +
            `Esto quiere decir que la tasa impositiva es ${fmt(realRate - apparentRate)}% más alta de lo que parecía al principio.</div>` +
        `</div>`;

    // ── Position labels dynamically at zone midpoints (requires layout) ──
    // The iceberg lives inside the Distribución panel. If that tab hasn't been
    // opened yet, the SVG is hidden (offsetParent === null) and the layout
    // would measure as 0×0. In that case, skip positioning now — the tab
    // switcher calls repositionIceberg() when the user opens the tab.
    const lay = getIceLayout();
    if (!lay) return;
    const { svgRelL, svgRelT, sx, sy, sceneW, sceneH, rowH } = lay;

    function iceEdge(svgY) {
        if (svgY <= tipApexNew) return [tipPtsNew[0][0], tipPtsNew[0][0]];
        if (svgY >= bodyTop) {
            return [interp(Lnew, svgY), interp(Rnew, svgY)];
        }
        let minX = Infinity, maxX = -Infinity;
        for (let i = 0; i < tipPtsNew.length; i++) {
            const [x1, y1] = tipPtsNew[i];
            const [x2, y2] = tipPtsNew[(i + 1) % tipPtsNew.length];
            if (y1 === y2) continue;
            if ((y1 <= svgY && svgY <= y2) || (y2 <= svgY && svgY <= y1)) {
                const t = (svgY - y1) / (y2 - y1);
                const x = x1 + t * (x2 - x1);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
        if (minX === Infinity) return [tipPtsNew[0][0], tipPtsNew[0][0]];
        return [minX, maxX];
    }

    // Convert SVG Y to scene-relative px
    function scenePx(svgY) { return svgRelT + svgY * sy; }

    // Position so the ice-row (amount+connector) aligns with zone midpoint
    const netTargetPx = scenePx(netMidSvgY);
    const wrkTargetPx = scenePx(workerMidSvgY);
    const empTargetPx = scenePx(empMidSvgY);

    // Offset by half the row height so the connector line sits at midpoint
    netEl.style.top = (netTargetPx - rowH / 2) + 'px';
    wrkEl.style.top = (wrkTargetPx - rowH / 2) + 'px';
    empEl.style.top = (empTargetPx - rowH / 2) + 'px';

    // Set row widths so dots touch the iceberg edge (flex connector fills remaining space)
    const [netLx]    = iceEdge(netMidSvgY);
    const [wrkLx]    = iceEdge(workerMidSvgY);
    const [, empRx]  = iceEdge(empMidSvgY);

    const netIcePx = svgRelL + netLx * sx;
    const wrkIcePx = svgRelL + wrkLx * sx;
    const empIcePx = svgRelL + empRx * sx;

    // Left labels: row stretches from label left edge to iceberg left edge
    const netLabelLeft = sceneW * 0.05;
    const wrkLabelLeft = sceneW * 0.04;
    netEl.querySelector('.ice-row').style.width = Math.max(60, netIcePx - netLabelLeft) + 'px';
    wrkEl.querySelector('.ice-row').style.width = Math.max(60, wrkIcePx - wrkLabelLeft) + 'px';

    // Right label: row stretches from iceberg right edge to label right edge
    const empLabelRight = sceneW * 0.95;
    empEl.querySelector('.ice-row').style.width = Math.max(60, empLabelRight - empIcePx) + 'px';
}

// Re-run renderIceberg with the last known values. Called when the user
// reveals the Distribución tab for the first time (the layout cache was
// empty because the SVG was hidden when the initial calculation ran).
function repositionIceberg() {
    if (_iceLastArgs) {
        _iceLayoutCache = null;
        renderIceberg.apply(null, _iceLastArgs);
    }
}

// =============================================================
//  RETRIBUCIÓN EN ESPECIE — CONCEPTOS DINÁMICOS
// =============================================================

let espCustomCounter = 0;

// =============================================================
//  BONUS PUNTUALES
// =============================================================
let bonusCounter = 0;
const MESES_LABELS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function addBonus() {
    bonusCounter++;
    const row = document.createElement('div');
    row.className = 'especie-custom-row';
    row.id = 'bonusRow' + bonusCounter;
    const opts = MESES_LABELS.map((m, i) =>
        `<option value="${i + 1}"${i === 0 ? ' selected' : ''}>${m}</option>`
    ).join('');
    row.innerHTML =
        `<input type="text" class="bonus-importe" placeholder="Importe (€)" inputmode="decimal" autocomplete="off">` +
        `<select class="bonus-mes">${opts}</select>` +
        `<button type="button" class="btn-remove-especie" title="Eliminar">✕</button>`;
    document.getElementById('bonusList').appendChild(row);
    row.querySelector('.bonus-importe').addEventListener('input', () => scheduleCalcGlobal());
    row.querySelector('.bonus-mes').addEventListener('change', () => scheduleCalcGlobal());
    row.querySelector('.btn-remove-especie').addEventListener('click', () => removeBonus(row));
    row.querySelector('.bonus-importe').focus();
}

function removeBonus(row) {
    row.remove();
    scheduleCalcGlobal();
}

function getBonusItems() {
    return Array.from(document.querySelectorAll('#bonusList .especie-custom-row')).map(row => {
        const raw = row.querySelector('.bonus-importe').value.replace(/[^\d,.\-]/g, '');
        let importe = 0;
        if (raw) {
            let n = raw;
            if (raw.includes(',')) n = raw.replace(/\./g, '').replace(',', '.');
            const f = parseFloat(n);
            importe = isNaN(f) || f < 0 ? 0 : f;
        }
        const mes = parseInt(row.querySelector('.bonus-mes').value, 10);
        return { importe, mes };
    }).filter(b => b.importe > 0);
}

// ═══════════════════════════════════════════════════════════
//  ACTUALIZACIÓN SALARIAL (Salary Adjustments)
// ═══════════════════════════════════════════════════════════

let actualizacionCounter = 0;

function addActualizacionSalarial() {
    actualizacionCounter++;
    const row = document.createElement('div');
    row.className = 'especie-custom-row';
    row.id = 'actualizacionRow' + actualizacionCounter;
    
    row.innerHTML =
        `<input type="text" class="actualizacion-nuevoSalario" placeholder="Nuevo salario anual (€)" inputmode="decimal" autocomplete="off">` +
        `<input type="date" class="actualizacion-fecha" autocomplete="off">` +
        `<button type="button" class="btn-remove-especie" title="Eliminar">✕</button>`;

    // Default to day 1 of the current month (year is ignored by the parser —
    // it only uses month/day against the year selected in the year selector).
    const t = new Date();
    const defaultDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    row.querySelector('.actualizacion-fecha').value = defaultDate;

    document.getElementById('actualizacionList').appendChild(row);
    row.querySelector('.actualizacion-nuevoSalario').addEventListener('input', () => scheduleCalcGlobal());
    row.querySelector('.actualizacion-fecha').addEventListener('change', () => scheduleCalcGlobal());
    row.querySelector('.btn-remove-especie').addEventListener('click', () => removeActualizacionSalarial(row));
    row.querySelector('.actualizacion-nuevoSalario').focus();
}

function removeActualizacionSalarial(row) {
    row.remove();
    scheduleCalcGlobal();
}

function getActualizacionSalarialItems() {
    return Array.from(document.querySelectorAll('#actualizacionList .especie-custom-row')).map(row => {
        const raw = row.querySelector('.actualizacion-nuevoSalario').value.replace(/[^\d,.\-]/g, '');
        let nuevoSalario = 0;
        if (raw) {
            let n = raw;
            if (raw.includes(',')) n = raw.replace(/\./g, '').replace(',', '.');
            const f = parseFloat(n);
            nuevoSalario = isNaN(f) || f < 0 ? 0 : f;
        }
        
        const fechaInput = row.querySelector('.actualizacion-fecha').value; // Format: YYYY-MM-DD
        let mes = 0, dia = 0;
        
        if (fechaInput) {
            const [year, month, day] = fechaInput.split('-');
            mes = parseInt(month, 10);
            dia = parseInt(day, 10);
        }
        
        return { nuevoSalario, mes, dia };
    }).filter(a => a.nuevoSalario > 0 && a.mes >= 1 && a.mes <= 12 && a.dia >= 1 && a.dia <= 31);
}

// ─── Toggle Monthly/Annual mode for tickets ────
function toggleTicketMode(ticketType) {
    // ticketType: 'espTicketRest' or 'espTransporte'
    const toggle = document.getElementById(`${ticketType}ModeToggle`);
    const monthlyDiv = document.getElementById(`${ticketType}-monthly`);
    const annualDiv = document.getElementById(`${ticketType}-annual`);
    const monthlyInputs = monthlyDiv.querySelectorAll('input[type="text"]');
    const annualInputs = annualDiv.querySelectorAll('input[type="text"]');
    
    if (toggle.checked) {
        // Switch to Annual mode
        monthlyDiv.style.display = 'none';
        annualDiv.style.display = 'flex';
        // Clear annual inputs when switching
        annualInputs.forEach(inp => inp.value = '');
    } else {
        // Switch to Monthly mode
        monthlyDiv.style.display = 'flex';
        annualDiv.style.display = 'none';
        // Clear monthly inputs when switching
        monthlyInputs.forEach(inp => inp.value = '');
    }
    scheduleCalcGlobal();
}

// Placeholder overwritten once calcular auto-recalc is set up
let scheduleCalcGlobal = function() {};

function addEspecieCustom() {
    espCustomCounter++;
    const row = document.createElement('div');
    row.className = 'especie-custom-row';
    row.id = 'espCustomRow' + espCustomCounter;
    row.innerHTML =
        '<input type="text" class="especie-custom-name" placeholder="Nombre (ej: Teletrabajo)" autocomplete="off">' +
        '<label class="especie-din-label"><input type="checkbox" class="especie-din-chk"> Monetario</label>' +
        '<span class="especie-custom-tag especie-dual-tag tag-adicional especie-esp-only">Ad.</span>' +
        '<input type="text" class="especie-custom-ad especie-esp-only" placeholder="€/mes" inputmode="decimal" autocomplete="off">' +
        '<span class="especie-custom-tag especie-dual-tag tag-flexible especie-esp-only">Fl.</span>' +
        '<input type="text" class="especie-custom-fl especie-esp-only" placeholder="€/mes" inputmode="decimal" autocomplete="off">' +
        '<input type="text" class="especie-custom-din" placeholder="€/mes" inputmode="decimal" autocomplete="off" style="display:none">' +
        '<button type="button" class="btn-remove-especie" title="Eliminar">✕</button>';
    document.getElementById('espCustomList').appendChild(row);
    row.querySelector('.especie-din-chk').addEventListener('change', (e) => toggleEspecieDin(e.currentTarget));
    row.querySelector('.btn-remove-especie').addEventListener('click', () => removeEspecieCustom(row));
    row.querySelector('.especie-custom-name').focus();
}

function toggleEspecieDin(chk) {
    const row = chk.closest('.especie-custom-row');
    const isDin = chk.checked;
    row.querySelectorAll('.especie-esp-only').forEach(el => { el.style.display = isDin ? 'none' : ''; });
    row.querySelector('.especie-custom-din').style.display = isDin ? '' : 'none';
    scheduleCalcGlobal();
}

function removeEspecieCustom(row) {
    row.remove();
}

function parseRawEuro(raw) {
    const v = raw.replace(/[^\d,.\-]/g, '');
    if (!v) return 0;
    let n = v;
    if (v.includes(',')) n = v.replace(/\./g, '').replace(',', '.');
    const f = parseFloat(n);
    return isNaN(f) || f < 0 ? 0 : f;
}

function getEspecieCustomItems() {
    const rows = document.querySelectorAll('#espCustomList .especie-custom-row');
    const items = [];
    rows.forEach(row => {
        const name = row.querySelector('.especie-custom-name').value.trim();
        const isDin = row.querySelector('.especie-din-chk').checked;
        if (isDin) {
            const importe = parseRawEuro(row.querySelector('.especie-custom-din').value) * 12;
            if (importe <= 0) return;
            items.push({ nombre: name || 'Complemento dinerario', dinerario: importe });
        } else {
            const ad = parseRawEuro(row.querySelector('.especie-custom-ad').value) * 12;
            const fl = parseRawEuro(row.querySelector('.especie-custom-fl').value) * 12;
            if (ad <= 0 && fl <= 0) return;
            items.push({ nombre: name || 'Concepto en especie', adicional: ad, flexible: fl });
        }
    });
    return items;
}

// =============================================================
//  CUOTA DE SOLIDARIDAD — Cálculo
// =============================================================

function calcSolidaridad(brutoAnual, maxBaseAnual, anio) {
    const exceso = Math.max(brutoAnual - maxBaseAnual, 0);
    if (exceso <= 0) return { worker: 0, employer: 0, tramos: [] };

    const tipos = SOLIDARIDAD_BY_YEAR[anio];
    if (!tipos) return { worker: 0, employer: 0, tramos: [] };

    let remaining = exceso;
    let workerTotal = 0;
    let employerTotal = 0;
    const tramos = [];

    SOLIDARIDAD_TRAMO_LIMS.forEach((limSup, i) => {
        const prevLimAbs = i === 0 ? 0 : maxBaseAnual * SOLIDARIDAD_TRAMO_LIMS[i - 1];
        const limSupAbs  = limSup === Infinity ? Infinity : maxBaseAnual * limSup;
        const tramoWidth = limSupAbs === Infinity ? Infinity : limSupAbs - prevLimAbs;
        const base = tramoWidth === Infinity ? remaining : Math.min(remaining, tramoWidth);
        if (base <= 0) return;

        const tipoTotal     = tipos[i];
        const tipoW         = tipoTotal * SOLIDARIDAD_WORKER_RATIO;
        const tipoE         = tipoTotal * (1 - SOLIDARIDAD_WORKER_RATIO);
        const cuotaWorker   = base * tipoW / 100;
        const cuotaEmployer = base * tipoE / 100;

        workerTotal   += cuotaWorker;
        employerTotal += cuotaEmployer;
        remaining     -= base;

        tramos.push({ label: `Cuota solidaridad T${i + 1}`, base, tipoTotal, tipoW, tipoE, cuotaWorker, cuotaEmployer });
    });

    return { worker: workerTotal, employer: employerTotal, tramos };
}

// =============================================================
//  CÁLCULO PRINCIPAL
// =============================================================

function calcular(scroll = false) {
    // Parse input — accept both "30.000" and "30000,50" formats; max 2 decimals
    const raw = document.getElementById('bruto').value.replace(/[^\d,.\-]/g, '');
    let norm = raw;
    if (raw.includes(',')) {
        norm = raw.replace(/\./g, '').replace(',', '.');
    }
    const bruto = Math.round(parseFloat(norm) * 100) / 100;
    const brutoError = document.getElementById('brutoError');
    if (isNaN(bruto) || bruto <= 0) {
        if (scroll) {
            document.getElementById('bruto').classList.add('input-error');
            brutoError.textContent = 'Introduce un salario bruto anual válido.';
        }
        return;
    }
    document.getElementById('bruto').classList.remove('input-error');
    brutoError.textContent = '';

    const anio = parseInt(document.getElementById('anio').value, 10);
    const meiRates = MEI_BY_YEAR[anio] || MEI_BY_YEAR[2026];
    SS_WORKER.mei   = meiRates.worker;
    SS_EMPLOYER.mei = meiRates.employer;
    const basesAnio = BASES_BY_YEAR[anio] || BASES_BY_YEAR[2025];
    BASES.max = basesAnio.max;
    BASES.minByGroup = basesAnio.minByGroup;

    const numPagas = parseInt(document.getElementById('pagas').value, 10);
    const contrato = document.getElementById('contrato').value;
    const edad = document.getElementById('edad').value;
    const discapacidad = document.getElementById('discapacidad').value;
    const numHijos = parseInt(document.getElementById('hijos').value, 10);
    const numAscendientes = parseInt(document.getElementById('ascendientes').value, 10);
    const grupo = document.getElementById('grupo').value;
    const cnaeInput = document.getElementById('cnae').value.trim();

    // ───────────────────────────────────────────
    //  0a. RETRIBUCIÓN EN ESPECIE
    // ───────────────────────────────────────────

    function parseEuro(id) {
        const v = document.getElementById(id).value.replace(/[^\d,.\-]/g, '');
        if (!v) return 0;
        let n = v;
        if (v.includes(',')) n = v.replace(/\./g, '').replace(',', '.');
        const f = parseFloat(n);
        return isNaN(f) || f < 0 ? 0 : f;
    }

    // Exempt fields — each concept has Adicional + Flexible amounts
    const segMedicoAd = parseEuro('espSeguroMedicoAd') * 12;
    const segMedicoFl = parseEuro('espSeguroMedicoFl') * 12;
    const espSeguroMedico = segMedicoAd + segMedicoFl;
    const espSeguroMedicoBenef = parseInt(document.getElementById('espSeguroMedicoBenef').value, 10);

    // Ticket restaurante - handle monthly vs annual
    let ticketRestAd, ticketRestFl;
    const ticketRestMode = document.getElementById('espTicketRestModeToggle').checked; // true = annual
    if (ticketRestMode) {
        // Annual mode
        ticketRestAd = parseEuro('espTicketRestAdAnnual');
        ticketRestFl = parseEuro('espTicketRestFlAnnual');
    } else {
        // Monthly mode (x12)
        ticketRestAd = parseEuro('espTicketRestAd') * 12;
        ticketRestFl = parseEuro('espTicketRestFl') * 12;
    }
    const espTicketRest = ticketRestAd + ticketRestFl;

    // Ticket transporte - handle monthly vs annual
    let transporteAd, transporteFl;
    const transporteMode = document.getElementById('espTransporteModeToggle').checked; // true = annual
    if (transporteMode) {
        // Annual mode
        transporteAd = parseEuro('espTransporteAdAnnual');
        transporteFl = parseEuro('espTransporteFlAnnual');
    } else {
        // Monthly mode (x12)
        transporteAd = parseEuro('espTransporteAd') * 12;
        transporteFl = parseEuro('espTransporteFl') * 12;
    }
    const maxTransporte = ESPECIE.transporteExentoAnual;       // 1 500 €/año máximo absoluto
    const rawTransporte = transporteAd + transporteFl;
    if (rawTransporte > maxTransporte) {
        const ratio = maxTransporte / rawTransporte;
        transporteAd = transporteAd * ratio;
        transporteFl = transporteFl * ratio;
    }
    const espTransporte = transporteAd + transporteFl;

    // Custom non-exempt items (dynamic rows)
    const customItems = getEspecieCustomItems();
    const customEspecie = customItems.filter(i => !i.dinerario);
    const customDinAnual = customItems.filter(i => i.dinerario).reduce((s, i) => s + i.dinerario, 0);
    const customAdicional = customEspecie.reduce((s, i) => s + i.adicional, 0);
    const customFlexible  = customEspecie.reduce((s, i) => s + i.flexible, 0);

    // Exempt limits (shared across ad+fl for the same concept)
    const limSegMedico = espSeguroMedicoBenef * (
        discapacidad !== 'no' ? ESPECIE.seguroMedicoExentoDiscapacidad : ESPECIE.seguroMedicoExentoPorPersona
    );
    const limTicketRest = espTicketRest; // Employee controls usage → always within 11€/day → fully exempt
    const limTransporte = ESPECIE.transporteExentoAnual;

    const sm = splitExempt(segMedicoAd, segMedicoFl, limSegMedico);
    const tr = splitExempt(ticketRestAd, ticketRestFl, limTicketRest);
    const tp = splitExempt(transporteAd, transporteFl, limTransporte);

    // ── Adicional: on top of bruto → gravada adds to rend. íntegro, total adds to coste empresa
    const gravadaAdicional = sm.grAd + tr.grAd + tp.grAd + customAdicional;
    const exentaAdicional  = sm.exAd + tr.exAd + tp.exAd;
    const totalAdicional   = segMedicoAd + ticketRestAd + transporteAd + customAdicional;

    // ── Flexible: from bruto → exenta reduces taxable base, no extra cost
    const gravadaFlexible = sm.grFl + tr.grFl + tp.grFl + customFlexible;
    const exentaFlexible  = sm.exFl + tr.exFl + tp.exFl;
    const totalFlexible   = segMedicoFl + ticketRestFl + transporteFl + customFlexible;

    // Totales globales (para visualización)
    const totalEspecieGravada = gravadaAdicional + gravadaFlexible;
    const totalEspecieExenta = exentaAdicional + exentaFlexible;
    const totalEspecie = totalAdicional + totalFlexible;

    // ───────────────────────────────────────────
    //  0. CNAE → AT y EP lookup
    // ───────────────────────────────────────────

    let tipoAT = SS_EMPLOYER.accidentesTrabajo; // default 2.00%
    let cnaeInfo = null;
    const cnaeHint = document.getElementById('cnaeHint');

    // ── Bonus puntuales ──
    const bonusItems = getBonusItems();
    const bonusTotal = bonusItems.reduce((s, b) => s + b.importe, 0);
    // Per-month bonus map (month 1–12 → total bonus in that month)
    const bonusPorMes = {};
    bonusItems.forEach(b => {
        bonusPorMes[b.mes] = (bonusPorMes[b.mes] || 0) + b.importe;
    });

    // ── Actualización salarial (Salary Adjustments) ──
    const actualizacionItems = getActualizacionSalarialItems();
    // Sort by month, then by day to find the applicable salary for each month
    actualizacionItems.sort((a, b) => a.mes !== b.mes ? a.mes - b.mes : a.dia - b.dia);
    
    // Helper to get days in month
    const getDaysInMonth = (mes, anio) => {
        if (mes === 2) return (anio % 4 === 0 && (anio % 100 !== 0 || anio % 400 === 0)) ? 29 : 28;
        return [31, 31, 30, 31, 30, 31, 31, 31, 30, 31, 30, 31][mes - 1];
    };
    
    // Build per-month salary map (month 1–12 → MONTHLY salary for that month)
    const salarioPorMes = {};
    let currentAnnualSalary = bruto + customDinAnual; // Base salary
    
    for (let m = 1; m <= 12; m++) {
        // Check if there's an adjustment for this month
        const adjustmentThisMonth = actualizacionItems.find(a => a.mes === m);
        const adjustmentBefore = actualizacionItems.filter(a => a.mes < m);
        
        // Update currentAnnualSalary if there's an adjustment before this month
        if (adjustmentBefore.length > 0) {
            currentAnnualSalary = adjustmentBefore[adjustmentBefore.length - 1].nuevoSalario + customDinAnual;
        }
        
        let monthSalary;
        
        if (!adjustmentThisMonth) {
            // No adjustment this month - use current annual salary / 12
            monthSalary = currentAnnualSalary / 12;
        } else if (adjustmentThisMonth.dia === 1) {
            // Adjustment on day 1 - use new salary for entire month
            monthSalary = (adjustmentThisMonth.nuevoSalario + customDinAnual) / 12;
            currentAnnualSalary = adjustmentThisMonth.nuevoSalario + customDinAnual;
        } else {
            // Pro-rata: part at old salary, part at new
            const daysInMonth = getDaysInMonth(m, parseInt(anio));
            const daysOld = adjustmentThisMonth.dia - 1;
            const daysNew = daysInMonth - adjustmentThisMonth.dia + 1;
            
            const oldMonthly = currentAnnualSalary / 12;
            const newMonthly = (adjustmentThisMonth.nuevoSalario + customDinAnual) / 12;
            
            monthSalary = (oldMonthly * daysOld + newMonthly * daysNew) / daysInMonth;
            currentAnnualSalary = adjustmentThisMonth.nuevoSalario + customDinAnual;
        }
        
        salarioPorMes[m] = monthSalary;
    }
    
    // Calculate total annual gross with adjustments and bonuses
    let brutoAnualConAjustes = 0;
    for (let m = 1; m <= 12; m++) {
        brutoAnualConAjustes += salarioPorMes[m] + (bonusPorMes[m] || 0);
    }
    
    const brutoConBonus = brutoAnualConAjustes;

    if (cnaeInput) {
        const result = buscarTarifaAT(cnaeInput);
        if (result) {
            tipoAT = result.total;
            cnaeInfo = result;
            cnaeHint.textContent = `CNAE ${result.code}: ${result.d} — IT ${fmt(result.it)}% + IMS ${fmt(result.ims)}% = ${fmt(result.total)}%`;
            cnaeHint.style.color = '';
        } else {
            cnaeHint.textContent = `CNAE "${cnaeInput}" no encontrado en la tarifa. Se aplica el tipo por defecto (2,00%).`;
            cnaeHint.style.color = 'var(--accent)';
        }
    } else {
        cnaeHint.textContent = 'Si se indica, se usará la tarifa AT y EP oficial. Si no, se aplica 2,00\u00a0%.';
        cnaeHint.style.color = '';
    }

    // ───────────────────────────────────────────
    //  1. SEGURIDAD SOCIAL — TRABAJADOR
    // ───────────────────────────────────────────

    const baseMin = BASES.minByGroup[grupo] || BASES.minByGroup[4];
    const baseMax = BASES.max;

    // Per-month SS base (adjusted salaries, bonuses may hit a higher capped base)
    let totalSSbaseAnual = 0;
    for (let m = 1; m <= 12; m++) {
        const brutoMes = salarioPorMes[m] + (bonusPorMes[m] || 0);
        const baseMes = Math.min(Math.max(brutoMes, baseMin), baseMax);
        totalSSbaseAnual += baseMes;
    }
    // Display base (weighted average) and representative base for ordinary months
    const brutoMensualBase = (bruto + customDinAnual) / 12;
    const baseSSmensualSinBonus = Math.min(Math.max(brutoMensualBase, baseMin), baseMax);
    const baseSSmensual = totalSSbaseAnual / 12;

    const desempleoW = SS_DESEMPLEO_WORKER[contrato];
    const conceptosSS = [
        { nombre: 'Contingencias comunes', tipo: SS_WORKER.contingenciasComunes },
        { nombre: 'Desempleo (' + contrato + ')', tipo: desempleoW },
        { nombre: 'Formación profesional', tipo: SS_WORKER.formacionProfesional },
        { nombre: 'MEI', tipo: SS_WORKER.mei },
    ];

    let totalSSanual = 0;
    const detalleSS = conceptosSS.map(c => {
        const anual = totalSSbaseAnual * (c.tipo / 100);
        totalSSanual += anual;
        return { ...c, base: baseSSmensual, anual };
    });

    // Cuota de solidaridad (DA 50ª LGSS) — exceso de salario anual sobre BM anual
    const maxBaseAnual = baseMax * 12;
    const solidaridad = calcSolidaridad(brutoConBonus, maxBaseAnual, anio);
    totalSSanual += solidaridad.worker;

    // ───────────────────────────────────────────
    //  2. IRPF — Determinación de base liquidable
    // ───────────────────────────────────────────

    // Adicional gravada adds ON TOP of bruto; flexible exenta reduces taxable base (already in bruto)
    const rendIntegro = brutoConBonus + gravadaAdicional - exentaFlexible;
    const gastosDeducibles = totalSSanual + OTROS_GASTOS;
    const rendNeto = Math.max(rendIntegro - gastosDeducibles, 0);
    const reduccion = reduccionRendimientos(rendNeto);
    const baseImponible = Math.max(rendNeto - reduccion, 0);
    const baseLiquidable = baseImponible;

    // ───────────────────────────────────────────
    //  3. IRPF — Cuotas íntegras
    // ───────────────────────────────────────────

    const mins = calcularMinimo(edad, discapacidad, numHijos, numAscendientes);
    const minimoEst = mins.estatal.minimo;
    const minimoAut = mins.autonomico.minimo;

    const estBruto = aplicarEscala(baseLiquidable, ESCALA_ESTATAL);
    const autBruto = aplicarEscala(baseLiquidable, ESCALA_ANDALUCIA);
    const estMin = aplicarEscala(minimoEst, ESCALA_ESTATAL);
    const autMin = aplicarEscala(minimoAut, ESCALA_ANDALUCIA);

    let cuotaEstatal = Math.max(estBruto.total - estMin.total, 0);
    let cuotaAutonomica = Math.max(autBruto.total - autMin.total, 0);
    let cuotaIRPF = cuotaEstatal + cuotaAutonomica;

    // SMI exento de retención (Art. 81 bis RIRPF)
    if (brutoConBonus <= SMI_ANUAL) {
        cuotaEstatal = 0;
        cuotaAutonomica = 0;
        cuotaIRPF = 0;
    }

    // ───────────────────────────────────────────
    //  3b. Ahorro fiscal por retribución flexible
    // ───────────────────────────────────────────

    let ahorroFlexible = 0;
    if (exentaFlexible > 0 && brutoConBonus > SMI_ANUAL) {
        // Recalculate IRPF as if no flexible exemption existed
        const rendIntSinFlex = brutoConBonus + gravadaAdicional;
        const rendNetoSinFlex = Math.max(rendIntSinFlex - gastosDeducibles, 0);
        const reducSinFlex = reduccionRendimientos(rendNetoSinFlex);
        const blSinFlex = Math.max(rendNetoSinFlex - reducSinFlex, 0);
        const cuotaEstSinFlex = Math.max(aplicarEscala(blSinFlex, ESCALA_ESTATAL).total - estMin.total, 0);
        const cuotaAutSinFlex = Math.max(aplicarEscala(blSinFlex, ESCALA_ANDALUCIA).total - autMin.total, 0);
        ahorroFlexible = (cuotaEstSinFlex + cuotaAutSinFlex) - cuotaIRPF;
    }

    // ───────────────────────────────────────────
    //  4. NETO
    // ───────────────────────────────────────────

    // Neto = what arrives in the bank account (cash)
    const neto = brutoConBonus - totalFlexible - totalSSanual - cuotaIRPF;
    const tipoTotal = brutoConBonus > 0 ? ((totalSSanual + cuotaIRPF) / brutoConBonus) * 100 : 0;
    const tipoIRPF = brutoConBonus > 0 ? (cuotaIRPF / brutoConBonus) * 100 : 0;

    // ───────────────────────────────────────────
    //  5. COSTE EMPRESA
    // ───────────────────────────────────────────

    const desempleoE = SS_DESEMPLEO_EMPLOYER[contrato];
    const conceptosEmp = [
        { nombre: 'Contingencias comunes', tipo: SS_EMPLOYER.contingenciasComunes },
        { nombre: 'Desempleo (' + contrato + ')', tipo: desempleoE },
        { nombre: 'FOGASA', tipo: SS_EMPLOYER.fogasa },
        { nombre: 'Formación profesional', tipo: SS_EMPLOYER.formacionProfesional },
        { nombre: 'MEI', tipo: SS_EMPLOYER.mei },
        { nombre: 'AT y EP' + (cnaeInfo ? ' (CNAE ' + cnaeInfo.code + ')' : ''), tipo: tipoAT },
    ];

    let totalEmpAnual = 0;
    const detalleEmp = conceptosEmp.map(c => {
        const anual = totalSSbaseAnual * (c.tipo / 100);
        totalEmpAnual += anual;
        return { ...c, anual };
    });
    totalEmpAnual += solidaridad.employer;
    // Only adicional adds cost; flexible is already inside bruto
    const costeTotal = brutoConBonus + totalEmpAnual + totalAdicional;

    // ===========================
    //  RENDER
    // ===========================

    const resultsEl = document.getElementById('results');
    resultsEl.classList.add('show');
    resultsEl.classList.add('has-data');

    // --- 1. SS table (combined worker + employer) ---
    const ssConceptos = [
        { nombre: 'Contingencias comunes', tipoW: SS_WORKER.contingenciasComunes, tipoE: SS_EMPLOYER.contingenciasComunes },
        { nombre: 'Desempleo (' + contrato + ')', tipoW: desempleoW, tipoE: desempleoE },
        { nombre: 'FOGASA', tipoW: 0, tipoE: SS_EMPLOYER.fogasa },
        { nombre: 'Formación profesional', tipoW: SS_WORKER.formacionProfesional, tipoE: SS_EMPLOYER.formacionProfesional },
        { nombre: 'MEI', tipoW: SS_WORKER.mei, tipoE: SS_EMPLOYER.mei },
        { nombre: 'AT y EP' + (cnaeInfo ? ' (CNAE ' + cnaeInfo.code + ')' : ''), tipoW: 0, tipoE: tipoAT },
    ];

    const tbSS = document.getElementById('tbSS');
    const tfSS = document.getElementById('tfSS');
    tbSS.innerHTML = ssConceptos.map(c => {
        const anualW = baseSSmensual * (c.tipoW / 100) * 12;
        const anualE = baseSSmensual * (c.tipoE / 100) * 12;
        const tipoComb = c.tipoW + c.tipoE;
        const anualComb = anualW + anualE;
        const shared = c.tipoW > 0 && c.tipoE > 0;
        const rowCls = shared ? 'ss-shared' : (c.tipoW > 0 ? 'ss-worker-only' : 'ss-employer-only');
        return `<tr class="${rowCls}">` +
            `<td>${c.nombre}</td>` +
            `<td>${fmt(baseSSmensual)} €</td>` +
            `<td>${c.tipoW ? fmtPct(c.tipoW) : '—'}</td>` +
            `<td class="text-right">${c.tipoW ? fmt(anualW) + ' €' : '—'}</td>` +
            `<td>${c.tipoE ? fmtPct(c.tipoE) : '—'}</td>` +
            `<td class="text-right">${c.tipoE ? fmt(anualE) + ' €' : '—'}</td>` +
            `<td>${fmtPct(tipoComb)}</td>` +
            `<td class="text-right">${fmt(anualComb)} €</td>` +
            `</tr>`;
    }).join('');
    if (solidaridad.tramos.length > 0) {
        tbSS.innerHTML += solidaridad.tramos.map(t =>
            `<tr class="ss-solidarity">` +
            `<td>${t.label} <small class="solidarity-note">(base anual: ${fmt(t.base)} €)</small></td>` +
            `<td>—</td>` +
            `<td>${fmtPct(t.tipoW)}</td>` +
            `<td class="text-right">${fmt(t.cuotaWorker)} €</td>` +
            `<td>${fmtPct(t.tipoE)}</td>` +
            `<td class="text-right">${fmt(t.cuotaEmployer)} €</td>` +
            `<td>${fmtPct(t.tipoTotal)}</td>` +
            `<td class="text-right">${fmt(t.cuotaWorker + t.cuotaEmployer)} €</td>` +
            `</tr>`
        ).join('');
        // Subtotal row for Cuota de Solidaridad
        const solSubW = solidaridad.worker;
        const solSubE = solidaridad.employer;
        const solTipoW = solidaridad.tramos.reduce((s, t) => s + t.tipoW, 0);
        const solTipoE = solidaridad.tramos.reduce((s, t) => s + t.tipoE, 0);
        const solTipoTotal = solidaridad.tramos.reduce((s, t) => s + t.tipoTotal, 0);
        tbSS.innerHTML +=
            `<tr class="ss-solidarity ss-solidarity-subtotal">` +
            `<td><strong>Subtotal C. Solidaridad</strong></td>` +
            `<td>—</td>` +
            `<td>${fmtPct(solTipoW)}</td>` +
            `<td class="text-right"><strong>${fmt(solSubW)} €</strong></td>` +
            `<td>${fmtPct(solTipoE)}</td>` +
            `<td class="text-right"><strong>${fmt(solSubE)} €</strong></td>` +
            `<td>${fmtPct(solTipoTotal)}</td>` +
            `<td class="text-right"><strong>${fmt(solSubW + solSubE)} €</strong></td>` +
            `</tr>`;
    }
    const totalCombAnual = totalSSanual + totalEmpAnual;
    const totalWorkerTipo = ssConceptos.reduce((s, c) => s + c.tipoW, 0);
    const totalEmpTipo = ssConceptos.reduce((s, c) => s + c.tipoE, 0);
    const totalCombTipo = totalWorkerTipo + totalEmpTipo;
    const hasSolidaridad = solidaridad.tramos.length > 0;
    document.getElementById('legSolidaridad').style.display = hasSolidaridad ? '' : 'none';
    tfSS.innerHTML = `<tr><td colspan="2">Total${hasSolidaridad ? ' <small class="solidarity-note">(incl. C. Solidaridad)</small>' : ''}</td>` +
        `<td>${fmtPct(totalWorkerTipo)}</td><td class="text-right">${fmt(totalSSanual)} €</td>` +
        `<td>${fmtPct(totalEmpTipo)}</td><td class="text-right">${fmt(totalEmpAnual)} €</td>` +
        `<td>${fmtPct(totalCombTipo)}</td><td class="text-right">${fmt(totalCombAnual)} €</td></tr>`;

    // --- 2. IRPF flow ---
    const flowRows = [
        ['Salario bruto dinerario', bruto, false],
    ];
    if (bonusItems.length > 0) {
        bonusItems.forEach(b => {
            flowRows.push([`+ Bonus puntual (${MESES_LABELS[b.mes - 1]})`, b.importe, false]);
        });
    }
    customItems.filter(i => i.dinerario).forEach(i => {
        flowRows.push([`+ ${i.nombre} (dinerario)`, i.dinerario, false]);
    });

    // ── Especie adicional: employer pays on top ──
    if (totalAdicional > 0) {
        flowRows.push(['+ Especie adicional (total empresa)', totalAdicional, false]);
        // Per-concept breakdown
        if (segMedicoAd > 0)  flowRows.push(['    Seguro médico (ad.)', segMedicoAd, false, true]);
        if (ticketRestAd > 0) flowRows.push(['    Ticket restaurante (ad.)', ticketRestAd, false, true]);
        if (transporteAd > 0) flowRows.push(['    Transporte (ad.)', transporteAd, false, true]);
        customEspecie.filter(i => i.adicional > 0).forEach(i =>
            flowRows.push(['    ' + i.nombre + ' (ad.)', i.adicional, false, true]));

        if (exentaAdicional > 0) {
            flowRows.push(['− Parte exenta especie adicional', -exentaAdicional, false]);
            if (sm.exAd > 0) flowRows.push(['    Seguro médico exento (ad.)', -sm.exAd, false, true]);
            if (tr.exAd > 0) flowRows.push(['    Ticket restaurante exento (ad.)', -tr.exAd, false, true]);
            if (tp.exAd > 0) flowRows.push(['    Transporte exento (ad.)', -tp.exAd, false, true]);
        }
    }

    // ── Especie flexible: from your bruto → exempt part reduces taxable base ──
    if (totalFlexible > 0) {
        if (exentaFlexible > 0) {
            flowRows.push(['− Retrib. flexible exenta (no tributa)', -exentaFlexible, false]);
            if (sm.exFl > 0) flowRows.push(['    Seguro médico exento (fl.)', -sm.exFl, false, true]);
            if (tr.exFl > 0) flowRows.push(['    Ticket restaurante exento (fl.)', -tr.exFl, false, true]);
            if (tp.exFl > 0) flowRows.push(['    Transporte exento (fl.)', -tp.exFl, false, true]);
        }
    }

    flowRows.push(
        ['= Rendimiento íntegro del trabajo', rendIntegro, true],
        ['− Cotizaciones a la Seguridad Social', -totalSSanual, false],
        ['− Otros gastos deducibles (Art. 19.2)', -OTROS_GASTOS, false],
        ['= Rendimiento neto del trabajo', rendNeto, true],
        ['− Reducción por rendimientos del trabajo (Art. 20)', -reduccion, false],
        ['= Base imponible general', baseImponible, true],
        ['= Base liquidable general', baseLiquidable, true],
    );
    if (ahorroFlexible > 0) {
        flowRows.push(['\u2728 Ahorro fiscal por retrib. flexible', ahorroFlexible, true]);
    }
    const tbFlow = document.getElementById('tbFlow');
    tbFlow.replaceChildren();
    flowRows.forEach(([c, v, bold, sub]) => {
        const tr = document.createElement('tr');
        if (v === null) {
            const td = document.createElement('td');
            td.colSpan = 2;
            td.style.color = 'var(--gray-600)';
            td.style.fontStyle = 'italic';
            td.textContent = c;
            tr.appendChild(td);
        } else {
            const td1 = document.createElement('td');
            const td2 = document.createElement('td');
            td2.className = 'text-right';
            if (bold) { td1.style.fontWeight = '700'; td2.style.fontWeight = '700'; }
            if (sub) {
                td1.style.fontSize = '.85rem';
                td1.style.color = 'var(--gray-600)';
                td2.style.fontSize = '.85rem';
                td2.style.color = 'var(--gray-600)';
            }
            if (c.includes('Ahorro fiscal')) {
                td1.style.color = 'var(--accent)';
                td2.style.color = 'var(--accent)';
                td1.style.fontWeight = '700';
                td2.style.fontWeight = '700';
            } else if (v < 0) {
                td2.style.color = 'var(--accent)';
            }
            td1.textContent = c;
            td2.textContent = fmt(v) + ' €';
            tr.appendChild(td1);
            tr.appendChild(td2);
        }
        tbFlow.appendChild(tr);
    });

    // --- 3. Mínimo personal (side-by-side) ---
    const detallesEst = mins.estatal.detalles;
    const detallesAut = mins.autonomico.detalles;
    const rows = Math.max(detallesEst.length, detallesAut.length);
    let minHtml = '';
    for (let i = 0; i < rows; i++) {
        const e = detallesEst[i];
        const a = detallesAut[i];
        minHtml += `<tr><td>${e ? e.c : ''}</td><td class="text-right">${e ? fmt(e.v) + ' €' : ''}</td><td class="text-right">${a ? fmt(a.v) + ' €' : ''}</td></tr>`;
    }
    document.getElementById('tbMin').innerHTML = minHtml;
    document.getElementById('tfMinEst').textContent = fmt(minimoEst) + ' €';
    document.getElementById('tfMinAut').textContent = fmt(minimoAut) + ' €';

    // --- 4 & 5. IRPF brackets ---
    renderBrackets(estBruto.tramos, 'tbEst', 'tfEst', cuotaEstatal);
    renderBrackets(autBruto.tramos, 'tbAut', 'tfAut', cuotaAutonomica);

    // --- 6. IRPF resumen combinado ---
    const tipoEfEst = bruto > 0 ? (cuotaEstatal / bruto * 100) : 0;
    const tipoEfAut = bruto > 0 ? (cuotaAutonomica / bruto * 100) : 0;
    document.getElementById('tbIrpfResumen').innerHTML =
        `<tr><td>Cuota estatal</td><td class="text-right">${fmt(cuotaEstatal)} €</td><td class="text-right">${fmtPct(tipoEfEst)}</td></tr>` +
        `<tr><td>Cuota autonómica (Andalucía)</td><td class="text-right">${fmt(cuotaAutonomica)} €</td><td class="text-right">${fmtPct(tipoEfAut)}</td></tr>`;
    document.getElementById('tfIrpfResumen').innerHTML =
        `<tr><td>Total IRPF</td><td class="text-right">${fmt(cuotaIRPF)} €</td><td class="text-right">${fmtPct(tipoIRPF)}</td></tr>`;

    // --- Pre-compute monthly values (needed by hero cards and monthly view) ---
    const brutoPorPaga = (bruto + customDinAnual) / numPagas;
    const mensualSS = totalSSanual / 12;
    const mensualIRPF = cuotaIRPF / 12;
    const mensualFlex = totalFlexible / 12;
    const netoMesOrdinario = brutoPorPaga - mensualSS - mensualIRPF - mensualFlex;

    // --- 7. Hero cards (annual summary) ---
    const heroData = [
        { lbl: 'Salario bruto anual', val: fmt(bruto) + ' €', cls: '' },
    ];
    if (bonusItems.length > 0) {
        bonusItems.forEach(b => {
            heroData.push({ lbl: `Bonus (${MESES_LABELS[b.mes - 1]})`, val: fmt(b.importe) + ' €', cls: '' });
        });
        heroData.push({ lbl: 'Bruto total (con bonus)', val: fmt(brutoConBonus) + ' €', cls: '' });
    }
    if (totalAdicional > 0) {
        heroData.push({ lbl: 'Especie adicional', val: fmt(totalAdicional) + ' €', cls: '' });
    }
    if (totalFlexible > 0) {
        heroData.push({ lbl: 'Especie flexible (de bruto)', val: fmt(totalFlexible) + ' €', cls: '' });
    }
    if (totalEspecieExenta > 0) {
        heroData.push({ lbl: 'Especie exenta', val: fmt(totalEspecieExenta) + ' €', cls: 'clr-green' });
    }
    heroData.push(
        { lbl: 'Seg. Social trabajador', val: fmt(totalSSanual) + ' €', cls: 'clr-orange' },
        { lbl: 'IRPF total', val: fmt(cuotaIRPF) + ' €', cls: 'clr-red' },
    );
    if (ahorroFlexible > 0) {
        heroData.push({ lbl: 'Ahorro fiscal flexible', val: fmt(ahorroFlexible) + ' €/año', cls: 'clr-green' });
    }
    heroData.push(
        { lbl: 'Salario neto anual', val: fmt(neto) + ' €', cls: 'clr-green' },
        { lbl: 'Neto mes ordinario', val: fmt(netoMesOrdinario) + ' €', cls: 'clr-green' },
        { lbl: 'Tipo efectivo global', val: fmtPct(tipoTotal), cls: 'clr-red' },
        { lbl: 'SS empresa', val: fmt(totalEmpAnual) + ' €', cls: 'clr-orange' },
        { lbl: 'Coste total empresa', val: fmt(costeTotal) + ' €', cls: 'clr-red' },
    );
    // --- Distribute hero data: key metrics → #resultHero, rest → #heroGrid ---
    const heroKeyMap = {};
    ['Salario bruto anual', 'Seg. Social trabajador', 'IRPF total',
     'Coste total empresa', 'Tipo efectivo global', 'Neto mes ordinario',
     'Salario neto anual'].forEach(k => { heroKeyMap[k] = heroData.find(h => h.lbl === k); });
    const otherHeroData = heroData.filter(h => !(h.lbl in heroKeyMap));

    const setHero = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.textContent = val;
    };
    if (heroKeyMap['Salario neto anual']) {
        setHero('resultHeroNetoNum', heroKeyMap['Salario neto anual'].val);
    }
    setHero('resultHeroNetoMes', heroKeyMap['Neto mes ordinario'] && heroKeyMap['Neto mes ordinario'].val);
    if (heroKeyMap['Tipo efectivo global']) {
        setHero('resultHeroTipoEf', heroKeyMap['Tipo efectivo global'].val);
    }
    setHero('resultHeroBruto', heroKeyMap['Salario bruto anual'] && heroKeyMap['Salario bruto anual'].val);
    setHero('resultHeroIrpf', heroKeyMap['IRPF total'] && heroKeyMap['IRPF total'].val);
    setHero('resultHeroSS', heroKeyMap['Seg. Social trabajador'] && heroKeyMap['Seg. Social trabajador'].val);
    setHero('resultHeroCoste', heroKeyMap['Coste total empresa'] && heroKeyMap['Coste total empresa'].val);

    // Flash the neto number
    const heroNumEl = document.getElementById('resultHeroNeto');
    if (heroNumEl) {
        heroNumEl.classList.remove('flash');
        void heroNumEl.offsetWidth;
        heroNumEl.classList.add('flash');
        setTimeout(() => heroNumEl.classList.remove('flash'), 200);
    }

    document.getElementById('heroGrid').innerHTML = otherHeroData.map(h =>
        `<div class="hero-card"><div class="lbl">${h.lbl}</div><div class="val ${h.cls}">${h.val}</div></div>`
    ).join('');


    // --- Monthly view ---
    document.getElementById('monthlyHint').textContent =
        numPagas === 14
            ? 'La Seguridad Social y la retención IRPF se descuentan en 12 mensualidades. Las pagas extra (junio y diciembre) son íntegras (' + fmt(brutoPorPaga) + ' €).'
            : 'Con 12 pagas, todas las deducciones se reparten en cada mensualidad.';

    const mensualSSsinBonus = conceptosSS.reduce((s, c) => s + baseSSmensualSinBonus * (c.tipo / 100), 0);

    const monthItems = [
        { lbl: 'Bruto / paga', val: fmt(brutoPorPaga) + ' €' },
        { lbl: 'SS / mes ordinario', val: fmt(mensualSSsinBonus) + ' €' },
        { lbl: 'IRPF / mes (×12)', val: fmt(mensualIRPF) + ' €' },
    ];
    if (totalFlexible > 0) {
        monthItems.push({ lbl: 'Especie flexible / mes', val: fmt(mensualFlex) + ' €' });
    }
    monthItems.push({ lbl: 'Neto mes ordinario', val: fmt(netoMesOrdinario) + ' €' });

    // Show each month with bonuses or salary adjustments
    const allSpecialMonths = new Set();
    Object.keys(bonusPorMes).forEach(m => allSpecialMonths.add(parseInt(m, 10)));
    Object.keys(salarioPorMes).forEach(m => {
        if (salarioPorMes[m] !== salarioPorMes[m - 1] && m > 1) {
            allSpecialMonths.add(parseInt(m, 10));
        }
    });

    // Per-month precomputation for hero cards and chart. SS is recomputed
    // from the actual monthly base (so salary updates scale SS up/down).
    // IRPF retention is pro-rata by per-paga amount + bonus, distributed over
    // the 12 ordinary months only (extra paga is "íntegra", retention = 0).
    // Sum over 12 ordinary months reconciles to cuotaEstatal + cuotaAutonomica.
    let anualBrutoOrdinario = 0;
    for (let m = 1; m <= 12; m++) {
        const salarioMes = salarioPorMes[m] != null ? salarioPorMes[m] : brutoMensualBase;
        anualBrutoOrdinario += (salarioMes * 12) / numPagas;
    }
    const tipoEst = anualBrutoOrdinario > 0 ? cuotaEstatal / anualBrutoOrdinario : 0;
    const tipoAut = anualBrutoOrdinario > 0 ? cuotaAutonomica / anualBrutoOrdinario : 0;

    const perMonth = {};
    for (let m = 1; m <= 12; m++) {
        const salarioMes = salarioPorMes[m] != null ? salarioPorMes[m] : brutoMensualBase;
        const mesBonus = bonusPorMes[m] || 0;
        const isExtra = numPagas === 14 && (m === 6 || m === 12);
        const brutoPorPagaMes = (salarioMes * 12) / numPagas;
        const pagoMes = isExtra ? brutoPorPagaMes * 2 : brutoPorPagaMes;
        const totalBrutoMes = pagoMes + mesBonus;
        const baseMesSS = Math.min(Math.max(salarioMes + mesBonus, baseMin), baseMax);
        perMonth[m] = {
            ss:       isExtra ? 0 : conceptosSS.reduce((s, c) => s + baseMesSS * (c.tipo / 100), 0),
            irpf_est: isExtra ? 0 : totalBrutoMes * tipoEst,
            irpf_aut: isExtra ? 0 : totalBrutoMes * tipoAut,
            flex:     isExtra ? 0 : mensualFlex,
            pagoMes,
            totalBrutoMes,
        };
    }

    allSpecialMonths.forEach(mes => {
        const salarioMes = salarioPorMes[mes] || brutoMensualBase;
        const mesBonus = bonusPorMes[mes] || 0;
        const pm = perMonth[mes];
        const brutoMes = pm.totalBrutoMes;
        const isExtraPaga = numPagas === 14 && (mes === 6 || mes === 12);
        // Extra paga months skip employee deductions (SS/IRPF/flex).
        const netoMes = isExtraPaga
            ? brutoMes
            : brutoMes - pm.ss - pm.irpf_est - pm.irpf_aut - pm.flex;

        let label = `${MESES_LABELS[mes - 1]} (bruto)`;
        if (mesBonus > 0) label += ` + bonus`;
        if (salarioPorMes[mes] !== salarioPorMes[mes - 1] && mes > 1) label += ` *actualizado*`;

        monthItems.push({ lbl: label, val: fmt(brutoMes) + ' €' });
        monthItems.push({ lbl: `SS ${MESES_LABELS[mes - 1]}`, val: fmt(pm.ss) + ' €' });
        monthItems.push({ lbl: `Neto ${MESES_LABELS[mes - 1]}`, val: fmt(netoMes) + ' €' });
    });

    if (numPagas === 14) {
        monthItems.push({ lbl: 'Paga extra (íntegra)', val: fmt(brutoPorPaga) + ' €' });
    }
    document.getElementById('monthlyGrid').innerHTML = monthItems.map(i =>
        `<div class="hero-card"><div class="lbl">${i.lbl}</div><div class="val">${i.val}</div></div>`
    ).join('');

    // --- 7b. Monthly bar chart (4 view toggle: neto / bruto / total / tax) ---
    renderMonthlyChart(
        salarioPorMes, bonusPorMes, brutoMensualBase, numPagas, perMonth,
        totalEmpAnual / 12,   // mensualEmpSS     (employer SS spread over 12 months)
        totalAdicional / 12   // mensualEspAd     (especie adicional spread over 12 months)
    );

    // --- 8. Pie chart: salary breakdown ---
    if (brutoConBonus > 0) {
        const slices = [
            { label: 'Neto', value: Math.max(neto, 0), color: 'var(--chart-neto)' },
            { label: 'SS trabajador', value: totalSSanual, color: 'var(--chart-ss)' },
            { label: 'IRPF estatal', value: cuotaEstatal, color: 'var(--chart-irpf-est)' },
            { label: 'IRPF autonómico', value: cuotaAutonomica, color: 'var(--chart-irpf-aut)' },
        ];
        renderPie('pieChart', 'pieLegend', slices, brutoConBonus);
    }

    // --- 9. Iceberg diagram ---
    renderIceberg(neto, totalSSanual, cuotaEstatal, cuotaAutonomica, totalEmpAnual, totalAdicional, totalFlexible, costeTotal);

    // Scroll to results only on explicit user action
    if (scroll) document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Allow Enter key
document.getElementById('bruto').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') calcular();
});
document.getElementById('cnae').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') calcular();
});

// Auto-recalculate on any input change (debounced for text fields)
(function () {
    let _timer = null;
    function scheduleCalc() {
        const raw = document.getElementById('bruto').value.replace(/[^\d,.]/g, '');
        if (!raw) return;
        const val = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
        if (!val || val <= 0) return;  // don't recalc on 0 or invalid
        clearTimeout(_timer);
        _timer = setTimeout(calcular, 150);
    }

    // Expose globally for dynamically-added bonus rows
    scheduleCalcGlobal = scheduleCalc;

    // Text / number inputs — debounced
    ['bruto', 'anio', 'cnae'].forEach(id => {
        document.getElementById(id).addEventListener('input', scheduleCalc);
    });

    // Select inputs — immediate
    ['pagas', 'contrato', 'edad', 'discapacidad', 'hijos', 'ascendientes', 'grupo'].forEach(id => {
        document.getElementById(id).addEventListener('change', scheduleCalc);
    });

    // Especie inputs — debounced (delegated on their containers)
    ['espSeguroMedicoAd','espSeguroMedicoFl','espTicketRestAd','espTicketRestFl',
     'espTicketRestAdAnnual','espTicketRestFlAnnual',
     'espTransporteAd','espTransporteFl','espTransporteAdAnnual','espTransporteFlAnnual',
     'espSeguroMedicoBenef'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', scheduleCalc);
    });

    // Custom especie rows — delegate on list container
    document.getElementById('espCustomList').addEventListener('input', scheduleCalc);
    document.getElementById('espCustomList').addEventListener('change', scheduleCalc);
})();

// Monthly chart view toggle (Neto / Bruto / Total / Impuestos).
// Re-renders the chart from cached args — no IRPF recomputation needed.
(function () {
    const toggleEl = document.getElementById('monthlyViewToggle');
    if (!toggleEl) return;
    toggleEl.addEventListener('click', function (e) {
        const btn = e.target.closest('.view-toggle-btn');
        if (!btn || !toggleEl.contains(btn)) return;
        const view = btn.dataset.view;
        if (!view || !MONTHLY_VIEW_LABELS[view]) return;
        if (view === _monthlyChartView) return;
        _monthlyChartView = view;
        toggleEl.querySelectorAll('.view-toggle-btn').forEach(b => {
            const active = b.dataset.view === view;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-selected', active ? 'true' : 'false');
            if (active) {
                b.style.background = 'linear-gradient(135deg,#10b981,#059669)';
                b.style.color = '#fff';
                b.style.border = '1px solid #10b981';
                b.style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
            } else {
                b.style.background = 'var(--bg-subtle)';
                b.style.color = 'var(--text-1)';
                b.style.border = '1px solid var(--border)';
                b.style.boxShadow = 'none';
            }
        });
        updateLegendForView(view);
        if (_monthlyChartArgs) renderMonthlyChart(
            _monthlyChartArgs.salarioPorMes, _monthlyChartArgs.bonusPorMes,
            _monthlyChartArgs.brutoMensualBase, _monthlyChartArgs.numPagas,
            _monthlyChartArgs.perMonth,
            _monthlyChartArgs.mensualEmpSS, _monthlyChartArgs.mensualEspAd
        );
    });
})();
