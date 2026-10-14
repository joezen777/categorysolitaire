export default async ({ evalJs, shot, sleep, send }) => {
  const info = () => evalJs(`JSON.stringify({
    score: document.querySelector('[data-testid="score"]')?.innerText,
    cog: !!document.querySelector('[data-testid="menu-cog"]'),
    source: document.querySelector('[data-testid="source"]')?.dataset.count,
    draft: document.querySelector('[data-testid="draft"]')?.dataset.count,
    cols: [0,1,2,3,4].map(i => document.querySelector('[data-testid="tableau-column-'+i+'"]')?.dataset.count).join('/'),
    faceUp: document.querySelectorAll('[data-testid^="tableau-column-"] [data-face-up="true"]').length,
    foundations: document.querySelectorAll('[data-testid^="foundation-"][data-empty="true"]').length,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    tableauBottom: Math.round(document.querySelector('[data-testid="tableau"]').getBoundingClientRect().bottom),
    viewport: window.innerWidth + 'x' + window.innerHeight })`);
  console.log('initial', await info());
  for (let i = 0; i < 3; i++) { await evalJs(`document.querySelector('[data-testid="source"]').click()`); await sleep(60); }
  console.log('after 3 draws', await info());
  await shot('board');
};
