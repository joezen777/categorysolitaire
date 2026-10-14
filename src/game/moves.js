import { CARD_TYPE } from '../deck';

// from: { type: 'draft' } | { type: 'tableau', col, index }
// to:   { type: 'tableau', col } | { type: 'foundation', slot }
// Foundation slots are card arrays whose first card is the category title.
// game.faceUpCounts[col] is how many cards at the bottom of the column are face up.

const isItem = (c) => c.type === CARD_TYPE.ITEM;

export function foundationProgress(slot) {
  if (slot.length === 0) return null;
  return { categoryTitle: slot[0].categoryTitle, collected: slot.filter(isItem).length, total: slot[0].itemCount };
}

// Returns { cards } for the unit being moved, or { error }.
export function getMovingCards(game, from) {
  if (from.type === 'draft') {
    const top = game.draft[game.draft.length - 1];
    return top ? { cards: [top] } : { error: 'The draft is empty.' };
  }
  const column = game.tableau[from.col];
  const { index } = from;
  if (!column || index < 0 || index >= column.length) return { error: 'No card there.' };
  if (index < column.length - game.faceUpCounts[from.col]) return { error: 'Face-down cards cannot be moved.' };
  const cards = column.slice(index);
  if (cards.length > 1) {
    const category = cards[0].categoryTitle;
    if (!cards.every((c) => isItem(c) && c.categoryTitle === category)) {
      return { error: 'Only a stack of same-category item cards can move together.' };
    }
  }
  return { cards };
}

function placementError(game, from, cards, to) {
  const first = cards[0];
  if (to.type === 'tableau') {
    if (from.type === 'tableau' && from.col === to.col) return 'The card is already in that column.';
    const column = game.tableau[to.col];
    if (column.length === 0) return null;
    const bottom = column[column.length - 1];
    if (isItem(bottom) && bottom.categoryTitle === first.categoryTitle) return null;
    return first.type === CARD_TYPE.TITLE
      ? 'A title card goes on an empty column, a same-category item, or a foundation slot.'
      : 'Item cards go on a same-category item or an empty column.';
  }
  if (cards.length > 1) return 'A stack cannot be moved to a foundation slot; move one card at a time.';
  const slot = game.foundations[to.slot];
  if (slot.length === 0) return first.type === CARD_TYPE.TITLE ? null : 'An empty foundation slot needs a title card first.';
  if (isItem(first) && slot[0].categoryTitle === first.categoryTitle) return null;
  return 'That foundation slot holds a different category.';
}

// Returns { game, ok: true } or { game: <unchanged>, ok: false, reason }.
export function moveCards(game, from, to) {
  const moving = getMovingCards(game, from);
  if (moving.error) return { game, ok: false, reason: moving.error };
  const { cards } = moving;
  const reason = placementError(game, from, cards, to);
  if (reason) return { game, ok: false, reason };

  const next = {
    ...game,
    tableau: [...game.tableau],
    foundations: [...game.foundations],
    faceUpCounts: [...game.faceUpCounts],
  };
  if (from.type === 'draft') {
    next.draft = game.draft.slice(0, -1);
  } else {
    const remaining = game.tableau[from.col].slice(0, from.index);
    next.tableau[from.col] = remaining;
    let faceUp = Math.max(game.faceUpCounts[from.col] - cards.length, 0);
    if (faceUp === 0 && remaining.length > 0) faceUp = 1; // reveal the newly exposed bottom card
    next.faceUpCounts[from.col] = faceUp;
  }
  if (to.type === 'tableau') {
    next.tableau[to.col] = [...game.tableau[to.col], ...cards];
    next.faceUpCounts[to.col] = (game.tableau[to.col].length === 0 ? 0 : game.faceUpCounts[to.col]) + cards.length;
  } else {
    next.foundations[to.slot] = [...game.foundations[to.slot], ...cards];
  }
  return { game: next, ok: true };
}
