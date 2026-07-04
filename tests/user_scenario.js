// User's test scenario:
// - Salary: 21,000€
// - Actualización salarial: 30,500€ at 1 May
// - Bonus January: 300€
// - Bonus March: 2,500€
//
// Evaluates all hero cards and per-month chart values.

const puppeteer = require('puppeteer');
const CHROME = '/home/mario/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome';

function parseEuro(s) {
    if (!s) return NaN;
    return parseFloat(s.replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.'));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    env: { ...process.env, LD_LIBRARY_PATH: '/home/mario/.local/libs/usr/lib64' }
  });
  const page = await browser.newPage();
  await page.goto('https://mario.gal/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  async function setInput(id, value) {
    await page.evaluate((id, value) => {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, id, value);
    await new Promise(r => setTimeout(r, 100));
  }
  async function clickButton(text) {
    return await page.evaluate((t) => {
      const btns = document.querySelectorAll('button');
      for (const b of btns) { if ((b.textContent || '').includes(t)) { b.click(); return true; } }
      return false;
    }, text);
  }
  async function clearAll() {
    await page.evaluate(() => {
      document.querySelectorAll('#bonusList .especie-custom-row').forEach(r => r.remove());
      document.querySelectorAll('#actualizacionList .especie-custom-row').forEach(r => r.remove());
      document.querySelectorAll('#especieCustomList .especie-custom-row').forEach(r => r.remove());
      document.querySelectorAll('#espCustomList .especie-custom-row').forEach(r => r.remove());
      ['espSeguroMedicoAd','espSeguroMedicoFl','espTicketRestAd','espTicketRestFl',
       'espTicketRestAdAnnual','espTicketRestFlAnnual','espTransporteAd','espTransporteFl',
       'espTransporteAdAnnual','espTransporteFlAnnual'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    });
    await new Promise(r => setTimeout(r, 200));
  }
  async function dump() {
    const cards = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.hero-card')).map(c => ({
        lbl: c.querySelector('.lbl')?.textContent?.trim() || '',
        val: c.querySelector('.val')?.textContent?.trim() || ''
      }))
    );
    const chartVals = await page.evaluate(() => {
      const svg = document.getElementById('monthlyChart');
      if (!svg) return [];
      return Array.from(svg.querySelectorAll('text')).map(t => t.textContent.trim());
    });
    const monthData = [];
    for (let i = 0; i < chartVals.length; i++) {
      if (['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].includes(chartVals[i])) {
        monthData.push({ month: chartVals[i], value: chartVals[i-1], badge: chartVals[i+1] || '' });
      }
    }
    return { cards, monthData };
  }

  // === SETUP ===
  console.log('Setting up: 21000€, 14 pagas, update to 30500 at 1 May, bonus 300 Jan, bonus 2500 Mar');
  await clearAll();
  await setInput('bruto', '21000');
  await setInput('pagas', '14');
  await new Promise(r => setTimeout(r, 300));

  // Add salary update
  await clickButton('Añadir cambio salarial');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const rows = document.querySelectorAll('#actualizacionList .especie-custom-row');
    const row = rows[rows.length - 1];
    const n = row.querySelector('.actualizacion-nuevoSalario');
    const f = row.querySelector('.actualizacion-fecha');
    if (n) { n.value = '30500'; n.dispatchEvent(new Event('input', { bubbles: true })); }
    if (f) { f.value = '2026-05-01'; f.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 500));

  // Add bonus January 300
  await clickButton('Añadir bonus');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const rows = document.querySelectorAll('#bonusList .especie-custom-row');
    const row = rows[rows.length - 1];
    const imp = row.querySelector('.bonus-importe');
    const mes = row.querySelector('.bonus-mes');
    if (imp) { imp.value = '300'; imp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (mes) { mes.value = '1'; mes.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 300));

  // Add bonus March 2500
  await clickButton('Añadir bonus');
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const rows = document.querySelectorAll('#bonusList .especie-custom-row');
    const row = rows[rows.length - 1];
    const imp = row.querySelector('.bonus-importe');
    const mes = row.querySelector('.bonus-mes');
    if (imp) { imp.value = '2500'; imp.dispatchEvent(new Event('input', { bubbles: true })); }
    if (mes) { mes.value = '3'; mes.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await new Promise(r => setTimeout(r, 1000));

  // === RESULTS ===
  const d = await dump();

  console.log('\n=== HERO CARDS ===');
  d.cards.forEach(c => console.log(`  ${c.lbl} = ${c.val}`));

  console.log('\n=== CHART PER-MONTH NETO ===');
  d.monthData.forEach(m => console.log(`  ${m.month}: ${m.value} ${m.badge ? '(' + m.badge + ')' : ''}`));

  // === EVALUATION ===
  console.log('\n=== EVALUATION ===');

  // Expected bruto total: 21000 * 4/12 + 30500 * 8/12 + 300 + 2500
  // = 7000 + 20333.33 + 2800 = 30133.33
  const brutoEsperado = (21000 * 4 / 12) + (30500 * 8 / 12) + 300 + 2500;
  console.log(`Expected bruto total: ${brutoEsperado.toFixed(2)} (21000×4/12 + 30500×8/12 + 300 + 2500)`);

  const brutoTotalCard = d.cards.find(c => c.lbl.includes('Bruto total'));
  const brutoTotalVal = parseEuro(brutoTotalCard?.val);
  console.log(`Actual bruto total: ${brutoTotalVal.toFixed(2)} ${Math.abs(brutoTotalVal - brutoEsperado) < 1 ? '✓' : '✗ MISMATCH'}`);

  // SS evaluation
  console.log('\n=== SS EVALUATION ===');
  const ssMesCard = d.cards.find(c => c.lbl.includes('SS / mes ordinario'));
  const ssMesVal = parseEuro(ssMesCard?.val);
  // Expected: per-month SS bases: Jan=2050, Feb=1750, Mar=4250, Apr=1750, May-Dec=2541.67
  // Total SS base = 2050+1750+4250+1750+8*2541.67 = 30133.33
  // Worker SS rate ≈ 6.48% (CC 4.70 + Desempleo 1.55 + FP 0.10 + MEI 0.13)
  // Total SS = 30133.33 * 0.0648 = 1952.64
  // Average SS = 1952.64 / 12 = 162.72
  const ssEsperado = 162.72;
  console.log(`Expected SS/mes (average): ${ssEsperado.toFixed(2)} (total base 30133 × 6.48% / 12)`);
  console.log(`Actual SS/mes ordinario: ${ssMesVal.toFixed(2)} ${Math.abs(ssMesVal - ssEsperado) < 2 ? '✓' : '✗ WRONG'}`);
  console.log(`  (If actual ≈ 113.75, it's using base salary only, NOT accounting for the update)`);

  // IRPF evaluation
  const irpfCard = d.cards.find(c => c.lbl.includes('IRPF / mes'));
  const irpfVal = parseEuro(irpfCard?.val);
  console.log(`\nIRPF/mes: ${irpfVal.toFixed(2)} (this is the average, should be based on bruto total)`);

  // Neto evaluation
  const netoCard = d.cards.find(c => c.lbl.includes('Neto mes ordinario'));
  const netoVal = parseEuro(netoCard?.val);
  console.log(`\nNeto mes ordinario: ${netoVal.toFixed(2)}`);
  console.log(`  Expected: 1500 - ${ssEsperado.toFixed(2)} - ${irpfVal.toFixed(2)} = ${(1500 - ssEsperado - irpfVal).toFixed(2)}`);

  // Chart evaluation
  console.log('\n=== CHART EVALUATION ===');
  const ene = d.monthData.find(m => m.month === 'Ene');
  const mar = d.monthData.find(m => m.month === 'Mar');
  const may = d.monthData.find(m => m.month === 'May');
  const jun = d.monthData.find(m => m.month === 'Jun');

  console.log(`Jan: ${ene?.value}`);
  console.log(`Mar: ${mar?.value}`);
  console.log(`May: ${may?.value}`);
  console.log(`Jun: ${jun?.value}`);

  // Jun extra paga = 2 × 30500/14
  const junEsperado = 2 * 30500 / 14;
  const junActual = parseEuro(jun?.value);
  console.log(`\nJun extra paga expected: ${junEsperado.toFixed(2)} (2× 30500/14)`);
  console.log(`Jun extra paga actual: ${junActual.toFixed(2)} ${Math.abs(junActual - junEsperado) < 1 ? '✓' : '✗ MISMATCH'}`);

  // Hero card Mayo vs chart Mayo
  const mayoCard = d.cards.find(c => c.lbl.includes('Mayo') && c.lbl.includes('Neto'));
  const mayoHeroVal = parseEuro(mayoCard?.val);
  const mayoChartVal = parseEuro(may?.value);
  console.log(`\nMayo hero neto: ${mayoHeroVal.toFixed(2)}`);
  console.log(`Mayo chart neto: ${mayoChartVal.toFixed(2)}`);
  if (Math.abs(mayoHeroVal - mayoChartVal) > 5) {
    console.log(`  ✗ MISMATCH: hero and chart disagree by ${(mayoHeroVal - mayoChartVal).toFixed(2)}`);
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
