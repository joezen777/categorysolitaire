import { describe, expect, it } from 'vitest';
import { cards } from '../deck';
import { dealGame } from './deal';
import { drawCard, recycleDraft } from './draw';

const mk = (ids) => ids.map((id) => ({ id }));
// source top is the last element, so 'a' is drawn first
const small = () => ({ source: mk(['c', 'b', 'a']), draft: [], tableau: [], foundations: [], score: 0 });
const ids = (list) => list.map((c) => c.id);

describe('draw and recycle', () => {
  it('draws exactly one card per call', () => {
    let g = drawCard(small());
    expect(ids(g.source)).toEqual(['c', 'b']);
    expect(ids(g.draft)).toEqual(['a']);
    g = drawCard(g);
    expect(ids(g.draft)).toEqual(['a', 'b']);
  });

  it('recycles with inverted order: former draft bottom drawn first', () => {
    let g = small();
    g = drawCard(drawCard(drawCard(g))); // draft bottom->top: a, b, c
    expect(g.source).toHaveLength(0);
    g = recycleDraft(g);
    expect(g.draft).toHaveLength(0);
    expect(ids(g.source)).toEqual(['c', 'b', 'a']);
    g = drawCard(g);
    expect(ids(g.draft)).toEqual(['a']);
    g = drawCard(drawCard(g));
    expect(ids(g.draft)).toEqual(['a', 'b', 'c']);
  });

  it('does nothing on empty source and empty draft, or recycle with cards left in source', () => {
    const empty = { source: [], draft: [] };
    expect(drawCard(empty)).toBe(empty);
    expect(recycleDraft(empty)).toBe(empty);
    const g = drawCard(small());
    expect(recycleDraft(g)).toBe(g);
  });

  it('conserves all 86 cards over repeated cycles', () => {
    let g = dealGame(cards);
    const tableauBefore = ids(g.tableau.flat());
    for (let cycle = 0; cycle < 3; cycle++) {
      while (g.source.length) g = drawCard(g);
      expect(g.draft).toHaveLength(56);
      g = recycleDraft(g);
      expect(g.source).toHaveLength(56);
      const all = [...g.tableau.flat(), ...g.source, ...g.draft, ...g.foundations.flat()];
      expect(new Set(ids(all)).size).toBe(86);
      expect(all).toHaveLength(86);
    }
    expect(ids(g.tableau.flat())).toEqual(tableauBefore);
  });
});
