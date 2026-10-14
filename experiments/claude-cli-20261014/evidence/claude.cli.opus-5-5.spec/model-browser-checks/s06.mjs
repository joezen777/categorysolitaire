export default async ({ evalJs, shot, sleep, send }) => {
  await evalJs(`(async () => {
    const src = await (await fetch('/src/main.jsx')).text();
    const url = (name) => src.match(new RegExp('from "([^"]*' + name + '[^"]*)"'))[1];
    const React = (await import(url('/react.js'))).default;
    const ReactDOM = (await import(url('react-dom_client'))).default;
    const App = (await import('/src/App.jsx')).default;
    const mui = await import(url('@mui_material'));
    const theme = mui.createTheme({ palette: { background: { default: '#0b5d3b' } } });
    const deck = [['b1','Beds','Cot'],['b2','Beds','Futon'],['a2','King','Orb'],['At','King',null],
      ['Bt','Beds',null],['b3','Beds','Hammock'],['a3','King','Throne'],['a1','King','Scepter']]
      .map(([id, categoryTitle, itemName]) => ({ id, categoryTitle, itemName }));
    const el = document.createElement('div');
    document.body.replaceChildren(el);
    document.body.style.background = '#0b5d3b'; document.body.style.margin = '0';
    ReactDOM.createRoot(el).render(React.createElement(mui.ThemeProvider, { theme },
      React.createElement(mui.CssBaseline), React.createElement(App, { deckData: deck, rng: () => 0.999999 })));
    await new Promise(r => setTimeout(r, 300));
  })()`);
  const rect = (sel) => evalJs(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top, y: r.top + r.height / 2, bottom: r.bottom }; })()`);
  const card = (id) => `[data-card-id="${id}"][data-face-up]`;
  const mouseDrag = async (fromSel, toSel, grabTop = false) => {
    const a = await rect(fromSel); const b = await rect(toSel);
    const ay = grabTop ? a.top + 6 : a.y;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: ay, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 10; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (b.x - a.x) * i / 10, y: ay + (b.y - ay) * i / 10, button: 'left', buttons: 1 });
      await sleep(16);
    }
    return async () => { await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 }); await sleep(400); };
  };
  const touchDrag = async (fromSel, toSel) => {
    const a = await rect(fromSel); const b = await rect(toSel);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
    await sleep(250); // TouchSensor press delay
    for (let i = 1; i <= 10; i++) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10 }] });
      await sleep(16);
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
  };
  const state = () => evalJs(`JSON.stringify({
    cols: [0,1,2,3,4].map(i => [...document.querySelectorAll('[data-testid="tableau-column-'+i+'"] [data-face-up]')].map(e => e.dataset.cardId + (e.dataset.faceUp === 'true' ? '+' : '-')).join(' ')),
    f0: document.querySelector('[data-testid="foundation-progress-0"]').innerText,
    alert: document.querySelector('[data-testid="rejection"]')?.innerText ?? null })`);

  let release = await mouseDrag(card('a1'), '[data-testid="foundation-1"]');
  await shot('1-dragging-invalid');
  await release();
  console.log('mouse a1->F1 (invalid):', await state());
  await shot('2-after-invalid');
  release = await mouseDrag(card('At'), '[data-testid="foundation-0"]'); await release();
  console.log('mouse At->F0:', await state());
  await touchDrag(card('a1'), '[data-testid="foundation-0"]');
  console.log('touch a1->F0:', await state());
  release = await mouseDrag(card('a3'), card('a2')); await release();
  console.log('mouse a3->col0:', await state());
  release = await mouseDrag(card('a2'), '[data-testid="tableau-column-2"]', true);
  await shot('3-dragging-group');
  await release();
  console.log('mouse group a2->col2:', await state());
  await touchDrag(card('b3'), card('a3'));
  console.log('touch b3->col2 (invalid):', await state());
  await touchDrag(card('b2'), card('b3'));
  console.log('touch b2->col1:', await state());
  await shot('4-final');
  console.log('styles', await evalJs(`JSON.stringify([...document.querySelectorAll('[data-testid="tableau-column-2"] [data-face-up]')].map(e => { const cs = getComputedStyle(e); return [e.dataset.cardId, cs.position, cs.top, e.querySelector('[data-testid="covered-label"]')?.innerText ?? null]; }))`));
};
