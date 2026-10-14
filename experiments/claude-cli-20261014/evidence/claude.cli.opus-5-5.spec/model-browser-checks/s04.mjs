export default async ({ evalJs, shot, sleep }) => {
  // Find a legal move: draw cards until a title appears at a tableau bottom or draft; else try any rejection.
  const info = await evalJs(`(() => {
    const cols = [...document.querySelectorAll('[data-testid^="tableau-column-"]')];
    return cols.map(c => { const last = c.lastElementChild; return last?.innerText; });
  })()`);
  console.log('exposed', JSON.stringify(info));
  // Select col0 bottom and try placing on foundation 0.
  await evalJs(`document.querySelector('[data-testid="tableau-column-0"]').lastElementChild.click()`);
  await sleep(300);
  await shot('selected');
  await evalJs(`document.querySelector('[data-testid="foundation-0"]').click()`);
  await sleep(150);
  await shot('after-foundation');
  const res = await evalJs(`({ alert: document.querySelector('[data-testid="rejection"]')?.innerText ?? null, f0: document.querySelector('[data-testid="foundation-0"]').dataset.category, p0: document.querySelector('[data-testid="foundation-progress-0"]').innerText, col0: document.querySelector('[data-testid="tableau-column-0"]').dataset.count })`);
  console.log(JSON.stringify(res));
};
