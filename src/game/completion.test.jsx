import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import starterDeck from '../decks/starterDeck.json';
import { buildDeck } from '../decks/deck.js';
import { moveCards, foundationProgress, COMPLETION_POINTS } from './rules.js';
import App from '../App.jsx';

afterEach(cleanup);

const { cards } = buildDeck(starterDeck);
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
const up = (id) => ({ id, faceUp: true });

const KING = ['king--scepter', 'king--orb', 'king--throne'];
const NECK = ['neck--bowtie', 'neck--dress-shirt', 'neck--scarf', 'neck--tie'];

function baseState() {
  return {
    source: [],
    draft: [],
    foundations: [null, null, null, null, null],
    // Each item sits alone in its own column position for easy addressing.
    tableau: [[up('king--title')], [up('neck--title')], KING.map(up), NECK.map(up), [up('wine--merlot')]],
    score: 0,
  };
}

const T = (col, index) => ({ type: 'tableau', col, index });
const F = (slot) => ({ type: 'foundation', slot });

function legal(state, from, to) {
  const r = moveCards(state, byId, from, to);
  expect(r.reason).toBeUndefined();
  return r;
}

describe('foundation completion and score', () => {
  it('counts items only and keeps incomplete categories in their slot', () => {
    let s = legal(baseState(), T(0, 0), F(0)).state;
    expect(foundationProgress(s.foundations[0], byId)).toEqual({ categoryTitle: 'King', collected: 0, total: 3 });
    s = legal(s, T(2, 2), F(0)).state;
    s = legal(s, T(2, 1), F(0)).state;
    expect(foundationProgress(s.foundations[0], byId)).toEqual({ categoryTitle: 'King', collected: 2, total: 3 });
    expect(s.foundations[0]).not.toBeNull();
    expect(s.score).toBe(0);
  });

  it('awards 100 once on the final item, clears the slot, and the slot is reused; two categories score 200', () => {
    let s = legal(baseState(), T(0, 0), F(0)).state; // King title -> slot 0
    s = legal(s, T(1, 0), F(1)).state; // Neck title -> slot 1
    s = legal(s, T(2, 2), F(0)).state;
    s = legal(s, T(2, 1), F(0)).state;

    // Rejected cards never increment progress or score.
    for (const [from, to] of [
      [T(4, 0), F(0)], // wrong category
      [T(3, 3), F(0)], // Neck item into King slot
      [T(3, 2), F(0)], // group into a foundation
    ]) {
      const r = moveCards(s, byId, from, to);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(s);
    }
    expect(foundationProgress(s.foundations[0], byId).collected).toBe(2);
    expect(s.score).toBe(0);

    const last = legal(s, T(2, 0), F(0));
    expect(last.completed).toMatchObject({ slot: 0, categoryTitle: 'King' });
    expect(last.completed.cards.map((c) => c.id)).toEqual(['king--title', 'king--throne', 'king--orb', 'king--scepter']);
    s = last.state;
    expect(s.score).toBe(COMPLETION_POINTS);
    expect(s.foundations[0]).toBeNull();
    expect(s.tableau[2]).toEqual([]);

    // Neck (4 items) completes in slot 1.
    for (let i = 3; i >= 0; i -= 1) {
      const r = legal(s, T(3, i), F(1));
      s = r.state;
      expect(!!r.completed).toBe(i === 0);
      expect(s.score).toBe(i === 0 ? 200 : 100);
    }
    expect(s.foundations[1]).toBeNull();

    // Freed slot 0 accepts another title; no further score change.
    expect(s.foundations.every((f) => f === null)).toBe(true);
    const withTitle = { ...s, tableau: s.tableau.map((c, i) => (i === 2 ? [up('wine--title')] : c)) };
    const reused = legal(withTitle, T(2, 0), F(0)).state;
    expect(reused.foundations[0].categoryTitle).toBe('Wine');
    expect(reused.score).toBe(200);

  });
});

describe('completion UI', () => {
  const UI_DECK = [
    { id: 'b1', categoryTitle: 'B', itemName: 'b1' },
    { id: 'b2', categoryTitle: 'B', itemName: 'b2' },
    { id: 'a1', categoryTitle: 'A', itemName: 'a1' },
    { id: 'At', categoryTitle: 'A', itemName: null },
    { id: 'Bt', categoryTitle: 'B', itemName: null },
  ];
  const identity = () => 0.999999; // deal follows deck order: col0 [b1,b2,a1,At↑], col1 [Bt↑]
  const card = (id) => document.querySelector(`[data-card-id="${id}"][data-face-up]`);
  const slot = () => screen.getByTestId('foundation-0');
  const tap = (el) => fireEvent.click(el);

  it('shows x/y, glitters on completion, scores 200 for two categories and reuses the slot', async () => {
    render(<App deckData={UI_DECK} rng={identity} />);
    tap(card('At'));
    tap(slot());
    expect(screen.getByTestId('foundation-progress-0').textContent).toBe('A 0/1');

    tap(card('a1'));
    tap(slot());
    expect(screen.getByTestId('score').textContent).toBe('Score: 100');
    expect(slot().dataset.empty).toBe('true');
    expect(screen.getByTestId('foundation-progress-0').textContent).toBe('');
    expect(screen.getByTestId('foundation-glitter-0')).toBeTruthy();

    // Slot is immediately receptive to another title.
    tap(card('Bt'));
    tap(slot());
    expect(slot().dataset.category).toBe('B');
    tap(card('b2'));
    tap(slot());
    expect(screen.getByTestId('foundation-progress-0').textContent).toBe('B 1/2');
    expect(screen.getByTestId('score').textContent).toBe('Score: 100');

    tap(card('b1'));
    tap(slot());
    expect(screen.getByTestId('score').textContent).toBe('Score: 200');
    expect(slot().dataset.empty).toBe('true');

    await waitFor(() => expect(screen.queryByTestId('foundation-glitter-0')).toBeNull(), { timeout: 3000 });
    expect(screen.getByTestId('score').textContent).toBe('Score: 200');
  });
});
