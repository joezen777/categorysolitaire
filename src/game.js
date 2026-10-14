import { activeDeck } from './decks';

export const COLUMN_SIZES = [4, 5, 6, 7, 8];
export const FOUNDATION_SLOTS = 5;
export const POINTS_PER_CATEGORY = 100;

export const isTitle = (card) => card.itemName === null;

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Adds derived `total` (number of items in category) to title cards.
export function buildCards(deck) {
  const counts = {};
  deck.forEach((c) => {
    if (c.itemName !== null) counts[c.categoryTitle] = (counts[c.categoryTitle] || 0) + 1;
  });
  return deck.map((c) => ({ ...c, total: counts[c.categoryTitle] || 0 }));
}

export function newGame(deck = activeDeck) {
  const cards = shuffle(buildCards(deck));
  let pos = 0;
  const tableau = COLUMN_SIZES.map((size) => {
    const col = cards.slice(pos, pos + size).map((card) => ({ card, up: false }));
    pos += size;
    if (col.length) col[col.length - 1].up = true;
    return col;
  });
  return {
    stock: cards.slice(pos), // top = last element
    waste: [], // top = last element
    foundation: Array(FOUNDATION_SLOTS).fill(null), // { category, total, count, complete }
    tableau,
    score: 0,
    won: false,
  };
}

export function drawOrRecycle(state) {
  if (state.stock.length) {
    const stock = state.stock.slice(0, -1);
    const waste = [...state.waste, state.stock[state.stock.length - 1]];
    return { ...state, stock, waste };
  }
  if (state.waste.length) {
    return { ...state, stock: [...state.waste].reverse(), waste: [] };
  }
  return state;
}

// Returns the cards being moved for a source, or null if it can't be moved.
// src: {type:'waste'} | {type:'tab', col, idx}
export function getMovingCards(state, src) {
  if (src.type === 'waste') {
    const top = state.waste[state.waste.length - 1];
    return top ? [top] : null;
  }
  const col = state.tableau[src.col];
  const entry = col && col[src.idx];
  if (!entry || !entry.up) return null;
  const run = col.slice(src.idx);
  for (let i = 1; i < run.length; i++) {
    const prev = run[i - 1].card;
    const cur = run[i].card;
    if (isTitle(prev) || cur.categoryTitle !== prev.categoryTitle) return null;
  }
  return run.map((e) => e.card);
}

export function canMove(state, src, dest) {
  const cards = getMovingCards(state, src);
  if (!cards) return false;
  const head = cards[0];
  if (dest.type === 'tab') {
    if (src.type === 'tab' && src.col === dest.col) return false;
    const col = state.tableau[dest.col];
    if (!col.length) return true;
    const top = col[col.length - 1].card;
    return !isTitle(top) && top.categoryTitle === head.categoryTitle;
  }
  if (dest.type === 'found') {
    if (cards.length !== 1) return false;
    const slot = state.foundation[dest.slot];
    if (!slot) return isTitle(head);
    return !slot.complete && !isTitle(head) && slot.category === head.categoryTitle;
  }
  return false;
}

// Returns {state, completed} or null when illegal.
export function applyMove(state, src, dest) {
  if (!canMove(state, src, dest)) return null;
  const cards = getMovingCards(state, src);
  let next = { ...state, tableau: state.tableau.map((c) => [...c]) };

  if (src.type === 'waste') {
    next.waste = state.waste.slice(0, -1);
  } else {
    const col = next.tableau[src.col];
    const moved = col.splice(src.idx);
    if (col.length) col[col.length - 1] = { ...col[col.length - 1], up: true };
    next.tableau[src.col] = col;
    cards.length = moved.length;
  }

  let completed = false;
  if (dest.type === 'tab') {
    next.tableau[dest.col] = [...next.tableau[dest.col], ...cards.map((card) => ({ card, up: true }))];
  } else {
    const head = cards[0];
    const foundation = [...state.foundation];
    const slot = foundation[dest.slot];
    if (!slot) {
      foundation[dest.slot] = { category: head.categoryTitle, total: head.total, count: 0, complete: head.total === 0 };
    } else {
      const count = slot.count + 1;
      completed = count >= slot.total;
      foundation[dest.slot] = { ...slot, count, complete: completed };
    }
    next.foundation = foundation;
  }
  return { state: next, completed };
}

export function clearSlot(state, slot) {
  const foundation = [...state.foundation];
  if (!foundation[slot] || !foundation[slot].complete) return state;
  foundation[slot] = null;
  const next = { ...state, foundation, score: state.score + POINTS_PER_CATEGORY };
  next.won = checkWin(next);
  return next;
}

export function checkWin(state) {
  return (
    !state.stock.length &&
    !state.waste.length &&
    state.tableau.every((c) => !c.length) &&
    state.foundation.every((s) => !s)
  );
}
