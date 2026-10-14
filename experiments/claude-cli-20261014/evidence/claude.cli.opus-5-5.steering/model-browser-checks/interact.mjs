import { chromium } from '/tmp/pwcheck/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/');
await page.waitForTimeout(500);
const status = () => page.getByRole('status').first().innerText();
const deckCount = async () => (await page.getByText(/^Deck \d+$/).innerText());
const draftTop = () => page.locator('[aria-label*="top of draft pile"]');
const stock = () => page.locator('button[aria-label^="Source deck"]');

// draw until title card on draft
async function drawUntilTitle() {
  for (let i = 0; i < 60; i++) {
    if (await draftTop().count()) {
      const l = await draftTop().getAttribute('aria-label');
      if (l.includes('category title card')) return l;
    }
    await stock().click();
  }
  return null;
}
await stock().click();
console.log('after 1 draw:', await deckCount());
// tap-to-move a title to slot 1
let t = await drawUntilTitle();
console.log('title on draft:', t);
await draftTop().click();
console.log('status after select:', await status());
const legalSlots = await page.locator('[aria-label*="valid destination"]').count();
console.log('legal destinations highlighted:', legalSlots);
await page.locator('[aria-label^="Empty category slot 1"]').click();
console.log('slot1:', await page.locator('[aria-label^="Category slot 1"]').getAttribute('aria-label'));
// drag-to-move next title to slot 2
t = await drawUntilTitle();
console.log('second title:', t);
const src = await draftTop().boundingBox();
const dst = await page.locator('[aria-label^="Empty category slot 2"]').boundingBox();
await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
await page.mouse.down();
await page.mouse.move(src.x + 20, src.y + 20, { steps: 5 });
await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height / 2, { steps: 10 });
await page.screenshot({ path: '/tmp/pwscripts/dragging.png' });
await page.mouse.up();
await page.waitForTimeout(400);
console.log('slot2:', await page.locator('[aria-label^="Category slot 2"]').getAttribute('aria-label'));
// illegal: drag a tableau item card onto empty slot 3
const bottom = page.locator('[aria-label*="item card, column 1, bottom card"]');
if (await bottom.count()) {
  const before = await page.locator('section[aria-label="Play area"]').innerText();
  const b = await bottom.boundingBox();
  const d = await page.locator('[aria-label^="Empty category slot 3"]').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 30, b.y + 10, { steps: 5 });
  await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  console.log('illegal drag status:', await status());
  console.log('play area unchanged:', before === (await page.locator('section[aria-label="Play area"]').innerText()));
}
// illegal tap: select tableau col1 bottom item, tap empty slot 3
if (await bottom.count()) {
  await bottom.click();
  await page.locator('[aria-label^="Empty category slot 3"]').click();
  console.log('illegal tap status:', await status());
}
// recycle
for (let i = 0; i < 80 && (await stock().getAttribute('aria-label')).includes('Draw'); i++) await stock().click();
console.log('stock exhausted:', await deckCount(), await page.getByText(/^Draft \d+$/).innerText());
const firstDrawnBefore = null;
await stock().click();
console.log('after flip:', await deckCount(), await page.getByText(/^Draft \d+$/).innerText(), await status());
await page.screenshot({ path: '/tmp/pwscripts/after.png', fullPage: true });
// menu: mute, restart, quit
await page.getByRole('button', { name: 'Game menu' }).click();
await page.getByRole('menuitemcheckbox').click();
await page.getByRole('button', { name: 'Game menu' }).click();
console.log('mute item now:', await page.getByRole('menuitemcheckbox').innerText());
await page.getByRole('menuitem', { name: 'Restart game' }).click();
await page.waitForTimeout(300);
console.log('after restart:', await deckCount(), 'score', await page.locator('[aria-label^="Score"]').innerText());
await page.getByRole('button', { name: 'Game menu' }).click();
await page.getByRole('menuitem', { name: 'Quit game' }).click();
await page.waitForTimeout(300);
console.log('quit screen:', await page.getByRole('heading', { name: 'Game ended' }).count());
await page.getByRole('button', { name: 'Start a new game' }).click();
console.log('new game after quit:', await deckCount());
console.log('errors', errors);
await browser.close();
