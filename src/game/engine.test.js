import { describe, expect, it } from 'vitest';
import starterDeck from '../decks/starterDeck.json';
import { buildCards } from './deck';
import { applyMove, canMove, clearSlot, createGame, drawOrRecycle, getMovingCards, isWon } from './engine';

const title = (category, total) => ({ id: `title:${category}`, type: 'title', category, label: category, total });
const item = (id, category, total = 3) => ({ id, type: 'item', category, label: id, total });
const up = (card) => ({ card, faceUp: true });
const down = (card) => ({ card, faceUp: false });

function emptyState(overrides = {}) {
  return {
    stock: [],
    waste: [],
    tableau: [[], [], [], [], []],
    foundation: [null, null, null, null, null],
    score: 0,
    completedCategories: 0,
    categoryCount: 2,
    moves: 0,
    ...overrides,
  };
}

describe('deck', () => {
  it('generates one title card per category plus every item', () => {
    const { cards, categoryCount } = buildCards(starterDeck);
    expect(categoryCount).toBe(13);
    expect(cards.length).toBe(starterDeck.length + 13);
    const wine = cards.find((c) => c.id === 'title:Wine');
    expect(wine.total).toBe(6);
  });
});

describe('createGame', () => {
  it('deals 4..8 cards with only the bottom card face up', () => {
    const s = createGame(starterDeck);
    expect(s.tableau.map((c) => c.length)).toEqual([4, 5, 6, 7, 8]);
    for (const col of s.tableau) {
      expect(col.filter((e) => e.faceUp).length).toBe(1);
      expect(col[col.length - 1].faceUp).toBe(true);
    }
    expect(s.stock.length + 30).toBe(starterDeck.length + 13);
  });
});

describe('draw and recycle', () => {
  it('recycles the draft pile so the first drawn card is drawn first again', () => {
    const a = item('a', 'X');
    const b = item('b', 'X');
    const c = item('c', 'X');
    let s = emptyState({ stock: [c, b, a] });
    s = drawOrRecycle(drawOrRecycle(drawOrRecycle(s)));
    expect(s.waste.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    s = drawOrRecycle(s);
    expect(s.waste).toEqual([]);
    s = drawOrRecycle(s);
    expect(s.waste.map((x) => x.id)).toEqual(['a']);
  });
});

describe('move rules', () => {
  const t = title('X', 2);
  const x1 = item('x1', 'X', 2);
  const x2 = item('x2', 'X', 2);
  const y1 = item('y1', 'Y');

  it('title card goes to empty column, same-category item, or empty slot only', () => {
    const s = emptyState({ tableau: [[up(t)], [up(x1)], [up(y1)], [], []] });
    const from = { zone: 'tableau', col: 0, index: 0 };
    expect(canMove(s, from, { zone: 'tableau', col: 1 })).toBe(true);
    expect(canMove(s, from, { zone: 'tableau', col: 2 })).toBe(false);
    expect(canMove(s, from, { zone: 'tableau', col: 3 })).toBe(true);
    expect(canMove(s, from, { zone: 'foundation', slot: 0 })).toBe(true);
  });

  it('items cannot be placed on a title card in the tableau', () => {
    const s = emptyState({ tableau: [[up(t)], [up(x1)], [], [], []] });
    expect(canMove(s, { zone: 'tableau', col: 1, index: 0 }, { zone: 'tableau', col: 0 })).toBe(false);
  });

  it('items go to foundation only when the matching title is there', () => {
    const s = emptyState({
      tableau: [[up(x1)], [up(y1)], [], [], []],
      foundation: [{ title: t, items: [], completing: false }, null, null, null, null],
    });
    expect(canMove(s, { zone: 'tableau', col: 0, index: 0 }, { zone: 'foundation', slot: 0 })).toBe(true);
    expect(canMove(s, { zone: 'tableau', col: 1, index: 0 }, { zone: 'foundation', slot: 0 })).toBe(false);
    expect(canMove(s, { zone: 'tableau', col: 0, index: 0 }, { zone: 'foundation', slot: 1 })).toBe(false);
  });

  it('moves a same-category run together and reveals the new bottom card', () => {
    const hidden = item('h', 'Z');
    const s = emptyState({ tableau: [[down(hidden), up(x1), up(x2)], [], [], [], []] });
    const from = { zone: 'tableau', col: 0, index: 1 };
    expect(getMovingCards(s, from).map((c) => c.id)).toEqual(['x1', 'x2']);
    const next = applyMove(s, from, { zone: 'tableau', col: 1 });
    expect(next.tableau[1].map((e) => e.card.id)).toEqual(['x1', 'x2']);
    expect(next.tableau[0]).toEqual([up(hidden)]);
  });

  it('rejects mixed-category runs', () => {
    const s = emptyState({ tableau: [[up(y1), up(x1)], [], [], [], []] });
    expect(getMovingCards(s, { zone: 'tableau', col: 0, index: 0 })).toBeNull();
  });

  it('completes a category, awards 100 points, frees the slot, and wins', () => {
    let s = emptyState({
      categoryCount: 1,
      tableau: [[up(t)], [up(x1)], [up(x2)], [], []],
    });
    s = applyMove(s, { zone: 'tableau', col: 0, index: 0 }, { zone: 'foundation', slot: 2 });
    s = applyMove(s, { zone: 'tableau', col: 1, index: 0 }, { zone: 'foundation', slot: 2 });
    expect(s.foundation[2].items.length).toBe(1);
    s = applyMove(s, { zone: 'tableau', col: 2, index: 0 }, { zone: 'foundation', slot: 2 });
    expect(s.foundation[2].completing).toBe(true);
    s = clearSlot(s, 2);
    expect(s.foundation[2]).toBeNull();
    expect(s.score).toBe(100);
    expect(isWon(s)).toBe(true);
  });
});
