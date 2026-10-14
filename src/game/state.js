/**
 * Game state and transitions. Every transition is a pure function returning
 * `{ state, ok, reason?, completed? }`; a rejected transition returns the
 * original state object untouched.
 *
 * State shape:
 *   deck        immutable deck model (see deck.js)
 *   gameId      increments per new game, lets callers discard stale effects
 *   phase       'playing' | 'won'
 *   score       number
 *   stock       card ids, top of the pile is the last element
 *   waste       card ids (draft pile), top is the last element
 *   tableau     per column: [{ id, faceUp }], bottom-most visible card is last
 *   foundations per slot: null | { pile: [ids], clearing: boolean }
 */
import { FOUNDATION_SLOTS, POINTS_PER_CATEGORY, TABLEAU_SIZES } from './config.js';
import { shuffle } from './shuffle.js';
import { getMovableGroup, validateMove } from './rules.js';

const rejected = (state, reason) => ({ state, ok: false, reason });

export function createGame(deck, { random = Math.random, gameId = 1 } = {}) {
  const dealt = TABLEAU_SIZES.reduce((a, b) => a + b, 0);
  if (deck.cardIds.length < dealt) {
    throw new Error(`Deck needs at least ${dealt} cards to deal the tableau`);
  }
  const order = shuffle(deck.cardIds, random);
  let cursor = 0;
  const tableau = TABLEAU_SIZES.map((size) => {
    const ids = order.slice(cursor, cursor + size);
    cursor += size;
    return ids.map((id, i) => ({ id, faceUp: i === ids.length - 1 }));
  });
  return {
    deck,
    gameId,
    phase: 'playing',
    score: 0,
    stock: order.slice(cursor),
    waste: [],
    tableau,
    foundations: Array.from({ length: FOUNDATION_SLOTS }, () => null),
  };
}

export function isWon(state) {
  return (
    state.stock.length === 0 &&
    state.waste.length === 0 &&
    state.tableau.every((col) => col.length === 0) &&
    state.foundations.every((slot) => slot === null)
  );
}

/** Deal the top source card onto the draft pile. */
export function draw(state) {
  if (state.phase !== 'playing') return rejected(state, 'Game is not in play');
  if (state.stock.length === 0) return rejected(state, 'The source pile is empty');
  const card = state.stock[state.stock.length - 1];
  return {
    ok: true,
    state: { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, card] },
  };
}

/** Flip the draft pile back over to become the source pile (order inverted). */
export function recycle(state) {
  if (state.phase !== 'playing') return rejected(state, 'Game is not in play');
  if (state.stock.length > 0) return rejected(state, 'The source pile still has cards');
  if (state.waste.length === 0) return rejected(state, 'There are no cards to recycle');
  return { ok: true, state: { ...state, stock: [...state.waste].reverse(), waste: [] } };
}

function removeFromSource(state, source, count) {
  if (source.zone === 'waste') {
    return { waste: state.waste.slice(0, -count), tableau: state.tableau };
  }
  const tableau = state.tableau.map((col, i) => {
    if (i !== source.col) return col;
    const rest = col.slice(0, source.index);
    const last = rest[rest.length - 1];
    if (last && !last.faceUp) rest[rest.length - 1] = { ...last, faceUp: true };
    return rest;
  });
  return { waste: state.waste, tableau };
}

export function move(state, source, target) {
  const check = validateMove(state, source, target);
  if (!check.ok) return rejected(state, check.reason);
  const { ids } = check;

  const { waste, tableau } = removeFromSource(state, source, ids.length);
  let next = { ...state, waste, tableau };
  const completed = [];

  if (target.zone === 'tableau') {
    next.tableau = next.tableau.map((col, i) =>
      i === target.col ? [...col, ...ids.map((id) => ({ id, faceUp: true }))] : col,
    );
  } else {
    const slot = next.foundations[target.slot];
    const pile = slot ? [...slot.pile, ...ids] : [...ids];
    const category = state.deck.categories[state.deck.cards[pile[0]].category];
    const done = pile.length - 1 === category.total;
    const foundations = next.foundations.slice();
    foundations[target.slot] = { pile, clearing: done };
    next = { ...next, foundations };
    if (done) {
      next.score = state.score + POINTS_PER_CATEGORY;
      completed.push({ slot: target.slot, category: category.name });
    }
  }
  return { ok: true, state: next, completed };
}

/** Remove a finished category from its slot once its celebration is over. */
export function finishClear(state, slotIndex, categoryName) {
  const slot = state.foundations[slotIndex];
  if (!slot || !slot.clearing || state.deck.cards[slot.pile[0]].category !== categoryName) {
    return rejected(state, 'Nothing to clear');
  }
  const foundations = state.foundations.slice();
  foundations[slotIndex] = null;
  const next = { ...state, foundations };
  if (isWon(next)) next.phase = 'won';
  return { ok: true, state: next };
}

export { getMovableGroup };
