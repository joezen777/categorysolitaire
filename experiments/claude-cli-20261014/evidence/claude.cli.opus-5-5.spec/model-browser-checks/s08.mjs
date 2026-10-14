export default async ({ evalJs, shot, sleep, send }) => {
  const setup = await evalJs(`(async () => {
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
    const deck = (await import('/src/decks/starterDeck.json')).default;
    const cat = (t) => deck.filter((c) => c.categoryTitle === t);
    const titleLast = (t) => [...cat(t).filter((c) => c.itemName !== null), ...cat(t).filter((c) => c.itemName === null)];
    const titleFirst = (t) => [...cat(t).filter((c) => c.itemName === null), ...cat(t).filter((c) => c.itemName !== null)];
    const cols = ['King', 'Jupiter', 'Ceramic', 'Smell', 'Refuge'].flatMap(titleLast);
    const seq = ['Chimera', 'Think', 'Winds', 'Beds', 'Wine', 'Neck', 'Pirate', 'Aviation'].flatMap(titleFirst);
    const target = [...cols, ...seq.reverse()].map((c) => c.id);
    // Craft rng values so the Fisher-Yates shuffle produces exactly 'target'.
    const out = deck.map((c) => c.id); const vals = [];
    for (let i = out.length - 1; i > 0; i--) {
      const j = out.indexOf(target[i]); [out[i], out[j]] = [out[j], out[i]]; vals.push((j + 0.5) / (i + 1));
    }
    let k = 0; const rng = () => vals[k++];
    const theme = mui.createTheme({ palette: { background: { default: '#0b5d3b' } } });
    const el = document.createElement('div');
    document.body.replaceChildren(el);
    ReactDOM.createRoot(el).render(React.createElement(mui.ThemeProvider, { theme }, React.createElement(mui.CssBaseline),
      React.createElement(App, { rng })));
    await new Promise(r => setTimeout(r, 400));
    return { total: target.length, unique: new Set(target).size,
      cols: [0,1,2,3,4].map(i => document.querySelector('[data-testid="tableau-column-'+i+'"]').dataset.count).join('/'),
      source: document.querySelector('[data-testid="source"]').dataset.count };
  })()`);
  console.log('setup', JSON.stringify(setup));
  await shot('start');
  const click = async (sel) => {
    const r = await evalJs(`(() => { const e = document.querySelector('${sel}'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(12, r.height / 2) }; })()`);
    if (!r) return false;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: 1 });
    await sleep(40);
    return true;
  };
  // Pick the next move: draft top, else a column bottom, else draw.
  const plan = () => evalJs(`(() => {
    const slotFor = (id) => {
      const [slug, name] = id.split('--');
      const slots = [0,1,2,3,4].map(i => document.querySelector('[data-testid="foundation-'+i+'"]'));
      if (name === 'title') return slots.findIndex(s => s.dataset.empty === 'true');
      return slots.findIndex(s => s.dataset.category.toLowerCase() === slug);
    };
    const top = document.querySelector('[data-testid="draft-top"]');
    if (top) { const f = slotFor(top.dataset.cardId); if (f >= 0) return { sel: '[data-testid="draft-top"]', f }; }
    for (let i = 0; i < 5; i++) {
      const cards = document.querySelectorAll('[data-testid="tableau-column-'+i+'"] [data-face-up="true"]');
      const last = cards[cards.length - 1];
      if (last) { const f = slotFor(last.dataset.cardId); if (f >= 0) return { sel: '[data-card-id="' + last.dataset.cardId + '"][data-face-up]', f }; }
    }
    return { draw: true };
  })()`);
  let moves = 0, draws = 0, scores = [];
  for (let n = 0; n < 400; n++) {
    if (await evalJs(`!!document.querySelector('[role="dialog"]')`)) break;
    const p = await plan();
    if (p.draw) { await click('[data-testid="source"]'); draws++; continue; }
    await click(p.sel); await click(`[data-testid="foundation-${p.f}"]`); moves++;
    const sc = await evalJs(`document.querySelector('[data-testid="score"]').innerText`);
    if (scores[scores.length - 1] !== sc) { scores.push(sc); if (scores.length === 6) await shot('midgame'); }
  }
  await sleep(700);
  await shot('win');
  console.log(JSON.stringify({ moves, draws, scores }));
  console.log('osc', await evalJs('window.__osc'), 'dialog:', JSON.stringify(await evalJs(`document.querySelector('[role="dialog"]')?.innerText`)));
  console.log('errors', await evalJs('JSON.stringify(window.__errors)'));
};
