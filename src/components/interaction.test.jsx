import { describe, expect, it, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import App from '../App.jsx';

afterEach(cleanup);

// jsdom has no layout, so give drop targets fixed rectangles for dnd-kit:
// foundation i at x=i*100,y=100..220; tableau column i at x=i*100,y=300..700.
const realRect = Element.prototype.getBoundingClientRect;
function rectFor(el) {
  const id = el.dataset?.testid ?? '';
  let m = id.match(/^foundation-(\d)$/);
  if (m) return { x: +m[1] * 100, y: 100, width: 80, height: 120 };
  m = id.match(/^tableau-column-(\d)$/);
  if (m) return { x: +m[1] * 100, y: 300, width: 80, height: 400 };
  return { x: 0, y: 0, width: 0, height: 0 };
}
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const { x, y, width, height } = rectFor(this);
    return { x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON() {} };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

const point = (to) => (to.f != null ? { x: to.f * 100 + 40, y: 160 } : { x: to.col * 100 + 40, y: 500 });
const cardEl = (id) => document.querySelector(`[data-card-id="${id}"][data-face-up], [data-testid="draft-top"][data-card-id="${id}"]`);

async function drag(el, to) {
  const { x, y } = point(to);
  await act(async () => {
    fireEvent.mouseDown(el, { button: 0, clientX: 5, clientY: 5 });
  });
  await act(async () => {
    fireEvent.mouseMove(document, { clientX: 25, clientY: 25 });
  });
  await act(async () => {
    fireEvent.mouseMove(document, { clientX: x, clientY: y });
  });
  await act(async () => {
    fireEvent.mouseUp(document, { clientX: x, clientY: y });
  });
}

async function tap(el, to) {
  fireEvent.click(el);
  const target = to.f != null
    ? screen.getByTestId(`foundation-${to.f}`)
    : screen.queryByTestId(`tableau-empty-${to.col}`) ??
      screen.getByTestId(`tableau-column-${to.col}`).lastElementChild;
  fireEvent.click(target);
  // Clear any lingering selection after a rejected tap so both modes start equal.
  const sel = document.querySelector('[data-selected="true"]');
  if (sel) fireEvent.click(sel);
}

function snapshot() {
  const cols = [0, 1, 2, 3, 4].map((i) =>
    [...screen.getByTestId(`tableau-column-${i}`).querySelectorAll('[data-face-up]')].map(
      (e) => `${e.dataset.cardId}${e.dataset.faceUp === 'true' ? '↑' : '↓'}`,
    ),
  );
  const fnd = [0, 1, 2, 3, 4].map((i) => screen.getByTestId(`foundation-progress-${i}`).textContent);
  return {
    cols,
    fnd,
    score: screen.getByTestId('score').textContent,
    draft: screen.getByTestId('draft').dataset.count,
    source: screen.getByTestId('source').dataset.count,
  };
}

const rejection = () => screen.queryByTestId('rejection')?.textContent ?? '';

// Identity shuffle: col0 [b1, b2, a2, At↑], col1 [Bt, b3, a3, a1↑].
const DECK = [
  ['b1', 'B', 'b1'], ['b2', 'B', 'b2'], ['a2', 'A', 'a2'], ['At', 'A', null],
  ['Bt', 'B', null], ['b3', 'B', 'b3'], ['a3', 'A', 'a3'], ['a1', 'A', 'a1'],
].map(([id, categoryTitle, itemName]) => ({ id, categoryTitle, itemName }));
const identity = () => 0.999999;

const SCENARIO = [
  { card: 'At', to: { f: 0 }, ok: true }, // title -> empty foundation
  { card: 'a1', to: { f: 1 }, ok: false }, // item -> empty foundation
  { card: 'a1', to: { f: 0 }, ok: true }, // item -> its title's foundation
  { card: 'a3', to: { col: 0 }, ok: true }, // item onto same-category item
  { card: 'a2', to: { col: 2 }, ok: true }, // group [a2, a3] -> empty column
  { card: 'b3', to: { col: 2 }, ok: false }, // wrong category
  { card: 'a2', to: { f: 0 }, ok: false }, // group -> foundation
  { card: 'b2', to: { col: 1 }, ok: true }, // item onto same-category item (b3)
  { card: 'a2', to: { col: 3 }, ok: true }, // group again -> empty column
];

async function runScenario(mode) {
  render(<App deckData={DECK} rng={identity} />);
  const results = [];
  for (const step of SCENARIO) {
    const before = snapshot();
    await (mode === 'drag' ? drag : tap)(cardEl(step.card), step.to);
    const after = snapshot();
    results.push({ step, changed: JSON.stringify(before) !== JSON.stringify(after), after, rejection: rejection() });
  }
  cleanup();
  return results;
}

describe('drag and tap parity', () => {
  it('produces identical outcomes for the same valid and invalid moves', async () => {
    const tapped = await runScenario('tap');
    const dragged = await runScenario('drag');
    for (let i = 0; i < SCENARIO.length; i += 1) {
      expect(tapped[i].changed, `tap step ${i}`).toBe(SCENARIO[i].ok);
      expect(dragged[i].changed, `drag step ${i}`).toBe(SCENARIO[i].ok);
      expect(dragged[i].after).toEqual(tapped[i].after);
      if (!SCENARIO[i].ok) {
        expect(tapped[i].rejection).not.toBe('');
        expect(dragged[i].rejection).toBe(tapped[i].rejection);
      }
    }
    expect(tapped.at(-1).after.cols).toEqual([['b1↑'], ['Bt↓', 'b3↑', 'b2↑'], [], ['a2↑', 'a3↑'], []]);
    expect(tapped.at(-1).after.fnd[0]).toBe('A 1/3');
  });

  it('face-down cards cannot be dragged or tapped into a move', async () => {
    render(<App deckData={DECK} rng={identity} />);
    const before = snapshot();
    const faceDown = document.querySelector('[data-card-id="b1"][data-face-up="false"]');
    expect(faceDown.dataset.draggable).toBe('false');
    await drag(faceDown, { col: 2 });
    expect(snapshot()).toEqual(before);
    fireEvent.click(faceDown);
    fireEvent.click(screen.getByTestId('tableau-empty-2'));
    expect(snapshot()).toEqual(before);
    expect(rejection()).toMatch(/face-up/);
  });

  it('dropping outside any target bounces back without changes', async () => {
    render(<App deckData={DECK} rng={identity} />);
    const before = snapshot();
    const el = cardEl('At');
    await act(async () => fireEvent.mouseDown(el, { button: 0, clientX: 5, clientY: 5 }));
    await act(async () => fireEvent.mouseMove(document, { clientX: 30, clientY: 30 }));
    await act(async () => fireEvent.mouseMove(document, { clientX: 900, clientY: 20 }));
    await act(async () => fireEvent.mouseUp(document, { clientX: 900, clientY: 20 }));
    expect(snapshot()).toEqual(before);
    expect(rejection()).toMatch(/cannot be placed/);
  });
});

describe('draft card drag and tap', () => {
  // 30 tableau cards then z2 left in the source; col0 bottom (index 3) is z1.
  const FILL = Array.from({ length: 27 }, (_, i) => ({ id: `y${i}`, categoryTitle: 'Y', itemName: `y${i}` }));
  const BIG = [
    ...FILL.slice(0, 3),
    { id: 'z1', categoryTitle: 'Z', itemName: 'z1' },
    ...FILL.slice(3),
    { id: 'Yt', categoryTitle: 'Y', itemName: null },
    { id: 'Zt', categoryTitle: 'Z', itemName: null },
    { id: 'z2', categoryTitle: 'Z', itemName: 'z2' },
  ];

  for (const mode of ['tap', 'drag']) {
    it(`moves the draft top by ${mode}, rejecting an invalid destination first`, async () => {
      render(<App deckData={BIG} rng={identity} />);
      expect(screen.getByTestId('source').dataset.count).toBe('1');
      fireEvent.click(screen.getByTestId('source'));
      const act1 = mode === 'drag' ? drag : tap;
      await act1(cardEl('z2'), { f: 0 });
      expect(screen.getByTestId('draft').dataset.count).toBe('1');
      expect(rejection()).toMatch(/title card first/);
      await act1(cardEl('z2'), { col: 0 });
      expect(screen.getByTestId('draft').dataset.count).toBe('0');
      const col0 = [...screen.getByTestId('tableau-column-0').querySelectorAll('[data-face-up]')];
      expect(col0.map((e) => [e.dataset.cardId, e.dataset.faceUp])).toEqual([
        ['y0', 'false'], ['y1', 'false'], ['y2', 'false'], ['z1', 'true'], ['z2', 'true'],
      ]);
    });
  }
});

describe('stacked rendering', () => {
  it('keeps covered face-up cards labelled with increasing absolute top offsets', async () => {
    render(<App deckData={DECK} rng={identity} />);
    await tap(cardEl('At'), { f: 0 }); // reveals a2
    await tap(cardEl('a1'), { col: 0 }); // a1 onto a2; col1 reveals a3
    await tap(cardEl('a3'), { col: 0 }); // col0 [b1↓, b2↓, a2↑, a1↑, a3↑]
    const wrappers = [...screen.getByTestId('tableau-column-0').querySelectorAll('[data-face-up]')];
    expect(wrappers.map((w) => w.dataset.faceUp)).toEqual(['false', 'false', 'true', 'true', 'true']);
    const offsets = wrappers.map((w) => Number(w.dataset.topOffset));
    for (let i = 1; i < offsets.length; i += 1) expect(offsets[i]).toBeGreaterThan(offsets[i - 1]);
    for (const w of wrappers) {
      const style = getComputedStyle(w);
      expect(style.position).toBe('absolute');
    }
    const labels = (i) => wrappers[i].querySelector('[data-testid="covered-label"]')?.textContent ?? null;
    expect(labels(2)).toBe('a2');
    expect(labels(3)).toBe('a1');
    expect(labels(4)).toBeNull(); // bottom card shows the full face only
    expect(wrappers[4].textContent).toBe('a3');
  });
});
