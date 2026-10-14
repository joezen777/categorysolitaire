import { chromium } from 'playwright-core';
const exe = process.argv[2];
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const errors = [];
for (const [w, h] of [[360, 740], [390, 844], [768, 1024], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', (m) => m.type() === 'error' && errors.push(`${w}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.goto('http://localhost:4173');
  await page.waitForSelector('[data-testid=score]');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(w, 'overflowX', overflow);
  await page.screenshot({ path: `/tmp/pw/s${w}.png`, fullPage: true });
  await page.close();
}
console.log('errors', errors);
await browser.close();
