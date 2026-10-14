import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4173');
await page.waitForSelector('[data-testid=score]');
// draw until a tableau card lands in the same column to make a stack is hard; instead inspect any face-up peek via forced style
const info = await page.evaluate(() => {
  const b = document.querySelector('[aria-label="Column 5"] button');
  const span = b.querySelector('span');
  const cs = getComputedStyle(span); const cb = getComputedStyle(b);
  return { html: b.outerHTML.slice(0, 300), color: cb.color, fs: cs.fontSize, h: b.getBoundingClientRect().height };
});
console.log(info);
await browser.close();
