import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { buildDeck } from '../decks/deck.js';
import { moveCards, checkMove, foundationProgress, getMovingCards } from './rules.js';
import App from '../App.jsx';

afterEach(cleanup);

const DECK = [
  { id: 'At', categoryTitle: 'A', itemName: null },
  { id: 'a1', categoryTitle: 'A', itemName: 'a1' },
  { id: 'a2', categoryTitle: 'A', itemName: 'a2' },
  { id: 'a3', categoryTitle: 'A', itemName: 'a3' },
  { id: 'Bt', categoryTitle: 'B', itemName: null },
  { id: 'b1', categoryTitle: 'B', itemName: 'b1' },
  { id: 'b2', categoryTitle: 'B', itemName: 'b2' },
  { id: 'b3', categoryTitle: 'B', itemName: 'b3' },
];
const { cards } = buildDeck(DECK);
const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

const up = (id) => ({ id, faceUp: true });
const down = (id) => ({ id, faceUp: false });

function makeState({ tableau = [], draft = [], foundations = [] } = {}) {
  const cols = [0, 1, 2, 3, 4].map((i) => tableau[i] ?? []);
  const fnd = [0, 1, 2, 3, 4].map((i) => foundations[i] ?? null);
  return { source: [], draft, foundations: fnd, tableau: cols, score: 0 };
}

const T = (col, index) => ({ type: 'tableau', col, index });
const toCol = (col) => ({ type: 'tableau', col });
const toF = (slot) => ({ type: 'foundation', slot });
const DRAFT = { type: 'draft' };

function expectLegal(state, from, to) {
  const r = moveCards(state, byId, from, to);
  expect(r.reason).toBeUndefined();
  expect(r.ok).toBe(true);
  return r.state;
}

function expectIllegal(state, from, to, pattern) {
  const snapshot = structuredClone(state);
  const r = moveCards(state, byId, from, to);
  expect(r.ok).toBe(false);
  expect(r.state).toBe(state);
  expect(state).toEqual(snapshot);
  if (pattern) expect(r.reason).toMatch(pattern);
}

describe('title card moves', () => {
  it('goes to an empty tableau column', () => {
    const s = expectLegal(makeState({ tableau: [[down('b1'), up('At')]] }), T(0, 1), toCol(1));
    expect(s.tableau[1]).toEqual([up('At')]);
  });

  it('goes onto a same-category item card in the tableau', () => {
    const s = expectLegal(makeState({ tableau: [[up('At')], [up('a1')]] }), T(0, 0), toCol(1));
    expect(s.tableau[1]).toEqual([up('a1'), up('At')]);
    expect(s.tableau[0]).toEqual([]);
  });

  it('goes into an empty foundation slot', () => {
    const s = expectLegal(makeState({ tableau: [[up('At')]] }), T(0, 0), toF(2));
    expect(s.foundations[2]).toEqual({ categoryTitle: 'A', cards: [up('At')] });
  });

  it('is rejected onto a wrong-category item', () => {
    expectIllegal(makeState({ tableau: [[up('At')], [up('b1')]] }), T(0, 0), toCol(1), /does not belong/);
  });

  it('is rejected onto another title card in the tableau', () => {
    expectIllegal(makeState({ tableau: [[up('At')], [up('Bt')]] }), T(0, 0), toCol(1), /title/);
  });

  it('is rejected onto an occupied foundation slot', () => {
    const state = makeState({ tableau: [[up('At')]], foundations: [{ categoryTitle: 'B', cards: [up('Bt')] }] });
    expectIllegal(state, T(0, 0), toF(0), /taken/);
  });

  it('cannot move while covered by other cards', () => {
    expectIllegal(makeState({ tableau: [[up('At'), up('a1')]] }), T(0, 0), toCol(1), /same-category item/);
  });
});

describe('item card moves', () => {
  it('goes onto a same-category item in the tableau', () => {
    const s = expectLegal(makeState({ tableau: [[up('a1')], [up('a2')]] }), T(0, 0), toCol(1));
    expect(s.tableau[1]).toEqual([up('a2'), up('a1')]);
  });

  it('goes to an empty tableau column', () => {
    const s = expectLegal(makeState({ tableau: [[up('a1')]] }), T(0, 0), toCol(3));
    expect(s.tableau[3]).toEqual([up('a1')]);
  });

  it('goes into a foundation holding its title, then onto a same-category item there', () => {
    let s = makeState({ tableau: [[up('a1')], [up('a2')]], foundations: [{ categoryTitle: 'A', cards: [up('At')] }] });
    s = expectLegal(s, T(0, 0), toF(0));
    s = expectLegal(s, T(1, 0), toF(0));
    expect(s.foundations[0].cards).toEqual([up('At'), up('a1'), up('a2')]);
    expect(foundationProgress(s.foundations[0], byId)).toEqual({ categoryTitle: 'A', collected: 2, total: 3 });
  });

  it('is rejected onto a wrong-category item in the tableau', () => {
    expectIllegal(makeState({ tableau: [[up('a1')], [up('b1')]] }), T(0, 0), toCol(1), /does not belong/);
  });

  it('is rejected onto a title card in the tableau', () => {
    expectIllegal(makeState({ tableau: [[up('a1')], [up('At')]] }), T(0, 0), toCol(1), /title/);
  });

  it('is rejected into an empty foundation slot', () => {
    expectIllegal(makeState({ tableau: [[up('a1')]] }), T(0, 0), toF(0), /title card first/);
  });

  it('is rejected into a wrong-category foundation', () => {
    const state = makeState({ tableau: [[up('a1')]], foundations: [{ categoryTitle: 'B', cards: [up('Bt'), up('b1')] }] });
    expectIllegal(state, T(0, 0), toF(0), /does not belong/);
  });
});

describe('face-down and invalid sources/destinations', () => {
  it('rejects moving a face-down card', () => {
    expectIllegal(makeState({ tableau: [[down('a1'), up('a2')]] }), T(0, 0), toCol(1), /face-up/);
  });

  it('rejects placing onto a face-down card', () => {
    expectIllegal(makeState({ tableau: [[up('a1')], [down('a2')]] }), T(0, 0), toCol(1), /face-down/);
  });

  it('rejects moving to the same column', () => {
    expectIllegal(makeState({ tableau: [[up('a1')]] }), T(0, 0), toCol(0));
  });

  it('rejects drawing from an empty draft', () => {
    expectIllegal(makeState(), DRAFT, toCol(0), /empty/);
  });
});

describe('item groups', () => {
  const groupState = () => makeState({ tableau: [[down('Bt'), up('a3'), up('a2'), up('a1')], [up('b2')]] });

  it('moves a same-category item sequence together to an empty column', () => {
    const s = expectLegal(makeState({ tableau: [[down('Bt'), up('a3'), up('a2')]] }), T(0, 1), toCol(2));
    expect(s.tableau[2]).toEqual([up('a3'), up('a2')]);
    expect(s.tableau[0]).toEqual([up('Bt')]);
  });

  it('moves a same-category item sequence onto a same-category item', () => {
    const s = expectLegal(makeState({ tableau: [[up('b1'), up('a3'), up('a2')], [up('a1')]] }), T(0, 1), toCol(1));
    expect(s.tableau[1]).toEqual([up('a1'), up('a3'), up('a2')]);
    expect(s.tableau[0]).toEqual([up('b1')]);
  });

  it('rejects a group onto a wrong-category item', () => {
    expectIllegal(makeState({ tableau: [[up('a3'), up('a2')], [up('b1')]] }), T(0, 0), toCol(1));
  });

  it('rejects a group into a foundation (single-card destination)', () => {
    const state = makeState({ tableau: [[up('a3'), up('a2')]], foundations: [{ categoryTitle: 'A', cards: [up('At')] }] });
    expectIllegal(state, T(0, 0), toF(0), /one card/);
  });

  it('rejects mixed-category sequences and sequences containing a title', () => {
    expectIllegal(makeState({ tableau: [[up('a1'), up('b1')]] }), T(0, 0), toCol(1), /same-category/);
    expectIllegal(makeState({ tableau: [[up('a1'), up('At')]] }), T(0, 0), toCol(1), /same-category/);
    expect(getMovingCards(groupState(), byId, T(0, 1)).cards).toHaveLength(3);
  });
});

describe('draft source and reveal', () => {
  it('moving the draft top exposes the next draft card', () => {
    let s = makeState({ draft: [up('b1'), up('a2')], tableau: [[up('a1')]] });
    s = expectLegal(s, DRAFT, toCol(0));
    expect(s.draft).toEqual([up('b1')]);
    expect(s.tableau[0]).toEqual([up('a1'), up('a2')]);
    s = expectLegal(s, DRAFT, toCol(1));
    expect(s.draft).toEqual([]);
  });

  it('draft title goes to an empty foundation; draft items are rejected into wrong slots', () => {
    let s = makeState({ draft: [up('b1'), up('At')] });
    s = expectLegal(s, DRAFT, toF(4));
    expect(s.foundations[4].categoryTitle).toBe('A');
    expectIllegal(s, DRAFT, toF(4), /does not belong/);
    expectIllegal(s, DRAFT, toF(0), /title card first/);
  });

  it('flips the newly exposed bottom card after a move, keeping face-up cards face up', () => {
    let s = makeState({ tableau: [[down('b1'), down('Bt'), up('a1')], [up('a2')]] });
    s = expectLegal(s, T(0, 2), toCol(1));
    expect(s.tableau[0]).toEqual([down('b1'), up('Bt')]);
    expect(s.tableau[1]).toEqual([up('a2'), up('a1')]);
  });

  it('does not flip when the vacated column already has a face-up bottom', () => {
    const s = expectLegal(makeState({ tableau: [[down('b1'), up('a3'), up('a1')]] }), T(0, 2), toCol(1));
    expect(s.tableau[0]).toEqual([down('b1'), up('a3')]);
  });
});

describe('checkMove purity', () => {
  it('returns null for legal and a reason for illegal moves', () => {
    const s = makeState({ tableau: [[up('a1')], [up('a2')], [up('b1')]] });
    expect(checkMove(s, byId, T(0, 0), toCol(1))).toBeNull();
    expect(checkMove(s, byId, T(0, 0), toCol(2))).toMatch(/does not belong/);
  });
});

describe('tap-to-move UI', () => {
  // rng near 1 makes the shuffle an identity, so the deal follows deck order:
  // column 0 = [b1, b2, a2, At↑], column 1 = [Bt, b3, a3, a1↑], others empty.
  const UI_DECK = ['b1', 'b2', 'a2', 'At', 'Bt', 'b3', 'a3', 'a1'].map((id) => DECK.find((c) => c.id === id));
  const identity = () => 0.999999;
  const col = (i) => screen.getByTestId(`tableau-column-${i}`);
  const cardIn = (i, id) => col(i).querySelector(`[data-card-id="${id}"]`);
  const idsIn = (i) => [...col(i).children].map((el) => el.dataset.cardId).filter(Boolean);

  it('selects, moves, rejects visibly, moves groups and reveals', () => {
    render(<App deckData={UI_DECK} rng={identity} />);
    expect(idsIn(0)).toEqual(['b1', 'b2', 'a2', 'At']);
    expect(idsIn(1)).toEqual(['Bt', 'b3', 'a3', 'a1']);

    // Title to an empty foundation; column 0 reveals a2.
    fireEvent.click(cardIn(0, 'At'));
    expect(cardIn(0, 'At').dataset.selected).toBe('true');
    fireEvent.click(screen.getByTestId('foundation-0'));
    expect(screen.getByTestId('foundation-0').dataset.category).toBe('A');
    expect(cardIn(0, 'a2').dataset.faceUp).toBe('true');

    // Item into an empty foundation is rejected visibly and nothing moves.
    fireEvent.click(cardIn(1, 'a1'));
    fireEvent.click(screen.getByTestId('foundation-1'));
    expect(screen.getByTestId('rejection').textContent).toMatch(/title card first/);
    expect(idsIn(1)).toEqual(['Bt', 'b3', 'a3', 'a1']);
    expect(screen.getByTestId('foundation-1').dataset.empty).toBe('true');

    // Same item into its title's foundation; progress counts items only.
    fireEvent.click(screen.getByTestId('foundation-0'));
    expect(screen.getByTestId('foundation-progress-0').textContent).toBe('A 1/3');
    expect(cardIn(1, 'a3').dataset.faceUp).toBe('true');

    // a3 onto a2 (same category), then the a2+a3 group to an empty column.
    fireEvent.click(cardIn(1, 'a3'));
    fireEvent.click(cardIn(0, 'a2'));
    expect(idsIn(0)).toEqual(['b1', 'b2', 'a2', 'a3']);
    expect(cardIn(1, 'b3').dataset.faceUp).toBe('true');
    fireEvent.click(cardIn(0, 'a2'));
    fireEvent.click(screen.getByTestId('tableau-empty-2'));
    expect(idsIn(2)).toEqual(['a2', 'a3']);
    expect(idsIn(0)).toEqual(['b1', 'b2']);
    expect(cardIn(0, 'b2').dataset.faceUp).toBe('true');

    // Wrong-category item onto a column is rejected; face-down cards cannot be selected.
    fireEvent.click(cardIn(1, 'b3'));
    fireEvent.click(cardIn(2, 'a3'));
    expect(within(screen.getByTestId('rejection')).getByText(/does not belong/)).toBeTruthy();
    expect(idsIn(1)).toEqual(['Bt', 'b3']);
    fireEvent.click(cardIn(1, 'b3')); // deselect
    fireEvent.click(cardIn(0, 'b1'));
    expect(screen.getByTestId('rejection').textContent).toMatch(/face-up/);
    expect(cardIn(0, 'b1').dataset.selected).toBe('false');
  });
});
