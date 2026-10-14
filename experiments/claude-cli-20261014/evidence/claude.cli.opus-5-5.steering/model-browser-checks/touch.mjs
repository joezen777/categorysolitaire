import { chromium } from '/tmp/pwcheck/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/');
await page.waitForTimeout(400);
const cdp = await ctx.newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const stock = page.locator('button[aria-label^="Source deck"]');
const draftTop = page.locator('[aria-label*="top of draft pile"]');
for (let i = 0; i < 60; i++) {
  await stock.tap();
  if (await draftTop.count() && (await draftTop.getAttribute('aria-label')).includes('title card')) break;
}
console.log('draft:', await draftTop.getAttribute('aria-label'));
// quick tap selects, does not drag
await draftTop.tap();
console.log('tap status:', (await page.getByRole('status').first().innerText()).replace(/\s+/g, ' '));
await draftTop.tap(); // deselect
// long-press drag to slot 1
const s = await draftTop.boundingBox();
const d = await page.locator('[aria-label^="Empty category slot 1"]').boundingBox();
const sx = s.x + s.width / 2, sy = s.y + s.height / 2;
await touch('touchStart', sx, sy);
await page.waitForTimeout(260);
for (let k = 1; k <= 10; k++) await touch('touchMove', sx + ((d.x + d.width / 2 - sx) * k) / 10, sy + ((d.y + d.height / 2 - sy) * k) / 10);
await touch('touchEnd');
await page.waitForTimeout(400);
console.log('after touch drag slot1:', await page.locator('[aria-label^="Category slot 1"]').getAttribute('aria-label').catch(() => 'NOT MOVED'));
console.log('selected after drag?', (await page.getByRole('status').first().innerText()).replace(/\s+/g, ' '));
// fast swipe on a tableau card should not start drag (scroll)
const card = page.locator('[aria-label*="bottom card"]').first();
const c = await card.boundingBox();
const before = await page.locator('section[aria-label="Play area"]').innerText();
await touch('touchStart', c.x + 20, c.y + 40);
for (let k = 1; k <= 5; k++) await touch('touchMove', c.x + 20, c.y + 40 - k * 30);
await touch('touchEnd');
await page.waitForTimeout(300);
console.log('swipe left board unchanged:', before === (await page.locator('section[aria-label="Play area"]').innerText()), 'scrollY', await page.evaluate(() => scrollY));
// keyboard route on desktop-ish: focus draft card, Enter, Tab to slot 2, Enter
await page.evaluate(() => scrollTo(0, 0));
for (let i = 0; i < 60; i++) {
  await stock.tap();
  if (await draftTop.count() && (await draftTop.getAttribute('aria-label')).includes('title card')) break;
}
await draftTop.focus();
await page.keyboard.press('Enter');
console.log('kbd selected:', await draftTop.getAttribute('aria-pressed'));
await page.locator('[aria-label^="Empty category slot 2"]').focus();
await page.keyboard.press('Enter');
console.log('kbd slot2:', await page.locator('[aria-label^="Category slot 2"]').getAttribute('aria-label').catch(() => 'NOT MOVED'));
await page.screenshot({ path: '/tmp/pwscripts/touch.png' });
console.log('errors', errors);
await browser.close();
