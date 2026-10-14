import { chromium } from '/tmp/pwcheck/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe });
const widths = [[360, 740, true], [390, 844, true], [768, 1024, true], [1440, 900, false]];
for (const [w, h, touch] of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/pwscripts/shot-${w}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(w, 'overflowX', overflow, 'errors', errors);
  await ctx.close();
}
await browser.close();
