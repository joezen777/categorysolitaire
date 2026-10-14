import { describe, expect, it } from 'vitest';
import { cards } from '../deck';
import { dealGame } from './deal';

describe('initial deal', () => {
  const game = dealGame(cards);

  it('deals 4-8 cards per column, 30 total, 56 in source', () => {
    expect(game.tableau.map((c) => c.length)).toEqual([4, 5, 6, 7, 8]);
    expect(game.tableau.flat()).toHaveLength(30);
    expect(game.source).toHaveLength(56);
    expect(game.draft).toHaveLength(0);
  });

  it('places each of the 86 ids exactly once', () => {
    const ids = [...game.tableau.flat(), ...game.source, ...game.draft, ...game.foundations.flat()].map((c) => c.id);
    expect(ids).toHaveLength(86);
    expect(new Set(ids)).toEqual(new Set(cards.map((c) => c.id)));
  });

  it('has five empty foundations and score zero', () => {
    expect(game.foundations).toHaveLength(5);
    expect(game.foundations.every((f) => f.length === 0)).toBe(true);
    expect(game.score).toBe(0);
  });
});
