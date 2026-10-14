export default async ({ evalJs, shot, sleep }) => {
  // Remount App with a small known deck via the dev server's module graph.
  const mounted = await evalJs(`(async () => {
    const src = await (await fetch('/src/main.jsx')).text();
    const url = (name) => src.match(new RegExp('from "([^"]*' + name + '[^"]*)"'))[1];
    const React = (await import(url('/react.js'))).default;
    const ReactDOM = (await import(url('react-dom_client'))).default;
    const mui = await import(url('@mui_material'));
    const App = (await import('/src/App.jsx')).default;
    const deck = [
      { id: 'b1', categoryTitle: 'Beds', itemName: 'Cot' },
      { id: 'a1', categoryTitle: 'King', itemName: 'Orb' },
      { id: 'a2', categoryTitle: 'King', itemName: 'Throne' },
      { id: 'At', categoryTitle: 'King', itemName: null },
      { id: 'Bt', categoryTitle: 'Beds', itemName: null },
    ];
    const el = document.createElement('div');
    document.body.replaceChildren(el);
    document.body.style.background = '#0b5d3b';
    document.body.style.margin = '0';
    ReactDOM.createRoot(el).render(React.createElement(App, { deckData: deck, rng: () => 0.999999 }));
    await new Promise(r => setTimeout(r, 300));
    return document.querySelectorAll('[data-card-id]').length;
  })()`);
  console.log('mounted cards', mounted);
  const tap = async (sel) => { await evalJs(`document.querySelector('${sel}').click()`); await sleep(60); };
  await tap('[data-card-id="At"][data-face-up]');
  await tap('[data-testid="foundation-0"]');
  await tap('[data-card-id="a2"][data-face-up]');
  await tap('[data-testid="foundation-0"]');
  await shot('progress');
  console.log(await evalJs(`document.querySelector('[data-testid="foundation-progress-0"]').innerText`));
  await tap('[data-card-id="a1"][data-face-up]');
  await tap('[data-testid="foundation-0"]');
  await sleep(500);
  await shot('glitter');
  console.log(await evalJs(`JSON.stringify({ score: document.querySelector('[data-testid="score"]').innerText, glitter: !!document.querySelector('[data-testid="foundation-glitter-0"]'), empty: document.querySelector('[data-testid="foundation-0"]').dataset.empty })`));
  await sleep(1200);
  await tap('[data-card-id="Bt"][data-face-up]');
  await tap('[data-testid="foundation-0"]');
  await shot('reused');
  console.log(await evalJs(`JSON.stringify({ glitter: !!document.querySelector('[data-testid="foundation-glitter-0"]'), progress: document.querySelector('[data-testid="foundation-progress-0"]').innerText })`));
};
