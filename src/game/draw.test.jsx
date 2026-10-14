import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import starterDeck from '../decks/starterDeck.json';
import { buildDeck } from '../decks/deck.js';
import { createGame, drawCard, recycleDraft, draftTop, allPlacedIds } from './state.js';
import App from '../App.jsx';

afterEach(cleanup);

// Source top is the last element, so 'a' is drawn first here.
function smallState() {
  return {
    source: ['c', 'b', 'a'].map((id) => ({ id, faceUp: false })),
    draft: [],
    foundations: [null, null, null, null, null],
    tableau: [[], [], [], [], []],
    score: 0,
  };
}

const drawAll = (s) => {
  const order = [];
  while (s.source.length) {
    s = drawCard(s);
    order.push(draftTop(s).id);
  }
  return [s, order];
};

describe('draw and recycle (pure)', () => {
  it('draws exactly one card face up per call', () => {
    let s = smallState();
    s = drawCard(s);
    expect(s.source.map((c) => c.id)).toEqual(['c', 'b']);
    expect(s.draft).toEqual([{ id: 'a', faceUp: true }]);
    s = drawCard(s);
    expect(s.source).toHaveLength(1);
    expect(s.draft.map((c) => c.id)).toEqual(['a', 'b']);
    expect(draftTop(s).id).toBe('b');
  });

  it('recycles with inverted order: former draft bottom drawn first', () => {
    let [s, order] = drawAll(smallState());
    expect(order).toEqual(['a', 'b', 'c']);
    expect(s.source).toEqual([]);
    expect(s.draft.map((c) => c.id)).toEqual(['a', 'b', 'c']); // bottom a, top c
    s = recycleDraft(s);
    expect(s.draft).toEqual([]);
    expect(s.source.every((c) => !c.faceUp)).toBe(true);
    // former top 'c' is at the bottom of source (drawn last), former bottom 'a' drawn first
    expect(s.source.map((c) => c.id)).toEqual(['c', 'b', 'a']);
    [s, order] = drawAll(s);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('recycles a partially drawn draft only when source is empty', () => {
    const s = drawCard(smallState());
    expect(recycleDraft(s)).toBe(s);
  });

  it('no-ops on empty source and empty draft without inventing cards', () => {
    const empty = { ...smallState(), source: [] };
    expect(drawCard(empty)).toBe(empty);
    expect(recycleDraft(empty)).toBe(empty);
  });

  it('conserves all 86 cards across repeated cycles', () => {
    const { cards } = buildDeck(starterDeck);
    let s = createGame(cards);
    const ids = [...allPlacedIds(s)].sort();
    const initialSource = s.source.map((c) => c.id);
    for (let cycle = 0; cycle < 4; cycle += 1) {
      let order;
      [s, order] = drawAll(s);
      // draw order is always top-of-source first, identical each cycle
      expect(order).toEqual([...initialSource].reverse());
      expect(s.draft).toHaveLength(56);
      expect([...allPlacedIds(s)].sort()).toEqual(ids);
      s = recycleDraft(s);
      expect(s.source.map((c) => c.id)).toEqual(initialSource);
      expect([...allPlacedIds(s)].sort()).toEqual(ids);
    }
  });
});

describe('draw and recycle (UI)', () => {
  it('clicks draw one card at a time, then recycle from the empty slot', () => {
    render(<App />);
    const source = () => screen.getByTestId('source');
    expect(screen.getByTestId('draft-empty')).toBeTruthy();
    const drawn = [];
    for (let i = 1; i <= 56; i += 1) {
      fireEvent.click(source());
      expect(source().dataset.count).toBe(String(56 - i));
      expect(screen.getByTestId('draft').dataset.count).toBe(String(i));
      drawn.push(screen.getByTestId('draft-top').dataset.cardId);
    }
    expect(screen.getByTestId('source-empty')).toBeTruthy();
    fireEvent.click(source());
    expect(source().dataset.count).toBe('56');
    expect(screen.getByTestId('draft-empty')).toBeTruthy();
    fireEvent.click(source());
    expect(screen.getByTestId('draft-top').dataset.cardId).toBe(drawn[0]);
  });
});
