import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
await p.addInitScript(() => { window.__osc = 0; const o = AudioContext.prototype.createOscillator; AudioContext.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5199');
await p.click('[data-testid=source]'); // draw
// illegal move: tap a face-up card then a foundation slot (empty slot needs a title)
const cards = p.locator('[data-testid=tableau-column] [data-testid=card-face]');
for (let i = 0; i < 5; i++) {
  const c = p.locator('[data-testid=tableau-column]').nth(i).locator('[data-testid=card-face]').last();
  if (await c.locator('xpath=.').evaluate((e) => e.dataset.cardId.startsWith('title:'))) continue;
  await c.click(); await p.locator('[data-testid=foundation]').first().click(); break;
}
await p.waitForTimeout(300);
console.log('oscillators after illegal move:', await p.evaluate(() => window.__osc), 'alert', await p.locator('[data-testid=illegal-move]').count());
await p.click('[data-testid=menu-button]'); await p.screenshot({ path: '/home/joezen777/s7-menu.png' });
await p.getByText('Turn sound off').click(); await p.waitForTimeout(300);
await p.getByText('Quit').count();
await p.click('[data-testid=menu-button]'); await p.getByText('Quit').click();
console.log('quit screen', await p.locator('[data-testid=quit-screen]').count()); await p.screenshot({ path: '/home/joezen777/s7-quit.png' });
await p.getByText('Start New Game').click();
console.log('score', await p.locator('[data-testid=score]').textContent(), 'errors', errs);
await b.close();
