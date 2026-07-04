const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/mario/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://mario.gal/', { waitUntil: 'networkidle0' });
  // Click Mensual tab
  await page.click('button[data-tab="mensual"]');
  await page.waitForTimeout(1000);
  // Screenshot the legend
  const legend = await page.$('#monthlyChartLegend');
  if (legend) {
    await legend.screenshot({ path: '/tmp/legend_shot.png' });
    console.log('screenshot saved');
  } else {
    console.log('legend not found');
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
