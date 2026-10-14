import { describe, expect, it } from 'vitest';
import { cards } from '../deck';
import { dealGame } from './deal';
import { drawCard, recycleDraft } from './draw';
import { moveCards } from './moves';
import { isWon } from './status';

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function allSources(game) {
  const out = [{ type: 'draft' }];
  game.tableau.forEach((col, c) => col.forEach((_, index) => out.push({ type: 'tableau', col: c, index })));
  return out;
}
function allDestinations() {
  return [0, 1, 2, 3, 4].flatMap((n) => [{ type: 'tableau', col: n }, { type: 'foundation', slot: n }]);
}

function checkInvariants(game) {
  const ids = [...game.tableau.flat(), ...game.source, ...game.draft, ...game.foundations.flat(), ...game.cleared].map((c) => c.id);
  expect(ids).toHaveLength(86);
  expect(new Set(ids).size).toBe(86);
  game.tableau.forEach((col, i) => {
    const fu = game.faceUpCounts[i];
    expect(fu).toBeGreaterThanOrEqual(col.length ? 1 : 0);
    expect(fu).toBeLessThanOrEqual(col.length);
  });
  expect(game.score % 100).toBe(0);
}

describe('randomized play keeps the game consistent', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: random legal moves, draws and recycles', (seed) => {
    const rng = seeded(seed);
    let game = dealGame(cards, rng);
    expect(game.tableau.map((c) => c.length)).toEqual([4, 5, 6, 7, 8]);
    for (let step = 0; step < 1500; step++) {
      const legal = [];
      for (const from of allSources(game)) {
        for (const to of allDestinations()) {
          const r = moveCards(game, from, to);
          if (r.ok) legal.push(r);
        }
      }
      const roll = rng();
      let next = game;
      if (legal.length && roll < 0.7) next = legal[Math.floor(rng() * legal.length)].game;
      else if (game.source.length) next = drawCard(game);
      else next = recycleDraft(game);
      game = next;
      checkInvariants(game);
      if (isWon(game, cards.length)) break;
    }
    expect(game.score).toBe(game.cleared.filter((c) => c.type === 'title').length * 100);
  });
});
