import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
const errs = [];
for (const [name, vp] of [['phone320', { width: 320, height: 640 }], ['phone390', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]]) {
  const p = await (await b.newContext({ viewport: vp, hasTouch: true })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:4173');
  await p.waitForSelector('[data-testid=tableau]');
  const init = await p.evaluate(() => ({
    cols: [...document.querySelectorAll('[data-testid=tableau-column]')].map((c) => +c.dataset.count),
    faceUpPerCol: [...document.querySelectorAll('[data-testid=tableau-column]')].map((c) => c.querySelectorAll('[data-testid=card-face]').length),
    source: +document.querySelector('[data-testid=source]').dataset.count,
    draft: +document.querySelector('[data-testid=draft]').dataset.count,
    found: document.querySelectorAll('[data-testid=foundation]').length,
    score: document.querySelector('[data-testid=score]').textContent,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    order: ['header', 'piles', 'foundations', 'tableau'].map((t) => Math.round(document.querySelector(`[data-testid=${t}]`).getBoundingClientRect().top)),
  }));
  console.log(name, JSON.stringify(init));
  if (name === 'phone390') {
    const seq = async () => {
      const out = [];
      for (let i = 0; i < 56; i++) { await p.click('[data-testid=source]'); out.push(await p.locator('[data-testid=draft] [data-testid=card-face]').getAttribute('data-card-id')); }
      return out;
    };
    const first = await seq();
    const emptySlot = await p.evaluate(() => document.querySelectorAll('[data-testid=source] [data-testid=card-back]').length);
    await p.click('[data-testid=source]');
    const afterRecycle = await p.evaluate(() => [+document.querySelector('[data-testid=source]').dataset.count, +document.querySelector('[data-testid=draft]').dataset.count]);
    const second = await seq();
    console.log('source empty after 56 draws:', emptySlot === 0, '| recycle ->', afterRecycle, '| same order again:', JSON.stringify(first) === JSON.stringify(second), '| unique:', new Set(first).size);
  }
  await p.screenshot({ path: `/home/joezen777/s8-${name}.png` });
}
console.log('console/page errors:', errs);
await b.close();
