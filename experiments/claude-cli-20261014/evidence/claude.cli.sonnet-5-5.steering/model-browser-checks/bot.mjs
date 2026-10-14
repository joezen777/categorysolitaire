import { chromium } from 'playwright-core';
import fs from 'node:fs';
const deck = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const catOf = {}; const isTitle = {};
for (const c of deck) { const k = c.itemName ?? c.categoryTitle; catOf[k] = c.categoryTitle; isTitle[k] = c.itemName === null; }
const browser = await chromium.launch({ executablePath: process.argv[2], args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173');
await page.waitForSelector('[data-testid=score]');

const read = () => page.evaluate(() => {
  const cols = [...document.querySelectorAll('[aria-label^="Column "]')].map((g) => ({
    faceUp: [...g.querySelectorAll('button')].map((b) => b.title),
    empty: !!g.querySelector('[aria-label^="Empty column"]'),
    total: g.children.length,
  }));
  const waste = document.querySelector('section[aria-label^="Source"] > div:nth-child(2) button');
  const found = [...document.querySelectorAll('section[aria-label=Foundations] > div')].map((d) => {
    const b = d.querySelector('button'); return { label: b?.getAttribute('aria-label'), title: b?.title, counter: d.firstChild.textContent };
  });
  const stockBtn = document.querySelector('section[aria-label^="Source"] > div:nth-child(1) button');
  return { cols, waste: waste?.title ?? null, found, score: +document.querySelector('[data-testid=score]').textContent,
    status: document.querySelector('[role=status]').textContent, stock: stockBtn?.getAttribute('aria-label') };
});
const colSel = (c) => `[aria-label="Column ${c + 1}"]`;
const srcLoc = (s) => s.zone === 'waste' ? page.locator('section[aria-label^="Source"] > div:nth-child(2) button')
  : page.locator(`${colSel(s.col)} button`).nth(s.idx);
const dstLoc = (t) => t.zone === 'f' ? page.locator('section[aria-label=Foundations] > div').nth(t.slot).locator('button')
  : t.empty ? page.locator(`${colSel(t.col)} [aria-label^="Empty column"]`) : page.locator(`${colSel(t.col)} button`).last();

async function drag(a, b) {
  const A = await a.boundingBox(), B = await b.boundingBox(); B.height = Math.min(B.height, 20);
  await page.mouse.move(A.x + A.width / 2, A.y + 10);
  await page.mouse.down();
  await page.mouse.move(A.x + A.width / 2 + 10, A.y + 20, { steps: 3 });
  await page.mouse.move(B.x + B.width / 2, B.y + B.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}
async function doMove(a, b, useDrag) {
  if (useDrag) await drag(a, b); else { await a.click({ position: { x: 12, y: 6 } }); await b.click({ position: { x: 12, y: 6 } }); await page.waitForTimeout(60); }
}

// independent legality model for a group starting with label `lab` onto column `col`
function legalCol(first, col) {
  if (col.empty) return true;
  const base = col.faceUp[col.faceUp.length - 1];
  return !isTitle[base] && catOf[base] === catOf[first];
}
let games = 0, moves = 0, illegalChecks = 0, draws = 0, drags = 0, stuck = 0;
for (let iter = 0; iter < 600; iter++) { if (process.env.MAXMOVES && moves >= +process.env.MAXMOVES) break;
  const s = await read();
  if (await page.locator('text=Game Over - You Win!').count()) break;
  let cand = null;
  const sources = [];
  if (s.waste) sources.push({ zone: 'waste', first: s.waste });
  s.cols.forEach((c, ci) => c.faceUp.forEach((lab, k) => sources.push({ zone: 'tableau', col: ci, idx: k, first: lab, whole: k === 0 && c.total === c.faceUp.length })));
  // prefer foundation moves, then tableau moves that reveal / not pointless
  for (const src of sources) {
    const f = s.found.findIndex((x, i) => x.label && !x.label.startsWith('Empty') && x.title && catOf[x.title] === catOf[src.first]);
    const lastOfGroup = src.zone === 'waste' || src.idx === s.cols[src.col].faceUp.length - 1;
    if (isTitle[src.first] && lastOfGroup) {
      const e = s.found.findIndex((x) => x.label?.startsWith('Empty') === true || !x.label);
      if (e >= 0) { cand = { src, dst: { zone: 'f', slot: e } }; break; }
    } else if (!isTitle[src.first] && f >= 0 && !s.found[f].counter.startsWith('+')) {
      // whole group must be items of same category (always true for chains of items)
      cand = { src, dst: { zone: 'f', slot: f } }; break;
    }
  }
  if (!cand) for (const src of sources) {
    for (let ci = 0; ci < 5 && !cand; ci++) {
      if (src.zone === 'tableau' && src.col === ci) continue;
      if (!legalCol(src.first, s.cols[ci])) continue;
      if (s.cols[ci].empty && src.zone === 'tableau' && src.whole) continue;
      if (s.cols[ci].empty && src.zone === 'tableau' && src.idx === 0) continue;
      cand = { src, dst: { zone: 't', col: ci, empty: s.cols[ci].empty } };
    }
    if (cand) break;
  }
  if (cand) {
    const before = s;
    const d = iter % 4 === 3; if (d) drags++;
    await doMove(srcLoc(cand.src), dstLoc(cand.dst), d);
    const after = await read();
    if (after.status.startsWith('Illegal')) { console.log('UNEXPECTED ILLEGAL', JSON.stringify(cand), after.status); break; }
    moves++;
    if (after.score > before.score) console.log('score', after.score, after.status);
    continue;
  }
  // illegal-move probe once in a while: mismatched tableau move
  if (illegalChecks < 3 && s.waste) {
    for (let ci = 0; ci < 5; ci++) if (!legalCol(s.waste, s.cols[ci])) {
      const before = JSON.stringify((await read()).cols);
      await doMove(srcLoc({ zone: 'waste' }), dstLoc({ zone: 't', col: ci, empty: s.cols[ci].empty }), illegalChecks === 1);
      const after = await read();
      if (!after.status.startsWith('Illegal') || JSON.stringify(after.cols) !== before) console.log('ILLEGAL PROBE FAILED', after.status);
      else console.log('illegal probe ok:', after.status);
      illegalChecks++; break;
    }
  }
  // draw or recycle
  const stockBtn = page.locator('section[aria-label^="Source"] > div:nth-child(1) button');
  if (!(await stockBtn.count())) { stuck++; break; }
  const prevWaste = s.waste; 
  await stockBtn.click(); draws++;
  if (draws % 120 === 0) { const sc = (await read()).score; console.log('game end score', sc); await page.getByLabel('Game menu').click(); await page.getByRole('menuitem', { name: 'Restart' }).click(); await page.waitForTimeout(200); if ((await read()).score !== 0) console.log('RESTART DID NOT RESET'); games++; if (games >= 6) break; }
}
const peekInfo = await page.evaluate(() => [...document.querySelectorAll('[aria-label^="Column "] button')].slice(0,40).map((b) => { const s = b.querySelector('span'); const r = b.getBoundingClientRect(); return [b.title, s?.textContent, s && getComputedStyle(s).fontSize, s && getComputedStyle(s).color, Math.round(r.height), s && Math.round(s.getBoundingClientRect().height)].join('|'); })); console.log(peekInfo.join('\n'));
const fin = await read();
console.log({ moves, draws, drags, illegalChecks, score: fin.score, won: await page.locator('text=Game Over - You Win!').count(), errors });
await page.screenshot({ path: '/tmp/pw/end.png', fullPage: true });
await browser.close();
