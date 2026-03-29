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

// Bases de cotización mensuales 2025
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

const fmt = n => n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});
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
        path.setAttribute('fill', s.color);
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

function renderIceberg(neto, ssWorker, irpfEst, irpfAut, ssEmp, espAdicional, espFlexible, costeTotal) {
    if (costeTotal <= 0) return;

    const workerTax = ssWorker + irpfEst + irpfAut + espFlexible;
    const employerTax = ssEmp + espAdicional;
    const totalTax = workerTax + employerTax;
    const netoClean = Math.max(neto, 0);
    const realRate = costeTotal > 0 ? (totalTax / costeTotal * 100) : 0;
    const brutoVisible = netoClean + workerTax;
    const apparentRate = brutoVisible > 0 ? (workerTax / brutoVisible * 100) : 0;

    // ── Iceberg SVG: set underwater body rects ──
    const workerPct = totalTax > 0 ? (workerTax / totalTax) : 0.5;
    const bodyTop = 195, bodyBot = 440;
    const splitY = Math.round(bodyTop + workerPct * (bodyBot - bodyTop));

    const wRect = document.getElementById('iceWorkerRect');
    wRect.setAttribute('y', bodyTop);
    wRect.setAttribute('height', splitY - bodyTop);

    const eRect = document.getElementById('iceEmployerRect');
    eRect.setAttribute('y', splitY);
    eRect.setAttribute('height', bodyBot - splitY);

    // ── Position labels dynamically at zone midpoints ──
    // Compute iceberg edge at a given SVG Y
    const L = [[20,195],[10,220],[6,260],[10,300],[22,340],[44,375],[75,405],[110,425],[150,440]];
    const R = [[280,195],[290,220],[294,260],[290,300],[278,340],[256,375],[225,405],[190,425],[150,440]];
    function iceEdge(svgY) {
        if (svgY <= 195) {
            const t = svgY / 195;
            return [150 - 130 * t, 150 + 130 * t];
        }
        function interp(pts, y) {
            for (let i = 0; i < pts.length - 1; i++) {
                if (y >= pts[i][1] && y <= pts[i+1][1]) {
                    const f = (y - pts[i][1]) / (pts[i+1][1] - pts[i][1]);
                    return pts[i][0] + f * (pts[i+1][0] - pts[i][0]);
                }
            }
            return pts[pts.length - 1][0];
        }
        return [interp(L, svgY), interp(R, svgY)];
    }

    // Zone midpoints in SVG Y coords
    const netMidSvgY    = (0 + bodyTop) / 2;
    const workerMidSvgY = (bodyTop + splitY) / 2;
    const empMidSvgY    = (splitY + bodyBot) / 2;

    // Get actual rendered positions using getBoundingClientRect
    const svgEl    = document.querySelector('.ice-svg');
    const sceneEl  = document.querySelector('.ice-scene');
    const svgRect  = svgEl.getBoundingClientRect();
    const sceneRect = sceneEl.getBoundingClientRect();
    const svgRelL  = svgRect.left - sceneRect.left;
    const sx       = svgRect.width / 300;
    const sy       = svgRect.height / 440;
    const svgRelT  = svgRect.top - sceneRect.top;
    const sceneW   = sceneRect.width;
    const sceneH   = sceneRect.height;

    // Convert SVG Y to scene-relative px
    function scenePx(svgY) { return svgRelT + svgY * sy; }

    // Set vertical positions (as %)
    const netEl  = document.getElementById('iceZoneNet');
    const wrkEl  = document.getElementById('iceZoneEmployee');
    const empEl  = document.getElementById('iceZoneEmployer');

    // Amount and connector on the same line, description below
    // Left labels: [amount ·····•]  |  Right label: [•····· amount]
    netEl.innerHTML =
        `<div class="ice-row"><span class="ice-val">€ ${fmt(netoClean)}</span><span class="ice-connector"><span class="ice-connector-dot"></span></span></div>` +
        `<div class="ice-lbl-text">Pago neto</div>`;

    wrkEl.innerHTML =
        `<div class="ice-row"><span class="ice-val">€ ${fmt(workerTax)}</span><span class="ice-connector"><span class="ice-connector-dot"></span></span></div>` +
        `<div class="ice-lbl-text">Impuestos pagados<br>por ti</div>`;

    empEl.innerHTML =
        `<div class="ice-row"><span class="ice-connector"><span class="ice-connector-dot"></span></span><span class="ice-val">€ ${fmt(employerTax)}</span></div>` +
        `<div class="ice-lbl-text">Impuestos pagados<br>por tu empleador</div>`;

    // Position so the ice-row (amount+connector) aligns with zone midpoint
    const netTargetPx = scenePx(netMidSvgY);
    const wrkTargetPx = scenePx(workerMidSvgY);
    const empTargetPx = scenePx(empMidSvgY);

    // Offset by half the row height so the connector line sits at midpoint
    const rowH = netEl.querySelector('.ice-row').offsetHeight;
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

    // Summary cards
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
}

// =============================================================
//  RETRIBUCIÓN EN ESPECIE — CONCEPTOS DINÁMICOS
// =============================================================

let espCustomCounter = 0;

function addEspecieCustom() {
    espCustomCounter++;
    const row = document.createElement('div');
    row.className = 'especie-custom-row';
    row.id = 'espCustomRow' + espCustomCounter;
    row.innerHTML =
        '<input type="text" class="especie-custom-name" placeholder="Nombre (ej: Teletrabajo)" autocomplete="off">' +
        '<span class="especie-custom-tag especie-dual-tag tag-adicional">Ad.</span>' +
        '<input type="text" class="especie-custom-ad" placeholder="€/mes" inputmode="decimal" autocomplete="off">' +
        '<span class="especie-custom-tag especie-dual-tag tag-flexible">Fl.</span>' +
        '<input type="text" class="especie-custom-fl" placeholder="€/mes" inputmode="decimal" autocomplete="off">' +
        '<button type="button" class="btn-remove-especie" onclick="removeEspecieCustom(this)" title="Eliminar">✕</button>';
    document.getElementById('espCustomList').appendChild(row);
    row.querySelector('.especie-custom-name').focus();
}

function removeEspecieCustom(btn) {
    btn.closest('.especie-custom-row').remove();
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
        const ad = parseRawEuro(row.querySelector('.especie-custom-ad').value) * 12;
        const fl = parseRawEuro(row.querySelector('.especie-custom-fl').value) * 12;
        if (ad <= 0 && fl <= 0) return;
        items.push({ nombre: name || 'Concepto en especie', adicional: ad, flexible: fl });
    });
    return items;
}

// =============================================================
//  CÁLCULO PRINCIPAL
// =============================================================

function calcular(scroll = false) {
    // Parse input — accept both "30.000" and "30000,50" formats
    const raw = document.getElementById('bruto').value.replace(/[^\d,.\-]/g, '');
    let norm = raw;
    if (raw.includes(',')) {
        norm = raw.replace(/\./g, '').replace(',', '.');
    }
    const bruto = parseFloat(norm);
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

    const ticketRestAd = parseEuro('espTicketRestAd') * 12;
    const ticketRestFl = parseEuro('espTicketRestFl') * 12;
    const espTicketRest = ticketRestAd + ticketRestFl;

    let transporteAd = parseEuro('espTransporteAd') * 12;
    let transporteFl = parseEuro('espTransporteFl') * 12;
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
    const customAdicional = customItems.reduce((s, i) => s + i.adicional, 0);
    const customFlexible  = customItems.reduce((s, i) => s + i.flexible, 0);

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
    const baseSSmensual = Math.min(Math.max(bruto / 12, baseMin), baseMax);

    const desempleoW = SS_DESEMPLEO_WORKER[contrato];
    const conceptosSS = [
        { nombre: 'Contingencias comunes', tipo: SS_WORKER.contingenciasComunes },
        { nombre: 'Desempleo (' + contrato + ')', tipo: desempleoW },
        { nombre: 'Formación profesional', tipo: SS_WORKER.formacionProfesional },
        { nombre: 'MEI', tipo: SS_WORKER.mei },
    ];

    let totalSSanual = 0;
    const detalleSS = conceptosSS.map(c => {
        const anual = baseSSmensual * (c.tipo / 100) * 12;
        totalSSanual += anual;
        return { ...c, base: baseSSmensual, anual };
    });

    // ───────────────────────────────────────────
    //  2. IRPF — Determinación de base liquidable
    // ───────────────────────────────────────────

    // Adicional gravada adds ON TOP of bruto; flexible exenta reduces taxable base (already in bruto)
    const rendIntegro = bruto + gravadaAdicional - exentaFlexible;
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
    if (bruto <= SMI_ANUAL) {
        cuotaEstatal = 0;
        cuotaAutonomica = 0;
        cuotaIRPF = 0;
    }

    // ───────────────────────────────────────────
    //  3b. Ahorro fiscal por retribución flexible
    // ───────────────────────────────────────────

    let ahorroFlexible = 0;
    if (exentaFlexible > 0 && bruto > SMI_ANUAL) {
        // Recalculate IRPF as if no flexible exemption existed
        const rendIntSinFlex = bruto + gravadaAdicional;
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
    const neto = bruto - totalFlexible - totalSSanual - cuotaIRPF;
    const tipoTotal = bruto > 0 ? ((totalSSanual + cuotaIRPF) / bruto) * 100 : 0;
    const tipoIRPF = bruto > 0 ? (cuotaIRPF / bruto) * 100 : 0;

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
        const anual = baseSSmensual * (c.tipo / 100) * 12;
        totalEmpAnual += anual;
        return { ...c, anual };
    });
    // Only adicional adds cost; flexible is already inside bruto
    const costeTotal = bruto + totalEmpAnual + totalAdicional;

    // ===========================
    //  RENDER
    // ===========================

    document.getElementById('results').classList.add('show');

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
    const totalCombAnual = totalSSanual + totalEmpAnual;
    const totalWorkerTipo = ssConceptos.reduce((s, c) => s + c.tipoW, 0);
    const totalEmpTipo = ssConceptos.reduce((s, c) => s + c.tipoE, 0);
    const totalCombTipo = totalWorkerTipo + totalEmpTipo;
    tfSS.innerHTML = `<tr><td colspan="2">Total</td>` +
        `<td>${fmtPct(totalWorkerTipo)}</td><td class="text-right">${fmt(totalSSanual)} €</td>` +
        `<td>${fmtPct(totalEmpTipo)}</td><td class="text-right">${fmt(totalEmpAnual)} €</td>` +
        `<td>${fmtPct(totalCombTipo)}</td><td class="text-right">${fmt(totalCombAnual)} €</td></tr>`;

    // --- 2. IRPF flow ---
    const flowRows = [
        ['Salario bruto dinerario', bruto, false],
    ];

    // ── Especie adicional: employer pays on top ──
    if (totalAdicional > 0) {
        flowRows.push(['+ Especie adicional (total empresa)', totalAdicional, false]);
        // Per-concept breakdown
        if (segMedicoAd > 0)  flowRows.push(['    Seguro médico (ad.)', segMedicoAd, false, true]);
        if (ticketRestAd > 0) flowRows.push(['    Ticket restaurante (ad.)', ticketRestAd, false, true]);
        if (transporteAd > 0) flowRows.push(['    Transporte (ad.)', transporteAd, false, true]);
        customItems.filter(i => i.adicional > 0).forEach(i =>
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
    document.getElementById('tbFlow').innerHTML = flowRows.map(([c, v, bold, sub]) => {
        const bs = bold ? 'font-weight:700' : '';
        const ss = sub ? 'font-size:.85rem;color:var(--gray-600)' : '';
        if (v === null) return `<tr><td style="color:var(--gray-600);font-style:italic" colspan="2">${c}</td></tr>`;
        const isAhorro = c.includes('Ahorro fiscal');
        const cs = isAhorro ? 'color:var(--brand);font-weight:700' : (v < 0 ? 'color:var(--accent)' : '');
        return `<tr><td style="${bs};${ss}">${c}</td><td class="text-right" style="${bs};${cs};${ss}">${fmt(v)} €</td></tr>`;
    }).join('');

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
    const brutoPorPaga = bruto / numPagas;
    const mensualSS = totalSSanual / 12;
    const mensualIRPF = cuotaIRPF / 12;
    const mensualFlex = totalFlexible / 12;
    const netoMesOrdinario = brutoPorPaga - mensualSS - mensualIRPF - mensualFlex;

    // --- 7. Hero cards (annual summary) ---
    const heroData = [
        { lbl: 'Salario bruto', val: fmt(bruto) + ' €', cls: '' },
    ];
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
    document.getElementById('heroGrid').innerHTML = heroData.map(h =>
        `<div class="hero-card"><div class="lbl">${h.lbl}</div><div class="val ${h.cls}">${h.val}</div></div>`
    ).join('');

    // --- Monthly view ---

    document.getElementById('monthlyHint').textContent =
        numPagas === 14
            ? 'La Seguridad Social y la retención IRPF se descuentan en 12 mensualidades. Las pagas extra (junio y diciembre) son íntegras (' + fmt(brutoPorPaga) + ' €).'
            : 'Con 12 pagas, todas las deducciones se reparten en cada mensualidad.';

    const monthItems = [
        { lbl: 'Bruto / paga', val: fmt(brutoPorPaga) + ' €' },
        { lbl: 'SS / mes (×12)', val: fmt(mensualSS) + ' €' },
        { lbl: 'IRPF / mes (×12)', val: fmt(mensualIRPF) + ' €' },
    ];
    if (totalFlexible > 0) {
        monthItems.push({ lbl: 'Especie flexible / mes', val: fmt(mensualFlex) + ' €' });
    }
    monthItems.push({ lbl: 'Neto mes ordinario', val: fmt(netoMesOrdinario) + ' €' });
    if (numPagas === 14) {
        monthItems.push({ lbl: 'Paga extra (íntegra)', val: fmt(brutoPorPaga) + ' €' });
    }
    document.getElementById('monthlyGrid').innerHTML = monthItems.map(i =>
        `<div class="hero-card"><div class="lbl">${i.lbl}</div><div class="val">${i.val}</div></div>`
    ).join('');

    // --- 8. Pie chart: salary breakdown ---
    if (bruto > 0) {
        const slices = [
            { label: 'Neto', value: Math.max(neto, 0), color: 'var(--brand)' },
            { label: 'SS trabajador', value: totalSSanual, color: 'var(--orange)' },
            { label: 'IRPF estatal', value: cuotaEstatal, color: 'var(--blue)' },
            { label: 'IRPF autonómico', value: cuotaAutonomica, color: 'var(--accent)' },
        ];
        renderPie('pieChart', 'pieLegend', slices, bruto);
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
        _timer = setTimeout(calcular, 400);
    }

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
     'espTransporteAd','espTransporteFl','espSeguroMedicoBenef'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', scheduleCalc);
    });

    // Custom especie rows — delegate on list container
    document.getElementById('espCustomList').addEventListener('input', scheduleCalc);
    document.getElementById('espCustomList').addEventListener('change', scheduleCalc);
})();
