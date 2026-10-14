// Pure game logic. No React here so it can be unit tested in isolation.
//
// Locations a move can come FROM:
//   { zone: 'waste' }                      top card of the draft pile
//   { zone: 'tableau', col, index }        card at `index` (and everything below it)
// Targets a move can go TO:
//   { zone: 'tableau', col }
//   { zone: 'foundation', slot }
import { CARD_ITEM, CARD_TITLE, buildCards, shuffle } from './deck';

export const COLUMN_SIZES = [4, 5, 6, 7, 8];
export const FOUNDATION_SLOTS = 5;
export const POINTS_PER_CATEGORY = 100;

export function createGame(entries, random = Math.random) {
  const { cards, categoryCount } = buildCards(entries);
  const deck = shuffle(cards, random);
  const tableau = COLUMN_SIZES.map((size) => {
    const column = deck.splice(0, size).map((card) => ({ card, faceUp: false }));
    if (column.length) column[column.length - 1].faceUp = true;
    return column;
  });
  return {
    stock: deck,
    waste: [],
    tableau,
    foundation: Array.from({ length: FOUNDATION_SLOTS }, () => null),
    score: 0,
    completedCategories: 0,
    categoryCount,
    moves: 0,
  };
}

export function isWon(state) {
  return state.completedCategories >= state.categoryCount;
}

// Draw one card from the source deck, or recycle the draft pile when empty.
export function drawOrRecycle(state) {
  if (state.stock.length > 0) {
    const stock = state.stock.slice(0, -1);
    const card = state.stock[state.stock.length - 1];
    return { ...state, stock, waste: [...state.waste, card] };
  }
  if (state.waste.length === 0) return state;
  // The bottom of the draft pile (first drawn) becomes the next card drawn.
  return { ...state, stock: state.waste.slice().reverse(), waste: [] };
}

// A run of tableau cards is movable when every card is face up, all share one
// category, and a title card (if any) sits at the very end of the run.
function isMovableRun(run) {
  if (run.length === 0) return false;
  const category = run[0].card.category;
  return run.every(
    (entry, i) =>
      entry.faceUp &&
      entry.card.category === category &&
      (entry.card.type === CARD_ITEM || i === run.length - 1),
  );
}

export function getMovingCards(state, from) {
  if (!from) return null;
  if (from.zone === 'waste') {
    const top = state.waste[state.waste.length - 1];
    return top ? [top] : null;
  }
  if (from.zone === 'tableau') {
    const column = state.tableau[from.col];
    if (!column || from.index < 0 || from.index >= column.length) return null;
    const run = column.slice(from.index);
    return isMovableRun(run) ? run.map((e) => e.card) : null;
  }
  return null;
}

export function canMove(state, from, to) {
  const cards = getMovingCards(state, from);
  if (!cards || !to) return false;
  const lead = cards[0];

  if (to.zone === 'tableau') {
    if (from.zone === 'tableau' && from.col === to.col) return false;
    const column = state.tableau[to.col];
    if (!column) return false;
    if (column.length === 0) return true;
    const top = column[column.length - 1];
    return top.faceUp && top.card.type === CARD_ITEM && top.card.category === lead.category;
  }

  if (to.zone === 'foundation') {
    if (to.slot < 0 || to.slot >= state.foundation.length) return false;
    const slot = state.foundation[to.slot];
    if (!slot) return cards.length === 1 && lead.type === CARD_TITLE;
    if (slot.completing) return false;
    return cards.every((c) => c.type === CARD_ITEM && c.category === slot.title.category);
  }
  return false;
}

function removeFromSource(state, from) {
  if (from.zone === 'waste') {
    return { ...state, waste: state.waste.slice(0, -1) };
  }
  const tableau = state.tableau.slice();
  const column = tableau[from.col].slice(0, from.index);
  const last = column[column.length - 1];
  if (last && !last.faceUp) column[column.length - 1] = { ...last, faceUp: true };
  tableau[from.col] = column;
  return { ...state, tableau };
}

export function applyMove(state, from, to) {
  if (!canMove(state, from, to)) return state;
  const cards = getMovingCards(state, from);
  let next = removeFromSource(state, from);

  if (to.zone === 'tableau') {
    const tableau = next.tableau.slice();
    tableau[to.col] = [...tableau[to.col], ...cards.map((card) => ({ card, faceUp: true }))];
    next = { ...next, tableau };
  } else {
    const foundation = next.foundation.slice();
    const slot = foundation[to.slot];
    if (!slot) {
      foundation[to.slot] = { title: cards[0], items: [], completing: false };
    } else {
      const items = [...slot.items, ...cards];
      foundation[to.slot] = {
        ...slot,
        items,
        completing: items.length >= slot.title.total,
      };
    }
    next = { ...next, foundation };
  }
  return { ...next, moves: next.moves + 1 };
}

// Called once the glitter animation for a completed category has finished.
export function clearSlot(state, slotIndex) {
  const slot = state.foundation[slotIndex];
  if (!slot || !slot.completing) return state;
  const foundation = state.foundation.slice();
  foundation[slotIndex] = null;
  return {
    ...state,
    foundation,
    score: state.score + POINTS_PER_CATEGORY,
    completedCategories: state.completedCategories + 1,
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.entries, action.random);
    case 'DRAW':
      return drawOrRecycle(state);
    case 'MOVE':
      return applyMove(state, action.from, action.to);
    case 'CLEAR_SLOT':
      return clearSlot(state, action.slot);
    default:
      return state;
  }
}
