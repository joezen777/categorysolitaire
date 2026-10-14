import { describe, expect, it } from 'vitest';
import { foundationProgress, moveCards } from './moves';

const title = (cat, n = 3) => ({ type: 'title', id: `title:${cat}`, categoryTitle: cat, itemCount: n });
const item = (cat, name) => ({ type: 'item', id: `${cat}-${name}`, categoryTitle: cat, itemName: name });
const T = (c, n) => ({ from: { type: 'tableau', col: c, index: n }, });

function state(tableau, faceUpCounts, { draft = [], foundations } = {}) {
  return {
    tableau,
    faceUpCounts,
    source: [],
    draft,
    foundations: foundations ?? [[], [], [], [], []],
    score: 0,
  };
}
const tab = (c, to = {}) => ({ type: 'tableau', col: c, ...to });
const fnd = (slot) => ({ type: 'foundation', slot });

describe('title card moves', () => {
  const base = () =>
    state(
      [[item('Wine', 'Merlot'), title('King')], [item('King', 'Orb')], [], [item('Wine', 'Cava')], [item('Pirate', 'Rum'), title('Wine')]],
      [1, 1, 0, 1, 1],
    );

  it('goes to an empty column, a same-category item, or an empty foundation', () => {
    const g = base();
    expect(moveCards(g, tab(0, { index: 1 }), tab(2)).ok).toBe(true);
    expect(moveCards(g, tab(0, { index: 1 }), tab(1)).ok).toBe(true); // King on King item
    expect(moveCards(g, tab(0, { index: 1 }), fnd(0)).ok).toBe(true);
  });

  it('is rejected on a wrong-category item, a title, or a filled foundation slot', () => {
    const g = base();
    for (const to of [tab(3), tab(4)]) {
      const r = moveCards(g, tab(0, { index: 1 }), to);
      expect(r.ok).toBe(false);
      expect(r.game).toBe(g);
    }
    const g2 = { ...g, foundations: [[title('Pirate')], [], [], [], []] };
    expect(moveCards(g2, tab(0, { index: 1 }), fnd(0)).ok).toBe(false);
  });
});

describe('item card moves', () => {
  it('goes to a same-category item or an empty column; not to wrong category, a title, or empty foundation', () => {
    const g = state(
      [[title('Wine'), item('Wine', 'Merlot')], [item('Wine', 'Cava')], [item('Pirate', 'Rum')], [], [title('King')]],
      [1, 1, 1, 0, 1],
    );
    const from = tab(0, { index: 1 });
    expect(moveCards(g, from, tab(1)).ok).toBe(true);
    expect(moveCards(g, from, tab(3)).ok).toBe(true);
    for (const to of [tab(2), tab(4), fnd(0)]) {
      const r = moveCards(g, from, to);
      expect(r.ok).toBe(false);
      expect(r.game).toBe(g);
    }
  });

  it('moves onto a foundation only when the slot holds the same category title', () => {
    const g = state([[item('Wine', 'Merlot')], [item('Pirate', 'Rum')], [], [], []], [1, 1, 0, 0, 0], {
      foundations: [[title('Wine')], [title('King')], [], [], []],
    });
    const ok = moveCards(g, tab(0, { index: 0 }), fnd(0));
    expect(ok.ok).toBe(true);
    expect(ok.game.foundations[0]).toHaveLength(2);
    expect(moveCards(g, tab(1, { index: 0 }), fnd(0)).ok).toBe(false);
    expect(moveCards(g, tab(1, { index: 0 }), fnd(1)).ok).toBe(false);
    expect(moveCards(g, tab(1, { index: 0 }), fnd(2)).ok).toBe(false);
  });

  it('a face-down card cannot be moved', () => {
    const g = state([[item('Wine', 'Merlot'), item('Wine', 'Cava')], [item('Wine', 'Rose')], [], [], []], [1, 1, 0, 0, 0]);
    const r = moveCards(g, tab(0, { index: 0 }), tab(1));
    expect(r.ok).toBe(false);
    expect(r.game).toBe(g);
  });
});

describe('groups', () => {
  const g = () =>
    state(
      [
        [title('King'), item('Wine', 'A'), item('Wine', 'B'), item('Wine', 'C')],
        [item('Wine', 'D')],
        [item('Pirate', 'Rum')],
        [],
        [item('Wine', 'X'), item('Wine', 'Y'), title('Wine')],
      ],
      [3, 1, 1, 0, 3],
      { foundations: [[title('Wine')], [], [], [], []] },
    );

  it('moves a same-category stack together to a legal column and reveals the new bottom', () => {
    const r = moveCards(g(), tab(0, { index: 1 }), tab(1));
    expect(r.ok).toBe(true);
    expect(r.game.tableau[1].map((c) => c.itemName)).toEqual(['D', 'A', 'B', 'C']);
    expect(r.game.faceUpCounts[1]).toBe(4);
    expect(r.game.tableau[0]).toHaveLength(1);
    expect(r.game.faceUpCounts[0]).toBe(1); // King title flipped face up
    expect(moveCards(g(), tab(0, { index: 1 }), tab(3)).ok).toBe(true);
    expect(moveCards(g(), tab(0, { index: 1 }), tab(3)).game.faceUpCounts[3]).toBe(3);
  });

  it('rejects stacks on wrong-category columns and on foundation slots', () => {
    const s = g();
    expect(moveCards(s, tab(0, { index: 1 }), tab(2)).ok).toBe(false);
    expect(moveCards(s, tab(0, { index: 1 }), fnd(0)).ok).toBe(false);
    const r = moveCards(s, tab(0, { index: 1 }), fnd(0));
    expect(r.game).toBe(s);
  });

  it('rejects mixed stacks containing a title', () => {
    const s = g();
    expect(moveCards(s, tab(4, { index: 0 }), tab(3)).ok).toBe(false);
    expect(moveCards(s, tab(4, { index: 1 }), tab(3)).ok).toBe(false);
    expect(moveCards(s, tab(4, { index: 2 }), tab(3)).ok).toBe(true); // title alone
  });
});

describe('draft and reveal', () => {
  it('moving the draft top exposes the next draft top', () => {
    const g = state([[item('Wine', 'A')], [], [], [], []], [1, 0, 0, 0, 0], {
      draft: [item('Pirate', 'Rum'), item('Wine', 'Cava')],
    });
    const r = moveCards(g, { type: 'draft' }, tab(0));
    expect(r.ok).toBe(true);
    expect(r.game.draft.map((c) => c.itemName)).toEqual(['Rum']);
    expect(r.game.tableau[0]).toHaveLength(2);
    expect(moveCards({ ...g, draft: [] }, { type: 'draft' }, tab(1)).ok).toBe(false);
  });

  it('flips the vacated bottom card and keeps already face-up cards', () => {
    const g = state(
      [[item('Pirate', 'Rum'), item('Wine', 'A'), item('Wine', 'B')], [], [], [], []],
      [2, 0, 0, 0, 0],
    );
    const r = moveCards(g, tab(0, { index: 2 }), tab(1));
    expect(r.game.faceUpCounts[0]).toBe(1);
    const r2 = moveCards(r.game, tab(0, { index: 1 }), tab(2));
    expect(r2.game.faceUpCounts[0]).toBe(1); // Rum revealed
  });
});

describe('foundation progress', () => {
  it('counts only item cards', () => {
    expect(foundationProgress([])).toBeNull();
    expect(foundationProgress([title('Wine', 6)])).toEqual({ categoryTitle: 'Wine', collected: 0, total: 6 });
    expect(foundationProgress([title('Wine', 6), item('Wine', 'a'), item('Wine', 'b')]).collected).toBe(2);
  });
});

describe('category completion', () => {
  const full = (cat, names) => [title(cat, names.length), ...names.slice(0, -1).map((n) => item(cat, n))];

  it('awards 100 once, clears the slot and keeps incomplete categories', () => {
    let g = state([[item('King', 'Throne')], [item('Wine', 'Rose')], [], [], []], [1, 1, 0, 0, 0], {
      foundations: [full('King', ['Scepter', 'Orb', 'Throne']), [title('Wine', 6)], [], [], []],
    });
    const r = moveCards(g, tab(0, { index: 0 }), fnd(0));
    expect(r.ok).toBe(true);
    expect(r.completed).toEqual({ slot: 0, categoryTitle: 'King' });
    expect(r.game.score).toBe(100);
    expect(r.game.foundations[0]).toEqual([]);
    expect(r.game.cleared).toHaveLength(4);
    // incomplete category keeps slot, no score
    const r2 = moveCards(g, tab(1, { index: 0 }), fnd(1));
    expect(r2.completed).toBeUndefined();
    expect(r2.game.score).toBe(0);
    expect(r2.game.foundations[1]).toHaveLength(2);
  });

  it('rejected cards never change progress or score; slot reusable; two completions give 200', () => {
    const g = state([[item('King', 'Throne')], [title('Wine', 1)], [item('Wine', 'Rose')], [], []], [1, 1, 1, 0, 0], {
      foundations: [full('King', ['Scepter', 'Orb', 'Throne']), [], [], [], []],
    });
    const bad = moveCards(g, tab(2, { index: 0 }), fnd(0));
    expect(bad.ok).toBe(false);
    expect(bad.game).toBe(g);
    expect(g.score).toBe(0);

    let r = moveCards(g, tab(0, { index: 0 }), fnd(0));
    expect(r.game.score).toBe(100);
    r = moveCards(r.game, tab(1, { index: 0 }), fnd(0)); // slot 0 receives a new title
    expect(r.ok).toBe(true);
    expect(r.game.score).toBe(100);
    r = moveCards(r.game, tab(2, { index: 0 }), fnd(0));
    expect(r.game.score).toBe(200);
    expect(r.game.foundations[0]).toEqual([]);
    expect(r.game.cleared.map((c) => c.id)).toContain('title:Wine');
  });
});
