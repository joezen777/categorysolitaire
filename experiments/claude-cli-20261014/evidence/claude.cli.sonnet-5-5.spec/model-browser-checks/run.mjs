import { chromium } from 'playwright-core';
const item = (cat, name) => ({ type: 'item', id: `${cat}-${name}`, categoryTitle: cat, itemName: name });
const title = (cat, n) => ({ type: 'title', id: `title:${cat}`, categoryTitle: cat, itemCount: n });
const game = {
  tableau: [
    [item('Wine', 'Merlot'), item('Wine', 'Rose')],
    [item('Wine', 'Cava')],
    [item('Beds', 'Cot'), item('Pirate', 'Rum')],
    [],
    [title('King', 3)],
  ],
  faceUpCounts: [2, 1, 1, 0, 1],
  source: [item('Ceramic', 'Vase'), item('Ceramic', 'Mug')],
  draft: [item('King', 'Orb')],
  foundations: [[], [], [], [], []],
  score: 0, cleared: [],
};
const stub = `export const TABLEAU_SIZES=[4,5,6,7,8];export const FOUNDATION_COUNT=5;
export const shuffle=(l)=>[...l];export const dealGame=()=>(${JSON.stringify(game)});`;

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
async function open(viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: true });
  const page = await ctx.newPage();
  await page.route('**/src/game/deal.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: stub }));
  await page.goto('http://localhost:5199');
  await page.waitForSelector('[data-testid=tableau]');
  return page;
}
const card = (page, col, text) => page.locator(`[data-testid=tableau-column][data-column="${col}"] [data-testid=tableau-card]`, { hasText: text }).first();
const col = (page, i) => page.locator(`[data-testid=tableau-column][data-column="${i}"]`);
const slot = (page, i) => page.locator('[data-testid=foundation]').nth(i);
const state = (page) => page.evaluate(() => ({
  cols: [...document.querySelectorAll('[data-testid=tableau-column]')].map((c) => c.dataset.count),
  found: [...document.querySelectorAll('[data-testid=foundation]')].map((c) => c.dataset.count),
  draft: document.querySelector('[data-testid=draft]').dataset.count,
  score: document.querySelector('[data-testid=score]').textContent,
  faceDown: document.querySelectorAll('[data-testid=tableau] [data-testid=card-back]').length,
}));
async function drag(page, from, to) {
  const a = await from.boundingBox(); const b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + 10);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + 20, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40), { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}
async function tap(page, from, to) {
  await from.tap({ position: { x: 15, y: 8 } }); await to.tap({ position: { x: 15, y: 15 } }); await page.waitForTimeout(300);
}
const scenarios = {
  'single card -> empty column': (p) => [card(p, 2, 'Rum'), col(p, 3)],
  'wrong category (Rum on Cava)': (p) => [card(p, 2, 'Rum'), card(p, 1, 'Cava')],
  'matching stack Merlot+Rose onto Cava': (p) => [card(p, 0, 'Merlot'), card(p, 1, 'Cava')],
  'face-down Cot -> empty column': (p) => [p.locator('[data-column="2"] [data-testid=tableau-card]').first(), col(p, 3)],
  'King title -> foundation 2': (p) => [card(p, 4, 'King'), slot(p, 2)],
  'draft King item -> empty foundation (illegal)': (p) => [p.locator('[data-testid=draft] [data-testid=card-face]'), slot(p, 0)],
  'stack -> foundation (illegal)': (p) => [card(p, 0, 'Merlot'), slot(p, 1)],
  'draft Orb -> column 3 (valid)': (p) => [p.locator('[data-testid=draft] [data-testid=card-face]'), col(p, 3)],
};
const viewports = { phone: { width: 390, height: 800 }, desktop: { width: 1280, height: 800 } };
let allEqual = true;
for (const [vn, vp] of Object.entries(viewports)) {
  for (const [name, mk] of Object.entries(scenarios)) {
    const res = {};
    for (const mode of ['drag', 'tap']) {
      const page = await open(vp);
      const before = JSON.stringify(await state(page));
      const [f, t] = mk(page);
      await (mode === 'drag' ? drag : tap)(page, f, t);
      res[mode] = JSON.stringify(await state(page));
      res.before = before;
      res[mode + 'Alert'] = await page.locator('[data-testid=illegal-move]').count();
      await page.context().close();
    }
    const same = res.drag === res.tap && res.dragAlert === res.tapAlert;
    allEqual &&= same;
    console.log(vn, '|', name, '|', same ? 'SAME' : 'DIFF', '| changed:', res.drag !== res.before, '| alert:', res.dragAlert, res.tapAlert);
    if (!same || vn === 'phone') console.log('   drag', res.drag, '\n   tap ', res.tap);
  }
}
// overlap geometry check
const page = await open(viewports.phone);
const tops = await page.evaluate(() => [...document.querySelectorAll('[data-column="0"] [data-testid=tableau-card]')].map((e) => ({ top: e.style.top || getComputedStyle(e).top, pos: getComputedStyle(e).position, rect: e.getBoundingClientRect().top })));
console.log('col0 cards', JSON.stringify(tops));
await page.screenshot({ path: '/home/joezen777/s6-phone.png' });
const d = await open(viewports.desktop); await d.screenshot({ path: '/home/joezen777/s6-desktop.png' });
console.log('ALL EQUAL', allEqual);
await browser.close();
