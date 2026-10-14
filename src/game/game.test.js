import { describe, expect, it } from 'vitest';
import starter from '../data/starterDeck.json';
import { buildDeck } from './deck.js';
import { createGame, draw, finishClear, isWon, move, recycle } from './state.js';
import { getMovableGroup, legalTargets, validateMove } from './rules.js';
import { TABLEAU_SIZES } from './config.js';

const mini = buildDeck([
  { id: 'a', categoryTitle: 'A', itemName: null },
  { id: 'a1', categoryTitle: 'A', itemName: 'a1' },
  { id: 'a2', categoryTitle: 'A', itemName: 'a2' },
  { id: 'b', categoryTitle: 'B', itemName: null },
  { id: 'b1', categoryTitle: 'B', itemName: 'b1' },
  { id: 'b2', categoryTitle: 'B', itemName: 'b2' },
]);

const up = (id) => ({ id, faceUp: true });
const down = (id) => ({ id, faceUp: false });

function board(over = {}) {
  return {
    deck: mini,
    gameId: 1,
    phase: 'playing',
    score: 0,
    stock: [],
    waste: [],
    tableau: [[], [], [], [], []],
    foundations: [null, null, null, null, null],
    ...over,
  };
}

const allIds = (s) => [
  ...s.stock,
  ...s.waste,
  ...s.tableau.flat().map((c) => c.id),
  ...s.foundations.flatMap((f) => (f ? f.pile : [])),
];

describe('deck', () => {
  it('rejects duplicate ids, missing titles and empty categories', () => {
    expect(() => buildDeck([{ id: 'x', categoryTitle: 'X', itemName: 'i' }])).toThrow(/no title/);
    expect(() => buildDeck([{ id: 'x', categoryTitle: 'X', itemName: null }])).toThrow(/no items/);
    expect(() =>
      buildDeck([
        { id: 'x', categoryTitle: 'X', itemName: null },
        { id: 'x', categoryTitle: 'X', itemName: 'i' },
      ]),
    ).toThrow(/Duplicate/);
  });

  it('derives category totals from the data', () => {
    const deck = buildDeck(starter);
    expect(deck.categories.Winds.total).toBe(8);
    expect(deck.categories.King.total).toBe(3);
    expect(deck.categoryNames).toHaveLength(13);
  });
});

describe('dealing', () => {
  it('deals 4/5/6/7/8 with only the last card face up and conserves the deck', () => {
    const deck = buildDeck(starter);
    const s = createGame(deck);
    expect(s.tableau.map((c) => c.length)).toEqual(TABLEAU_SIZES);
    s.tableau.forEach((col) => {
      col.forEach((c, i) => expect(c.faceUp).toBe(i === col.length - 1));
    });
    const ids = allIds(s);
    expect(ids).toHaveLength(deck.cardIds.length);
    expect(new Set(ids)).toEqual(new Set(deck.cardIds));
    expect(s.stock).toHaveLength(deck.cardIds.length - 30);
    expect(s.waste).toEqual([]);
  });

  it('uses the injected random source', () => {
    const deck = buildDeck(starter);
    const a = createGame(deck, { random: () => 0.3 });
    const b = createGame(deck, { random: () => 0.3 });
    expect(a.stock).toEqual(b.stock);
  });
});

describe('source and draft pile', () => {
  it('draws one card at a time onto the draft pile', () => {
    const s = board({ stock: ['a', 'a1', 'a2'] });
    const r = draw(s);
    expect(r.state.waste).toEqual(['a2']);
    expect(r.state.stock).toEqual(['a', 'a1']);
  });

  it('refuses to draw from an empty source and to recycle while cards remain', () => {
    expect(draw(board()).ok).toBe(false);
    const s = board({ stock: ['a'], waste: ['a1'] });
    expect(recycle(s).ok).toBe(false);
    expect(recycle(s).state).toBe(s);
  });

  it('recycles by inverting the draft pile so the bottom card is drawn first', () => {
    let s = board({ stock: ['a2', 'a1', 'a'] });
    s = draw(s).state; // a
    s = draw(s).state; // a1
    s = draw(s).state; // a2
    expect(s.waste).toEqual(['a', 'a1', 'a2']);
    s = recycle(s).state;
    expect(s.waste).toEqual([]);
    expect(s.stock).toEqual(['a2', 'a1', 'a']);
    expect(draw(s).state.waste).toEqual(['a']);
  });
});

describe('tableau moves', () => {
  it('moves an item onto an item of the same category and reveals the exposed card', () => {
    const s = board({
      tableau: [[down('b'), up('a1')], [up('a2')], [], [], []],
    });
    const r = move(s, { zone: 'tableau', col: 0, index: 1 }, { zone: 'tableau', col: 1 });
    expect(r.ok).toBe(true);
    expect(r.state.tableau[1].map((c) => c.id)).toEqual(['a2', 'a1']);
    expect(r.state.tableau[0]).toEqual([up('b')]);
    expect(r.state.tableau[1].every((c) => c.faceUp)).toBe(true);
    expect(s.tableau[0][0].faceUp).toBe(false); // input untouched
  });

  it('rejects other-category items and leaves state identical', () => {
    const s = board({ tableau: [[up('a1')], [up('b1')], [], [], []] });
    const r = move(s, { zone: 'tableau', col: 0, index: 0 }, { zone: 'tableau', col: 1 });
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it('allows any group onto an empty column', () => {
    const s = board({ tableau: [[up('a1'), up('a2')], [], [], [], []] });
    expect(validateMove(s, { zone: 'tableau', col: 0, index: 1 }, { zone: 'tableau', col: 3 }).ok).toBe(true);
  });

  it('moves a stacked sequence atomically', () => {
    const s = board({
      tableau: [[down('b'), up('a1'), up('a2')], [up('a')], [], [], []],
    });
    // title 'a' can sit on an item of its category
    const onItem = move(s, { zone: 'tableau', col: 1, index: 0 }, { zone: 'tableau', col: 0 });
    expect(onItem.ok).toBe(true);
    expect(onItem.state.tableau[0].map((c) => c.id)).toEqual(['b', 'a1', 'a2', 'a']);

    const t = board({ tableau: [[down('b'), up('a1'), up('a2')], [], [], [], [up('b1')]] });
    const group = move(t, { zone: 'tableau', col: 0, index: 1 }, { zone: 'tableau', col: 2 });
    expect(group.state.tableau[2].map((c) => c.id)).toEqual(['a1', 'a2']);
    expect(group.state.tableau[0]).toEqual([up('b')]);
  });

  it('cannot pick up face-down cards or a broken run', () => {
    const s = board({ tableau: [[down('a1'), up('a2'), up('b1')], [], [], [], []] });
    expect(getMovableGroup(s, { zone: 'tableau', col: 0, index: 0 })).toBeNull();
    expect(getMovableGroup(s, { zone: 'tableau', col: 0, index: 1 })).toBeNull();
    expect(getMovableGroup(s, { zone: 'tableau', col: 0, index: 2 })).toEqual(['b1']);
  });

  it('title cards only go on empty columns, same-category items, or empty slots', () => {
    const s = board({ tableau: [[up('a')], [up('b1')], [up('a1')], [], []] });
    const src = { zone: 'tableau', col: 0, index: 0 };
    expect(validateMove(s, src, { zone: 'tableau', col: 1 }).ok).toBe(false);
    expect(validateMove(s, src, { zone: 'tableau', col: 2 }).ok).toBe(true);
    expect(validateMove(s, src, { zone: 'tableau', col: 3 }).ok).toBe(true);
    expect(validateMove(s, src, { zone: 'foundation', slot: 4 }).ok).toBe(true);
  });

  it('never allows items on a title card', () => {
    const s = board({ tableau: [[up('a')], [up('a1')], [], [], []] });
    expect(validateMove(s, { zone: 'tableau', col: 1, index: 0 }, { zone: 'tableau', col: 0 }).ok).toBe(false);
  });

  it('plays waste top cards through the same path', () => {
    const s = board({ waste: ['b2', 'a1'], tableau: [[up('a2')], [], [], [], []] });
    const r = move(s, { zone: 'waste' }, { zone: 'tableau', col: 0 });
    expect(r.state.waste).toEqual(['b2']);
    expect(r.state.tableau[0].map((c) => c.id)).toEqual(['a2', 'a1']);
  });
});

describe('foundations', () => {
  it('rejects items on empty slots and mismatched categories', () => {
    const s = board({
      tableau: [[up('a1')], [], [], [], []],
      foundations: [{ pile: ['b'], clearing: false }, null, null, null, null],
    });
    const src = { zone: 'tableau', col: 0, index: 0 };
    expect(validateMove(s, src, { zone: 'foundation', slot: 0 }).ok).toBe(false);
    expect(validateMove(s, src, { zone: 'foundation', slot: 1 }).ok).toBe(false);
  });

  it('completes a category once: scores 100, marks clearing, then frees the slot', () => {
    let s = board({
      tableau: [[up('a1')], [up('a2')], [up('a')], [], []],
    });
    s = move(s, { zone: 'tableau', col: 2, index: 0 }, { zone: 'foundation', slot: 2 }).state;
    s = move(s, { zone: 'tableau', col: 0, index: 0 }, { zone: 'foundation', slot: 2 }).state;
    expect(s.score).toBe(0);
    const last = move(s, { zone: 'tableau', col: 1, index: 0 }, { zone: 'foundation', slot: 2 });
    expect(last.completed).toEqual([{ slot: 2, category: 'A' }]);
    expect(last.state.score).toBe(100);
    expect(last.state.foundations[2].clearing).toBe(true);

    // slot is locked while the celebration runs
    const extra = board({ ...last.state, waste: ['b'] });
    expect(validateMove(extra, { zone: 'waste' }, { zone: 'foundation', slot: 2 }).ok).toBe(false);

    const cleared = finishClear(last.state, 2, 'A');
    expect(cleared.state.foundations[2]).toBeNull();
    expect(cleared.state.score).toBe(100);
    expect(finishClear(cleared.state, 2, 'A').ok).toBe(false); // no double clear
  });

  it('declares victory only when everything is cleared', () => {
    let s = board({
      waste: ['b2'],
      tableau: [[up('a1'), up('a2')], [up('a')], [up('b')], [up('b1')], []],
    });
    expect(isWon(s)).toBe(false);
    const go = (src, slot) => {
      s = move(s, src, { zone: 'foundation', slot }).state;
    };
    go({ zone: 'tableau', col: 1, index: 0 }, 0);
    go({ zone: 'tableau', col: 0, index: 0 }, 0);
    expect(s.score).toBe(100);
    go({ zone: 'tableau', col: 2, index: 0 }, 1);
    go({ zone: 'tableau', col: 3, index: 0 }, 1);
    expect(s.phase).toBe('playing');
    s = finishClear(s, 0, 'A').state;
    expect(s.phase).toBe('playing'); // B still pending
    go({ zone: 'waste' }, 1);
    expect(s.score).toBe(200);
    expect(s.phase).toBe('playing');
    s = finishClear(s, 1, 'B').state;
    expect(s.phase).toBe('won');
    expect(draw(s).ok).toBe(false);
  });

  it('lists legal targets for a source', () => {
    const s = board({
      tableau: [[up('a1')], [up('a2')], [], [up('b1')], []],
      foundations: [{ pile: ['a'], clearing: false }, null, null, null, null],
    });
    expect(legalTargets(s, { zone: 'tableau', col: 0, index: 0 })).toEqual({
      tableau: [1, 2, 4],
      foundation: [0],
    });
  });
});
