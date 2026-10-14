export default async ({ evalJs, shot, sleep }) => {
  // Draw until any legal tap move exists by trying all pairs of exposed tableau bottoms and the draft top.
  const tryAll = `(async () => {
    const tick = () => new Promise(r => setTimeout(r, 30));
    const q = (s) => document.querySelector(s);
    const bottoms = () => [0,1,2,3,4].map(i => q('[data-testid="tableau-column-'+i+'"]').lastElementChild);
    for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
      if (a === b) continue;
      const before = bottoms().map(e => e?.dataset.cardId);
      const countsBefore = [0,1,2,3,4].map(i => q('[data-testid="tableau-column-'+i+'"]').dataset.count);
      bottoms()[a].click(); await tick();
      bottoms()[b].click(); await tick();
      const after = bottoms().map(e => e?.dataset.cardId);
      if (after[a] !== before[a]) return { moved: before[a], from: a, to: b, countsBefore,
        countsAfter: [0,1,2,3,4].map(i => q('[data-testid="tableau-column-'+i+'"]').dataset.count),
        newBottomFaceUp: bottoms()[a]?.dataset.faceUp };
      // deselect if still selected
      const sel = q('[data-selected="true"]'); if (sel) { sel.click(); await tick(); }
    }
    for (let b = 0; b < 5; b++) {
      const top = q('[data-testid="draft-top"]'); if (!top) break;
      const id = top.dataset.cardId;
      top.click(); await tick();
      bottoms()[b].click(); await tick();
      if (q('[data-testid="draft-top"]')?.dataset.cardId !== id) return { moved: id, from: 'draft', to: b,
        newDraftTop: q('[data-testid="draft-top"]')?.dataset.cardId ?? null, colBottom: bottoms()[b].dataset.cardId };
      const sel = q('[data-selected="true"]'); if (sel) { sel.click(); await tick(); }
    }
    return null;
  })()`;
  let result = null;
  for (let i = 0; i < 57 && !result; i++) {
    result = await evalJs(tryAll);
    if (!result) { await evalJs(`document.querySelector('[data-testid="source"]').click()`); await sleep(50); }
  }
  console.log(JSON.stringify(result));
  await sleep(300);
  await shot('legal');
};
