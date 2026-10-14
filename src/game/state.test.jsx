import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import starterDeck from '../decks/starterDeck.json';
import { buildDeck } from '../decks/deck.js';
import { createGame, allPlacedIds, shuffle, COLUMN_SIZES } from './state.js';
import App from '../App.jsx';

afterEach(cleanup);

// Small deterministic PRNG (mulberry32) for repeatable deals.
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const { cards } = buildDeck(starterDeck);

describe('initial deal', () => {
  for (const seed of [1, 2, 3, 42, 999]) {
    it(`deals 30 tableau / 56 source with every id once (seed ${seed})`, () => {
      const state = createGame(cards, seeded(seed));
      expect(state.tableau.map((c) => c.length)).toEqual(COLUMN_SIZES);
      expect(state.tableau.flat()).toHaveLength(30);
      expect(state.source).toHaveLength(56);
      expect(state.draft).toEqual([]);
      expect(state.foundations).toEqual([null, null, null, null, null]);
      expect(state.score).toBe(0);
      const ids = allPlacedIds(state);
      expect(ids).toHaveLength(86);
      expect([...ids].sort()).toEqual(cards.map((c) => c.id).sort());
      for (const column of state.tableau) {
        expect(column.map((c) => c.faceUp)).toEqual(column.map((_, i) => i === column.length - 1));
      }
      expect(state.source.every((c) => !c.faceUp)).toBe(true);
    });
  }

  it('shuffles without losing cards and differs across seeds', () => {
    const ids = cards.map((c) => c.id);
    const a = shuffle(ids, seeded(1));
    const b = shuffle(ids, seeded(2));
    expect([...a].sort()).toEqual([...ids].sort());
    expect(a).not.toEqual(b);
  });
});

describe('board rendering', () => {
  it('renders regions in order with initial deal shown', () => {
    const { container } = render(<App rng={seeded(7)} />);
    const order = ['top-bar', 'pile-row', 'foundations', 'tableau'].map((id) => screen.getByTestId(id));
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByTestId('score').textContent).toBe('Score: 0');
    expect(screen.getByTestId('menu-cog')).toBeTruthy();
    expect(screen.getByTestId('source').dataset.count).toBe('56');
    expect(within(screen.getByTestId('source')).getByTestId('card-back')).toBeTruthy();
    expect(screen.getByTestId('draft').dataset.count).toBe('0');
    for (let i = 0; i < 5; i += 1) {
      expect(screen.getByTestId(`foundation-${i}`).dataset.empty).toBe('true');
      const col = screen.getByTestId(`tableau-column-${i}`);
      expect(col.dataset.count).toBe(String(COLUMN_SIZES[i]));
      expect(within(col).getAllByTestId('card-back')).toHaveLength(COLUMN_SIZES[i] - 1);
      const faces = col.querySelectorAll('[data-testid="title-card"], [data-testid="item-card"]');
      expect(faces).toHaveLength(1);
      expect(col.lastElementChild.contains(faces[0])).toBe(true);
    }
    expect(container.querySelectorAll('[data-card-id][data-face-up="true"]')).toHaveLength(5);
  });
});
