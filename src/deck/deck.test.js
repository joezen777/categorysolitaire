import { describe, expect, it } from 'vitest';
import { cards, starterDeck, CARD_TYPE } from './index';

describe('starter deck', () => {
  it('has 13 title cards, 73 item cards, 86 total with unique ids', () => {
    const titles = cards.filter((c) => c.type === CARD_TYPE.TITLE);
    expect(titles).toHaveLength(13);
    expect(cards.filter((c) => c.type === CARD_TYPE.ITEM)).toHaveLength(73);
    expect(cards).toHaveLength(86);
    expect(new Set(cards.map((c) => c.id)).size).toBe(86);
  });

  it('title counts match item data', () => {
    for (const t of cards.filter((c) => c.type === CARD_TYPE.TITLE)) {
      const n = starterDeck.filter((d) => d.categoryTitle === t.categoryTitle).length;
      expect(t.itemCount).toBe(n);
    }
  });
});
