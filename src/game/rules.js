// Move rules. Sources: { type: 'draft' } (top draft card) or
// { type: 'tableau', col, index } (the card at index and everything below it).
// Destinations: { type: 'tableau', col } or { type: 'foundation', slot }.
// Foundations are null or { categoryTitle, cards: [title, ...items] }.

import { CARD_KIND } from '../decks/deck.js';

const isTitle = (card) => card.kind === CARD_KIND.TITLE;
const isItem = (card) => card.kind === CARD_KIND.ITEM;

// Returns { cards } (pile entries being moved) or { error }.
export function getMovingCards(state, cardsById, from) {
  if (from.type === 'draft') {
    const top = state.draft[state.draft.length - 1];
    return top ? { cards: [top] } : { error: 'The draft pile is empty.' };
  }
  if (from.type === 'tableau') {
    const column = state.tableau[from.col];
    const entry = column?.[from.index];
    if (!entry) return { error: 'There is no card there.' };
    if (!entry.faceUp) return { error: 'Only face-up cards can be moved.' };
    const cards = column.slice(from.index);
    if (cards.length > 1) {
      const category = cardsById[cards[0].id].categoryTitle;
      const sameItems = cards.every(
        (c) => c.faceUp && isItem(cardsById[c.id]) && cardsById[c.id].categoryTitle === category,
      );
      if (!sameItems) return { error: 'Only a stack of same-category item cards can move together.' };
    }
    return { cards };
  }
  return { error: 'Cards cannot be moved from there.' };
}

// Returns null when legal, otherwise a human-readable reason.
export function checkMove(state, cardsById, from, to) {
  const moving = getMovingCards(state, cardsById, from);
  if (moving.error) return moving.error;
  const first = cardsById[moving.cards[0].id];
  const isGroup = moving.cards.length > 1;

  if (to.type === 'tableau') {
    const column = state.tableau[to.col];
    if (!column) return 'That is not a column.';
    if (from.type === 'tableau' && from.col === to.col) return 'The card is already in that column.';
    if (column.length === 0) return null;
    const target = column[column.length - 1];
    if (!target.faceUp) return 'Cards cannot be placed on a face-down card.';
    const targetCard = cardsById[target.id];
    if (!isItem(targetCard)) return 'Cards cannot be placed on a category title card in the play area.';
    if (targetCard.categoryTitle !== first.categoryTitle) {
      return `${first.itemName ?? first.categoryTitle} does not belong to ${targetCard.categoryTitle}.`;
    }
    return null;
  }

  if (to.type === 'foundation') {
    if (to.slot < 0 || to.slot >= state.foundations.length) return 'That is not a holder slot.';
    if (isGroup) return 'Only one card at a time can go into a holder slot.';
    const slot = state.foundations[to.slot];
    if (!slot) {
      return isTitle(first) ? null : 'An empty holder slot needs a category title card first.';
    }
    if (isTitle(first)) return 'That holder slot is already taken.';
    if (first.categoryTitle !== slot.categoryTitle) {
      return `${first.itemName} does not belong to ${slot.categoryTitle}.`;
    }
    return null;
  }

  return 'Cards cannot be placed there.';
}

function revealBottom(column) {
  if (!column.length || column[column.length - 1].faceUp) return column;
  return [...column.slice(0, -1), { ...column[column.length - 1], faceUp: true }];
}

// Returns { ok: true, state } or { ok: false, state (unchanged), reason }.
export function moveCards(state, cardsById, from, to) {
  const reason = checkMove(state, cardsById, from, to);
  if (reason) return { ok: false, state, reason };
  const { cards } = getMovingCards(state, cardsById, from);
  const moved = cards.map(({ id }) => ({ id, faceUp: true }));

  let next = { ...state, tableau: [...state.tableau], foundations: [...state.foundations] };
  if (from.type === 'draft') {
    next.draft = state.draft.slice(0, -1);
  } else {
    next.tableau[from.col] = revealBottom(state.tableau[from.col].slice(0, from.index));
  }

  if (to.type === 'tableau') {
    next.tableau[to.col] = [...state.tableau[to.col], ...moved];
  } else {
    const slot = state.foundations[to.slot];
    next.foundations[to.slot] = slot
      ? { ...slot, cards: [...slot.cards, ...moved] }
      : { categoryTitle: cardsById[moved[0].id].categoryTitle, cards: moved };
  }
  return { ok: true, state: next };
}

// Collected item cards (title excluded) and the category's item total.
export function foundationProgress(slot, cardsById) {
  if (!slot) return null;
  const collected = slot.cards.filter((c) => isItem(cardsById[c.id])).length;
  const titleCard = slot.cards.map((c) => cardsById[c.id]).find(isTitle);
  return { categoryTitle: slot.categoryTitle, collected, total: titleCard.itemCount };
}
