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
  console.log('start el', await page.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e.outerHTML.slice(0,200)+' | parent '+e.closest('[data-testid=tableau-card]')?.outerHTML.slice(0,160)},[195,311]));console.log('start el', await page.evaluate(()=>{const b=[...document.querySelectorAll('[data-column="2"] [data-testid=tableau-card]')].map(e=>e.getAttribute('aria-disabled')+':'+e.textContent+':'+JSON.stringify(e.getBoundingClientRect())); const e=document.elementFromPoint(195,311); return b.join(' ; ')+' | EL '+e.outerHTML.slice(0,150)}));await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + 20, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40), { steps: 10 });
  console.log('live2', await page.evaluate(()=>[...document.querySelectorAll('[aria-live]')].map(e=>e.textContent)));await page.mouse.up(); console.log('live3', await page.evaluate(()=>[...document.querySelectorAll('[aria-live]')].map(e=>e.textContent)));
  await page.waitForTimeout(400);
}
async function tap(page, from, to) {
  await from.tap({ position: { x: 15, y: 8 } }); await to.tap({ position: { x: 15, y: 15 } }); await page.waitForTimeout(300);
}

const page = await open({width:390,height:800});
const f = card(page,2,'Rum'); const t = col(page,3);
console.log(await f.boundingBox(), await t.boundingBox());
page.on('pageerror', e=>console.log('PAGEERR', e.message)); page.on('console', m=>console.log('console', m.text()));
await page.mouse.move(...(await f.boundingBox().then(a=>[a.x+a.width/2, a.y+10])));
console.log('start el', await page.evaluate(()=>{const b=[...document.querySelectorAll('[data-column="2"] [data-testid=tableau-card]')].map(e=>e.getAttribute('aria-disabled')+':'+e.textContent+':'+Math.round(e.getBoundingClientRect().top)); const e=document.elementFromPoint(195,311); return b.join(' ; ')+' | EL '+e.outerHTML.slice(0,150)}));
await page.mouse.down();
await page.mouse.move(100,300,{steps:5});
console.log('live', await page.evaluate(()=>[...document.querySelectorAll('[aria-live]')].map(e=>e.textContent)), await page.evaluate(()=>document.elementFromPoint(100,300)?.outerHTML.slice(0,120)));
const b = await t.boundingBox();
await page.mouse.move(b.x+b.width/2, b.y+40,{steps:10});
console.log('live2', await page.evaluate(()=>[...document.querySelectorAll('[aria-live]')].map(e=>e.textContent)));await page.mouse.up(); console.log('live3', await page.evaluate(()=>[...document.querySelectorAll('[aria-live]')].map(e=>e.textContent))); await page.waitForTimeout(500);
console.log(await state(page), await page.locator('[data-testid=illegal-move]').count());
await browser.close();
