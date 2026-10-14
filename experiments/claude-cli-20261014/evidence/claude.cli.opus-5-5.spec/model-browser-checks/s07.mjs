export default async ({ evalJs, shot, sleep, send }) => {
  await send('Runtime.enable');
  await evalJs(`(async () => {
    window.__osc = 0; window.__errors = [];
    window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
    const orig = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { window.__osc++; return orig.call(this); };
    const src = await (await fetch('/src/main.jsx')).text();
    const url = (name) => src.match(new RegExp('from "([^"]*' + name + '[^"]*)"'))[1];
    const React = (await import(url('/react.js'))).default;
    const ReactDOM = (await import(url('react-dom_client'))).default;
    const mui = await import(url('@mui_material'));
    const App = (await import('/src/App.jsx')).default;
    const theme = mui.createTheme({ palette: { background: { default: '#0b5d3b' } } });
    const deck = [['a1','King','Orb'],['b2','Beds','Cot'],['b1','Beds','Futon'],['At','King',null],['Bt','Beds',null]]
      .map(([id, categoryTitle, itemName]) => ({ id, categoryTitle, itemName }));
    const el = document.createElement('div');
    document.body.replaceChildren(el);
    window.__root = ReactDOM.createRoot(el);
    window.__root.render(React.createElement(mui.ThemeProvider, { theme }, React.createElement(mui.CssBaseline),
      React.createElement(App, { deckData: deck, rng: () => 0.999999 })));
    await new Promise(r => setTimeout(r, 300));
  })()`);
  const click = async (sel) => {
    const r = await evalJs(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(10, r.height / 2) }; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await sleep(120);
  };
  const card = (id) => `[data-card-id="${id}"][data-face-up]`;
  const osc = () => evalJs('window.__osc');
  const ctxState = () => evalJs(`'' + window.__osc`);

  await click(card('At')); await click(card('Bt'));
  console.log('after illegal title (error, 2 notes):', await osc());
  await click(card('At')); // deselect
  await click(card('At')); await click('[data-testid="foundation-0"]');
  await click(card('b1')); await click('[data-testid="foundation-1"]');
  console.log('after illegal item (warning, +2):', await osc());
  await click(card('b1'));
  await click('[data-testid="menu-cog"]');
  await shot('menu');
  await click('[data-testid="menu-sound"]');
  await sleep(300);
  await click(card('Bt')); await click('[data-testid="foundation-0"]'); // illegal title while muted
  console.log('muted illegal title (no change):', await osc());
  await click(card('Bt')); // deselect
  await click('[data-testid="menu-cog"]'); await click('[data-testid="menu-sound"]'); await sleep(300);
  await click(card('Bt')); await click('[data-testid="foundation-1"]');
  await click(card('b1')); await click('[data-testid="foundation-1"]');
  await click(card('b2')); await click('[data-testid="foundation-1"]');
  console.log('after Beds complete (success, +4):', await osc(), await evalJs(`document.querySelector('[data-testid="score"]').innerText`));
  await sleep(1300);
  await click(card('a1')); await click('[data-testid="foundation-0"]');
  await sleep(600);
  console.log('after win (+4):', await osc());
  console.log('dialog:', await evalJs(`document.querySelector('[role="dialog"]')?.innerText`));
  await shot('win');
  await click('[data-testid="play-again"]'); await sleep(500);
  console.log('after play again:', await evalJs(`JSON.stringify({ dialog: !!document.querySelector('[role="dialog"]'), score: document.querySelector('[data-testid="score"]').innerText, col0: document.querySelector('[data-testid="tableau-column-0"]').dataset.count })`));
  await click('[data-testid="menu-cog"]'); await click('[data-testid="menu-quit"]'); await sleep(400);
  await shot('quit');
  console.log('quit:', await evalJs(`document.querySelector('[data-testid="quit-screen"]')?.innerText`));
  console.log('page errors:', await evalJs('JSON.stringify(window.__errors)'));
};
