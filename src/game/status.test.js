import { describe, expect, it } from 'vitest';
import { cards, CARD_TYPE } from '../deck';
import { dealGame } from './deal';
import { moveCards } from './moves';
import { isWon } from './status';

describe('win detection', () => {
  it('a fresh game is not won', () => {
    expect(isWon(dealGame(cards), cards.length)).toBe(false);
  });

  it('clearing all 13 categories scores 1300 and wins', () => {
    // Draft top is the last element: feed each category's title then its items.
    const order = [];
    for (const t of cards.filter((c) => c.type === CARD_TYPE.TITLE)) {
      order.push(t, ...cards.filter((c) => c.type === CARD_TYPE.ITEM && c.categoryTitle === t.categoryTitle));
    }
    let game = { ...dealGame(cards), tableau: [[], [], [], [], []], faceUpCounts: [0, 0, 0, 0, 0], source: [], draft: order.reverse() };
    for (let i = 0; i < 13; i++) {
      expect(isWon(game, cards.length)).toBe(false);
      while (game.draft.length) {
        const r = moveCards(game, { type: 'draft' }, { type: 'foundation', slot: 0 });
        expect(r.ok).toBe(true);
        game = r.game;
        if (r.completed) break;
      }
    }
    expect(game.score).toBe(1300);
    expect(game.cleared).toHaveLength(86);
    expect(isWon(game, cards.length)).toBe(true);
  });

  it('is not won while cards remain anywhere', () => {
    const base = { ...dealGame(cards), tableau: [[], [], [], [], []], source: [], draft: [], cleared: cards.slice(0, 85) };
    expect(isWon({ ...base, draft: [cards[85]] }, 86)).toBe(false);
    expect(isWon({ ...base, foundations: [[cards[85]], [], [], [], []] }, 86)).toBe(false);
  });
});
