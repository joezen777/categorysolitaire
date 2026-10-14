import { describe, expect, it } from 'vitest';
import { activeDeck, buildDeck, DeckError, type DeckEntry } from '../deck';
import {
  applyMove,
  dealGame,
  drawCard,
  foundationProgress,
  isWon,
  legalTargets,
  recycleWaste,
  type GameState,
  type TableauCard,
} from './engine';

const smallEntries: DeckEntry[] = [
  { id: 'a-t', categoryTitle: 'Alpha', itemName: null },
  { id: 'a-1', categoryTitle: 'Alpha', itemName: 'A one' },
  { id: 'a-2', categoryTitle: 'Alpha', itemName: 'A two' },
  { id: 'b-t', categoryTitle: 'Beta', itemName: null },
  { id: 'b-1', categoryTitle: 'Beta', itemName: 'B one' },
  { id: 'b-2', categoryTitle: 'Beta', itemName: 'B two' },
  { id: 'b-3', categoryTitle: 'Beta', itemName: 'B three' },
];
const small = buildDeck(smallEntries);

const up = (id: string): TableauCard => ({ id, faceUp: true });
const down = (id: string): TableauCard => ({ id, faceUp: false });

function makeState(partial: Partial<GameState>): GameState {
  return {
    deck: small,
    stock: [],
    waste: [],
    tableau: [[], [], [], [], []],
    foundations: Array.from({ length: 5 }, () => ({ category: null, cardIds: [] })),
    score: 0,
    completedCategories: [],
    ...partial,
  };
}

/** Every card id currently anywhere in the game. */
function allIds(s: GameState): string[] {
  return [...s.stock, ...s.waste, ...s.tableau.flat().map((c) => c.id), ...s.foundations.flatMap((f) => f.cardIds)];
}

function seededRng(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

describe('deck model', () => {
  it('derives categories, item counts and explicit roles from data', () => {
    expect(activeDeck.cards).toHaveLength(86);
    expect(activeDeck.categoryCount).toBe(13);
    expect(activeDeck.categories.Winds.itemCount).toBe(8);
    expect(activeDeck.categories.King.itemCount).toBe(3);
    expect(activeDeck.byId['king-title'].role).toBe('title');
    expect(activeDeck.byId['king-orb']).toMatchObject({ role: 'item', category: 'King', label: 'Orb' });
    expect(new Set(activeDeck.cards.map((c) => c.id)).size).toBe(86);
  });

  it('rejects malformed decks', () => {
    expect(() => buildDeck([...smallEntries, smallEntries[1]])).toThrow(DeckError);
    expect(() => buildDeck([{ id: 'x', categoryTitle: 'X', itemName: 'lonely' }])).toThrow(/no title/);
    expect(() => buildDeck([{ id: 'x', categoryTitle: 'X', itemName: null }])).toThrow(/no item/);
  });
});

describe('dealing', () => {
  it('deals 4/5/6/7/8 with only the bottom card face up and conserves every card once', () => {
    const s = dealGame(activeDeck, seededRng(7));
    expect(s.tableau.map((c) => c.length)).toEqual([4, 5, 6, 7, 8]);
    for (const column of s.tableau) {
      expect(column.map((c) => c.faceUp)).toEqual(column.map((_, i) => i === column.length - 1));
    }
    expect(s.stock).toHaveLength(86 - 30);
    expect(s.waste).toEqual([]);
    const ids = allIds(s);
    expect(ids).toHaveLength(86);
    expect(new Set(ids)).toEqual(new Set(activeDeck.cards.map((c) => c.id)));
    expect(s.score).toBe(0);
  });

  it('refuses a deck too small to deal', () => {
    expect(() => dealGame(small)).toThrow(/at least 30/);
  });
});

describe('source and draft piles', () => {
  it('draws one card at a time and recycles in original draw order', () => {
    let s = makeState({ stock: ['a-1', 'a-2', 'b-1'] }); // top is b-1
    s = drawCard(s);
    s = drawCard(s);
    s = drawCard(s);
    expect(s.stock).toEqual([]);
    expect(s.waste).toEqual(['b-1', 'a-2', 'a-1']); // a-1 on top
    expect(drawCard(s)).toBe(s);
    s = recycleWaste(s);
    expect(s.waste).toEqual([]);
    // former bottom of draft pile (b-1) is drawn first, former top (a-1) last
    const order: string[] = [];
    while (s.stock.length) {
      s = drawCard(s);
      order.push(s.waste[s.waste.length - 1]);
    }
    expect(order).toEqual(['b-1', 'a-2', 'a-1']);
  });

  it('does not recycle while the source still has cards', () => {
    const s = makeState({ stock: ['a-1'], waste: ['a-2'] });
    expect(recycleWaste(s)).toBe(s);
  });
});

describe('tableau moves', () => {
  it('moves an item onto a same-category item and reveals the new bottom card', () => {
    const s = makeState({ tableau: [[down('b-t'), up('a-1')], [up('a-2')], [], [], []] });
    const r = applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-1' }, { kind: 'tableau', column: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.tableau[0]).toEqual([up('b-t')]);
    expect(r.state.tableau[1]).toEqual([up('a-2'), up('a-1')]);
  });

  it('rejects items on other categories and on title cards, leaving state unchanged', () => {
    const s = makeState({ tableau: [[up('a-1')], [up('b-1')], [up('a-t')], [], []] });
    const before = JSON.stringify(s);
    expect(applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-1' }, { kind: 'tableau', column: 1 }).ok).toBe(false);
    expect(applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-1' }, { kind: 'tableau', column: 2 }).ok).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('lets a title card go to an empty column or onto its own item only', () => {
    const s = makeState({ tableau: [[up('a-t')], [up('a-1')], [up('b-1')], [], []] });
    const src = { kind: 'tableau' as const, column: 0, cardId: 'a-t' };
    expect(legalTargets(s, src)).toEqual([
      { kind: 'tableau', column: 1 },
      { kind: 'tableau', column: 3 },
      { kind: 'tableau', column: 4 },
      { kind: 'foundation', slot: 0 },
      { kind: 'foundation', slot: 1 },
      { kind: 'foundation', slot: 2 },
      { kind: 'foundation', slot: 3 },
      { kind: 'foundation', slot: 4 },
    ]);
  });

  it('moves a same-category item run as a unit but not a mixed run', () => {
    const s = makeState({
      tableau: [[down('b-3'), up('a-2'), up('a-1')], [], [up('b-1'), up('a-t')], [up('b-2'), up('b-1')], []],
      deck: small,
    });
    const r = applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-2' }, { kind: 'tableau', column: 1 });
    expect(r.ok && r.state.tableau[1]).toEqual([up('a-2'), up('a-1')]);
    expect(r.ok && r.state.tableau[0]).toEqual([up('b-3')]);
    // a run containing a title or mixed categories cannot move as a group
    expect(applyMove(s, { kind: 'tableau', column: 2, cardId: 'b-1' }, { kind: 'tableau', column: 1 }).ok).toBe(false);
    // face-down cards cannot be picked up
    expect(applyMove(s, { kind: 'tableau', column: 0, cardId: 'b-3' }, { kind: 'tableau', column: 1 }).ok).toBe(false);
  });

  it('rejects stale sources (card not where the move claims)', () => {
    const s = makeState({ tableau: [[up('a-1')], [up('a-2')], [], [], []] });
    const r = applyMove(s, { kind: 'tableau', column: 1, cardId: 'a-1' }, { kind: 'tableau', column: 2 });
    expect(r.ok).toBe(false);
    const w = applyMove(makeState({ waste: ['a-1', 'a-2'] }), { kind: 'waste', cardId: 'a-1' }, { kind: 'tableau', column: 0 });
    expect(w.ok).toBe(false);
  });

  it('moves the top draft card to the tableau', () => {
    const s = makeState({ waste: ['b-1', 'a-1'], tableau: [[up('a-2')], [], [], [], []] });
    const r = applyMove(s, { kind: 'waste', cardId: 'a-1' }, { kind: 'tableau', column: 0 });
    expect(r.ok && r.state.waste).toEqual(['b-1']);
    expect(r.ok && r.state.tableau[0]).toEqual([up('a-2'), up('a-1')]);
  });
});

describe('foundations, scoring and victory', () => {
  it('requires the title before items and keeps categories separate', () => {
    const s = makeState({ tableau: [[up('a-1')], [up('a-t')], [up('b-1')], [], []] });
    expect(applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-1' }, { kind: 'foundation', slot: 0 }).ok).toBe(false);
    const r1 = applyMove(s, { kind: 'tableau', column: 1, cardId: 'a-t' }, { kind: 'foundation', slot: 0 });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(applyMove(r1.state, { kind: 'tableau', column: 2, cardId: 'b-1' }, { kind: 'foundation', slot: 0 }).ok).toBe(false);
    const r2 = applyMove(r1.state, { kind: 'tableau', column: 0, cardId: 'a-1' }, { kind: 'foundation', slot: 0 });
    expect(r2.ok && foundationProgress(r2.state, r2.state.foundations[0])).toEqual({ collected: 1, total: 2 });
  });

  it('clears a completed category, frees the slot, and awards 100 points once', () => {
    const s = makeState({
      foundations: [{ category: 'Alpha', cardIds: ['a-t', 'a-1'] }, ...Array.from({ length: 4 }, () => ({ category: null, cardIds: [] }))],
      tableau: [[up('a-2')], [up('b-t')], [], [], []],
    });
    const r = applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-2' }, { kind: 'foundation', slot: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.completedCategory).toBe('Alpha');
    expect(r.state.score).toBe(100);
    expect(r.state.foundations[0]).toEqual({ category: null, cardIds: [] });
    // repeating the same move is rejected and does not score again
    const again = applyMove(r.state, { kind: 'tableau', column: 0, cardId: 'a-2' }, { kind: 'foundation', slot: 0 });
    expect(again.ok).toBe(false);
    // the freed slot accepts a new title
    const next = applyMove(r.state, { kind: 'tableau', column: 1, cardId: 'b-t' }, { kind: 'foundation', slot: 0 });
    expect(next.ok && next.state.foundations[0].category).toBe('Beta');
    expect(next.ok && next.state.score).toBe(100);
  });

  it('accepts an item run into the foundation', () => {
    const s = makeState({
      foundations: [{ category: 'Beta', cardIds: ['b-t'] }, ...Array.from({ length: 4 }, () => ({ category: null, cardIds: [] }))],
      tableau: [[up('b-3'), up('b-2'), up('b-1')], [], [], [], []],
    });
    const r = applyMove(s, { kind: 'tableau', column: 0, cardId: 'b-3' }, { kind: 'foundation', slot: 0 });
    expect(r.ok && r.completedCategory).toBe('Beta');
    expect(r.ok && r.state.tableau[0]).toEqual([]);
  });

  it('declares victory only when every card is cleared', () => {
    let s = makeState({
      foundations: [
        { category: 'Alpha', cardIds: ['a-t', 'a-1'] },
        { category: 'Beta', cardIds: ['b-t', 'b-1', 'b-2'] },
        { category: null, cardIds: [] },
        { category: null, cardIds: [] },
        { category: null, cardIds: [] },
      ],
      waste: ['b-3'],
      tableau: [[up('a-2')], [], [], [], []],
    });
    expect(isWon(s)).toBe(false);
    const r1 = applyMove(s, { kind: 'tableau', column: 0, cardId: 'a-2' }, { kind: 'foundation', slot: 0 });
    if (!r1.ok) throw new Error(r1.reason);
    s = r1.state;
    expect(isWon(s)).toBe(false);
    const r2 = applyMove(s, { kind: 'waste', cardId: 'b-3' }, { kind: 'foundation', slot: 1 });
    if (!r2.ok) throw new Error(r2.reason);
    expect(r2.state.score).toBe(200);
    expect(isWon(r2.state)).toBe(true);
  });
});
