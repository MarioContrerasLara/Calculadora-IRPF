// Comprehensive Puppeteer test suite for the IRPF calculator JS logic.
// Tests the LIVE page against known-good values for every major
// calculation path. Catches bugs in the JS calculation logic that
// the Python-replica tests (test_irpf.py) cannot detect.
//
// Requires: node tests/test_app.js (from project root)
// The test needs the system libs that Puppeteer's Chrome binary depends on.
// On this machine they're extracted to ~/.local/libs/usr/lib64.

const puppeteer = require('puppeteer');
const CHROME = '/home/mario/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

let passed = 0, failed = 0, skipped = 0;
const failures = [];

function assertClose(actual, expected, tol, label) {
    if (Math.abs(actual - expected) <= tol) {
        passed++;
    } else {
        failed++;
        const msg = `FAIL ${label}: got ${actual.toFixed(2)}, expected ${expected.toFixed(2)} (tol ${tol})`;
        failures.push(msg);
    }
}

function assertTrue(cond, label) {
    if (cond) { passed++; }
    else { failed++; const msg = `FAIL ${label}`; failures.push(msg); }
}

function parseEuro(s) {
    if (!s) return NaN;
    return parseFloat(s.replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.'));
}

async function setInput(page, id, value) {
    await page.evaluate((id, value) => {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, id, value);
    await new Promise(r => setTimeout(r, 100));
}

async function clickButton(page, textMatch) {
    return await page.evaluate((t) => {
        const btns = document.querySelectorAll('button');
        for (const b of btns) {
            if ((b.textContent || '').includes(t)) { b.click(); return true; }
        }
        return false;
    }, textMatch);
}

async function clearAll(page) {
    await page.evaluate(() => {
        // Remove all dynamic rows
        document.querySelectorAll('#bonusList .especie-custom-row').forEach(r => r.remove());
        document.querySelectorAll('#actualizacionList .especie-custom-row').forEach(r => r.remove());
        document.querySelectorAll('#especieCustomList .especie-custom-row').forEach(r => r.remove());
        document.querySelectorAll('#espCustomList .especie-custom-row').forEach(r => r.remove());
        // Clear all especie inputs
        const especieIds = [
            'espSeguroMedicoAd', 'espSeguroMedicoFl',
            'espTicketRestAd', 'espTicketRestFl',
            'espTicketRestAdAnnual', 'espTicketRestFlAnnual',
            'espTransporteAd', 'espTransporteFl',
            'espTransporteAdAnnual', 'espTransporteFlAnnual',
        ];
        especieIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
    });
    await new Promise(r => setTimeout(r, 200));
}

async function getHeroCards(page) {
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.hero-card')).map(c => ({
            lbl: c.querySelector('.lbl')?.textContent?.trim() || '',
            val: c.querySelector('.val')?.textContent?.trim() || ''
        }));
    });
}

async function getChartValues(page) {
    return await page.evaluate(() => {
        const svg = document.getElementById('monthlyChart');
        if (!svg) return [];
        return Array.from(svg.querySelectorAll('text')).map(t => t.textContent.trim());
    });
}

async function clickViewToggle(page, viewName) {
    await page.evaluate((v) => {
        const btns = document.querySelectorAll('.view-toggle-group button, [class*="toggle"] button');
        for (const b of btns) {
            if (b.textContent.trim() === v) { b.click(); return; }
        }
    }, viewName);
    await new Promise(r => setTimeout(r, 300));
}

function chartValForMonth(vals, monthAbbr) {
    const idx = vals.findIndex(t => t === monthAbbr);
    return idx > 0 ? parseEuro(vals[idx - 1]) : NaN;
}

async function runTests() {
    const browser = await puppeteer.launch({
        executablePath: CHROME,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        env: { ...process.env, LD_LIBRARY_PATH: '/home/mario/.local/libs/usr/lib64' }
    });
    const page = await browser.newPage();
    await page.goto('https://mario.gal/', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    // =========================================================
    //  T1: Baseline — 14 pagas, 30000€, no especia, no bonus, no update
    // =========================================================
    console.log('T1: Baseline 14 pagas 30000€');
    await setInput(page, 'bruto', '30000');
    await setInput(page, 'pagas', '14');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    {
        const cards = await getHeroCards(page);
        const netoOrd = cards.find(c => c.lbl.includes('Neto mes ordinario'));
        const extraPaga = cards.find(c => c.lbl.includes('Paga extra'));
        assertClose(parseEuro(netoOrd?.val), 1575.15, 0.05, 'T1.1 Net ordinary month');
        assertClose(parseEuro(extraPaga?.val), 2142.86, 0.02, 'T1.2 Extra paga = brutoPorPaga');

        const chartVals = await getChartValues(page);
        const jan = parseEuro(chartVals[0]);
        const jun = chartValForMonth(chartVals, 'Jun');
        const dic = chartValForMonth(chartVals, 'Dic');
        assertClose(jan, 1575.15, 0.05, 'T1.3 Chart Jan neto');
        assertClose(jun, 4285.71, 0.02, 'T1.4 Chart Jun = 2×brutoPorPaga (no update)');
        assertClose(dic, 4285.71, 0.02, 'T1.5 Chart Dec = 2×brutoPorPaga (no update)');
    }

    // =========================================================
    //  T2: 12 pagas baseline
    // =========================================================
    console.log('T2: Baseline 12 pagas 30000€');
    await setInput(page, 'pagas', '12');
    await new Promise(r => setTimeout(r, 500));
    {
        const chartVals = await getChartValues(page);
        const jan = parseEuro(chartVals[0]);
        // 30000/12 = 2500, - SS 162.50, - IRPF 405.20 = 1932.30
        assertClose(jan, 1932.30, 0.05, 'T2.1 Chart Jan neto (12 pagas)');
    }

    // =========================================================
    //  T3: Salary update — 14 pagas, 30000→36000 in March (day 15)
    //  Critical: verifies per-paga amount uses updated salary
    // =========================================================
    console.log('T3: Salary update 30000→36000 in March (14 pagas)');
    await setInput(page, 'pagas', '14');
    await setInput(page, 'bruto', '30000');
    await clearAll(page);
    await clickButton(page, 'cambio salarial');
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
        const n = document.querySelector('.actualizacion-nuevoSalario');
        const f = document.querySelector('.actualizacion-fecha');
        if (n) { n.value = '36000'; n.dispatchEvent(new Event('input', { bubbles: true })); }
        if (f) { f.value = '2026-03-15'; f.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await new Promise(r => setTimeout(r, 800));
    {
        const chartVals = await getChartValues(page);
        const jan = parseEuro(chartVals[0]);
        const mar = chartValForMonth(chartVals, 'Mar');
        const abr = chartValForMonth(chartVals, 'Abr');
        const jun = chartValForMonth(chartVals, 'Jun');
        const dic = chartValForMonth(chartVals, 'Dic');

        // Before update: Jan/Feb at base 30000, but pro-rata IRPF accounts
        // for the future update (annual gross becomes ~33000, so per-month
        // IRPF retention is higher than pure 30000 baseline). After my fix
        // the chart shows actual neto at the prevailing salary, not the old
        // netoOrdMes + updateDelta hack.
        assertClose(jan, 1534.56, 0.05, 'T3.1 Chart Jan (before update) = actual neto at base 30000');
        // Update month: pro-rata (between old and new)
        assertTrue(mar > jan && mar < abr, `T3.2 Chart Mar pro-rata (${mar.toFixed(2)} between ${jan.toFixed(2)} and ${abr.toFixed(2)})`);
        // After update: actual neto at 36000 (per-paga 2571.43, deductions scale up)
        assertClose(abr, 1841.48, 0.05, 'T3.3 Chart Apr (after update) = actual neto at 36000');
        // Extra paga with NEW salary: 2 × 36000/14 = 5142.86
        assertClose(jun, 5142.86, 0.02, 'T3.4 Chart Jun extra paga = 2×NEW brutoPorPaga');
        assertClose(dic, 5142.86, 0.02, 'T3.5 Chart Dec extra paga = 2×NEW brutoPorPaga');
    }

    // =========================================================
    //  T4: Salary update on day 1 — full month at new salary
    // =========================================================
    console.log('T4: Salary update day 1 of month');
    await clearAll(page);
    await clickButton(page, 'cambio salarial');
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
        const n = document.querySelector('.actualizacion-nuevoSalario');
        const f = document.querySelector('.actualizacion-fecha');
        if (n) { n.value = '36000'; n.dispatchEvent(new Event('input', { bubbles: true })); }
        if (f) { f.value = '2026-04-01'; f.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await new Promise(r => setTimeout(r, 800));
    {
        const chartVals = await getChartValues(page);
        const mar = chartValForMonth(chartVals, 'Mar');
        const abr = chartValForMonth(chartVals, 'Abr');
        // Mar should be base neto (before update), Abr should be new neto
        assertTrue(mar < abr, `T4.1 Mar (${mar.toFixed(2)}) < Abr (${abr.toFixed(2)}) after day-1 update`);
    }

    // =========================================================
    //  T5: Bonus — adds to neto for that specific month
    // =========================================================
    console.log('T5: Bonus adds to per-month neto');
    await setInput(page, 'bruto', '24000');
    await setInput(page, 'pagas', '12');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 300));
    const bonusAdded = await clickButton(page, 'Añadir bonus');
    assertTrue(bonusAdded, 'T5.0 Añadir bonus button found');
    if (bonusAdded) {
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate(() => {
            const imp = document.querySelector('.bonus-importe');
            const mes = document.querySelector('.bonus-mes');
            if (imp) { imp.value = '1000'; imp.dispatchEvent(new Event('input', { bubbles: true })); }
            if (mes) { mes.value = '3'; mes.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        await new Promise(r => setTimeout(r, 800));
        const chartVals = await getChartValues(page);
        const ene = parseEuro(chartVals[0]);
        const mar = chartValForMonth(chartVals, 'Mar');
        // Mar should be higher than Ene by the bonus (1000) minus deductions
        // on the bonus (~210: extra SS + extra IRPF). Old formula kept
        // deductions constant per month; new formula scales deductions with
        // the month's gross, so the bonus is taxed. ~790 is correct.
        assertTrue(mar > ene + 700 && mar < ene + 850, `T5.1 Chart Mar (${mar.toFixed(2)}) > Ene (${ene.toFixed(2)}) + 700-850 (bonus 1000 minus deductions)`);
        // Hero card should show "Bruto total (con bonus)" = 25000
        const cards = await getHeroCards(page);
        const brutoTotal = parseEuro(cards.find(c => c.lbl.includes('Bruto total'))?.val);
        assertClose(brutoTotal, 25000, 0.05, 'T5.2 Hero Bruto total con bonus = 25000');
    }

    // =========================================================
    //  T6: Chart view toggle — all 4 views render correctly
    // =========================================================
    console.log('T6: Chart view toggle (neto/bruto/total/tax)');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    for (const view of ['Neto', 'Bruto', 'Total', 'Impuestos']) {
        await clickViewToggle(page, view);
        const vals = await getChartValues(page);
        assertTrue(vals.length > 12, `T6.${view} view renders (${vals.length} text elements)`);
    }

    // =========================================================
    //  T6: Chart view toggle — all 4 views render correctly
    // =========================================================
    console.log('T6: Chart view toggle (neto/bruto/total/tax)');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    for (const view of ['Neto', 'Bruto', 'Total', 'Impuestos']) {
        await clickViewToggle(page, view);
        const vals = await getChartValues(page);
        assertTrue(vals.length > 12, `T6.${view} view renders (${vals.length} text elements)`);
    }

    // =========================================================
    //  T7: Edad mayor65 reduces IRPF → higher neto
    // =========================================================
    console.log('T7: Edad mayor65 affects neto');
    await setInput(page, 'bruto', '30000');
    await setInput(page, 'pagas', '14');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    {
        const cards1 = await getHeroCards(page);
        const netoSin = parseEuro(cards1.find(c => c.lbl.includes('Neto mes ordinario'))?.val);
        await setInput(page, 'edad', 'mayor65');
        await new Promise(r => setTimeout(r, 500));
        const cards2 = await getHeroCards(page);
        const netoCon = parseEuro(cards2.find(c => c.lbl.includes('Neto mes ordinario'))?.val);
        assertTrue(netoCon > netoSin, `T7.1 Neto with mayor65 (${netoCon.toFixed(2)}) > sin edad (${netoSin.toFixed(2)})`);
        await setInput(page, 'edad', '');
    }

    // =========================================================
    //  T8: Year change — MEI rates differ between 2025 and 2026
    // =========================================================
    console.log('T8: Year change affects SS');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 300));
    await setInput(page, 'anio', '2025');
    await new Promise(r => setTimeout(r, 500));
    const cards2025 = await getHeroCards(page);
    const ss2025 = parseEuro(cards2025.find(c => c.lbl.includes('SS / mes'))?.val);
    await setInput(page, 'anio', '2026');
    await new Promise(r => setTimeout(r, 500));
    const cards2026 = await getHeroCards(page);
    const ss2026 = parseEuro(cards2026.find(c => c.lbl.includes('SS / mes'))?.val);
    assertTrue(ss2026 > ss2025, `T8.1 SS 2026 (${ss2026}) > 2025 (${ss2025}) due to MEI increase`);

    // =========================================================
    //  T9: 12 vs 14 pagas — different ordinario neto
    // =========================================================
    console.log('T9: 12 vs 14 pagas');
    await setInput(page, 'anio', '2025');
    await setInput(page, 'bruto', '30000');
    await clearAll(page);
    await setInput(page, 'pagas', '12');
    await new Promise(r => setTimeout(r, 500));
    const neto12 = parseEuro((await getHeroCards(page)).find(c => c.lbl.includes('Neto mes ordinario'))?.val);
    await setInput(page, 'pagas', '14');
    await new Promise(r => setTimeout(r, 500));
    const neto14 = parseEuro((await getHeroCards(page)).find(c => c.lbl.includes('Neto mes ordinario'))?.val);
    assertTrue(neto14 < neto12, `T9.1 14 pagas neto (${neto14.toFixed(2)}) < 12 pagas (${neto12.toFixed(2)})`);

    // =========================================================
    //  T10: AT y EP — CNAE changes employer SS
    // =========================================================
    console.log('T10: CNAE affects employer SS');
    await setInput(page, 'pagas', '14');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 300));
    const cards10a = await getHeroCards(page);
    const ssEmpSin = parseEuro(cards10a.find(c => c.lbl.includes('SS empresa'))?.val);
    const hasCnae = await page.$('#cnae');
    if (hasCnae) {
        await setInput(page, 'cnae', '4121');
        await new Promise(r => setTimeout(r, 500));
        const cards10b = await getHeroCards(page);
        const ssEmpCon = parseEuro(cards10b.find(c => c.lbl.includes('SS empresa'))?.val);
        assertTrue(ssEmpCon > ssEmpSin, `T10.1 Employer SS with CNAE 4121 (${ssEmpCon}) > sin CNAE (${ssEmpSin})`);
        await setInput(page, 'cnae', '');
    } else {
        skipped++;
        console.log('  SKIP: cnae input not found');
    }

    // =========================================================
    //  T11: Solidaridad — high salary triggers solidarity quota
    // =========================================================
    console.log('T11: Solidaridad at high salary');
    await setInput(page, 'bruto', '60000');
    await setInput(page, 'pagas', '14');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    {
        const cards = await getHeroCards(page);
        const ssMes = parseEuro(cards.find(c => c.lbl.includes('SS / mes'))?.val);
        assertTrue(ssMes > 300, `T11.1 SS at 60000€ (${ssMes}) is high (solidaridad + base SS)`);
    }

    // =========================================================
    //  T12: Discapacidad increases mínimo → reduces IRPF
    // =========================================================
    console.log('T12: Discapacidad reduces IRPF');
    await setInput(page, 'bruto', '30000');
    await setInput(page, 'pagas', '14');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    {
        const cards1 = await getHeroCards(page);
        const irpfSin = parseEuro(cards1.find(c => c.lbl.includes('IRPF / mes'))?.val);
        await setInput(page, 'discapacidad', '33');
        await new Promise(r => setTimeout(r, 500));
        const cards2 = await getHeroCards(page);
        const irpfCon = parseEuro(cards2.find(c => c.lbl.includes('IRPF / mes'))?.val);
        assertTrue(irpfCon < irpfSin, `T12.1 IRPF with discapacidad 33% (${irpfCon}) < sin (${irpfSin})`);
        await setInput(page, 'discapacidad', '');
    }

    // =========================================================
    //  T13: Hijos increases mínimo → reduces IRPF
    // =========================================================
    console.log('T13: Hijos reduces IRPF');
    await setInput(page, 'bruto', '30000');
    await setInput(page, 'pagas', '14');
    await clearAll(page);
    await new Promise(r => setTimeout(r, 500));
    {
        const cards1 = await getHeroCards(page);
        const irpfSin = parseEuro(cards1.find(c => c.lbl.includes('IRPF / mes'))?.val);
        await setInput(page, 'hijos', '2');
        await new Promise(r => setTimeout(r, 500));
        const cards2 = await getHeroCards(page);
        const irpfCon = parseEuro(cards2.find(c => c.lbl.includes('IRPF / mes'))?.val);
        assertTrue(irpfCon < irpfSin, `T13.1 IRPF with 2 hijos (${irpfCon}) < sin hijos (${irpfSin})`);
        await setInput(page, 'hijos', '0');
    }

    await browser.close();

    console.log('\n========================================');
    console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    if (failed > 0) {
        console.log('\nFAILURES:');
        failures.forEach(f => console.log(f));
        process.exit(1);
    }
}

runTests().catch(e => { console.error('Error:', e.message); console.error(e.stack); process.exit(1); });
