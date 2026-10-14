import { chromium } from '/tmp/pwcheck/node_modules/playwright-core/index.mjs';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe });
const runs = Number(process.argv[2] ?? 3);
for (let run = 0; run < runs; run++) {
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/');
await page.waitForTimeout(300);
const stockBtn = () => page.locator('button[aria-label^="Source deck"]');
let idle = 0, steps = 0, scoreSeen = [], burstSeen = 0;
async function probe(btn) {
  await btn.click({ position: { x: 12, y: 6 } });
  const labels = await page.locator('[aria-label*="valid destination"]').evaluateAll((els) => els.map((e) => ({ label: e.getAttribute('aria-label'), tag: e.tagName })));
  return labels;
}
async function clickTarget(label) {
  await page.locator(`[aria-label="${label}"]`).first().click();
}
while (steps++ < 400) {
  if (await page.getByText('Game Over - You Win!').count()) break;
  // gather sources
  const cols = page.locator('section[aria-label="Play area"] > [role=group]');
  const n = await cols.count();
  const sources = [];
  const draft = page.locator('[aria-label*="top of draft pile"]');
  if (await draft.count()) sources.push({ loc: draft, reveals: true, waste: true });
  for (let c = 0; c < n; c++) {
    const col = cols.nth(c);
    const total = Number((await col.getAttribute('aria-label')).match(/(\d+) cards/)[1]);
    const btns = col.locator('button[aria-pressed]');
    const k = await btns.count();
    if (!k) continue;
    sources.push({ loc: btns.nth(0), reveals: total > k, first: true });
    if (k > 1) sources.push({ loc: btns.nth(k - 1), reveals: false });
  }
  let moved = false;
  for (const pass of ['foundation', 'title', 'tableau']) {
    for (const s of sources) {
      const label = await s.loc.getAttribute('aria-label').catch(() => null);
      if (!label) continue;
      const targets = await probe(s.loc);
      let pick = null;
      if (pass === 'foundation') pick = targets.find((t) => t.label.startsWith('Category slot'));
      if (pass === 'title' && label.includes('title card')) pick = targets.find((t) => t.label.startsWith('Empty category slot'));
      if (pass === 'tableau' && s.reveals) pick = targets.find((t) => t.label.startsWith('Column') && !/, 0 cards/.test(t.label)) ?? (s.first && !s.waste ? targets.find((t) => t.label.startsWith('Empty column')) : null);
      if (pick) {
        const score0 = await page.locator('[aria-label^="Score"]').innerText();
        await clickTarget(pick.label);
        const fb = await page.locator('[role=status][aria-live=polite]').innerText();
        if (fb.includes('complete')) { burstSeen += await page.locator('text=✦').count() > 0 ? 1 : 0; scoreSeen.push(fb.replace(/\s+/g, ' ')); }
        moved = true; break;
      }
      // deselect
      if (await s.loc.getAttribute('aria-pressed').catch(() => null) === 'true') await s.loc.click({ position: { x: 12, y: 6 } });
    }
    if (moved) break;
  }
  if (moved) { idle = 0; continue; }
  const sl = await stockBtn().getAttribute('aria-label');
  if (sl.includes('empty') && !sl.includes('Turn')) break;
  await stockBtn().click();
  if (++idle > 140) break;
}
const score = await page.locator('[aria-label^="Score"]').innerText();
const won = await page.getByText('Game Over - You Win!').count();
console.log(`run ${run}: steps ${steps} score ${score} won ${won} completions ${scoreSeen.length} glitterSeen ${burstSeen}`, scoreSeen.slice(0, 3));
if (won) {
  await page.screenshot({ path: '/tmp/pwscripts/win.png' });
  await page.getByRole('button', { name: 'Play again' }).click();
  console.log('after play again score', await page.locator('[aria-label^="Score"]').innerText());
} else await page.screenshot({ path: `/tmp/pwscripts/bot-${run}.png`, fullPage: true });
console.log('errors', errors);
await ctx.close();
}
await browser.close();
