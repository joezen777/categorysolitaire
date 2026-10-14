/**
 * Pure move rules. Nothing here mutates state.
 *
 * source: { zone: 'waste' } | { zone: 'tableau', col, index }
 * target: { zone: 'tableau', col } | { zone: 'foundation', slot }
 */
import { FOUNDATION_SLOTS, TABLEAU_SIZES } from './config.js';

const ok = (ids) => ({ ok: true, ids });
const no = (reason) => ({ ok: false, reason });

/** A card may be laid on a base card if the base is an item of the same category. */
export function canPlaceOn(deck, cardId, baseId) {
  const card = deck.cards[cardId];
  const base = deck.cards[baseId];
  return base.role === 'item' && card.category === base.category;
}

/** Ids picked up by `source`, or null if nothing movable is there. */
export function getMovableGroup(state, source) {
  if (state.phase !== 'playing') return null;
  if (source.zone === 'waste') {
    const top = state.waste[state.waste.length - 1];
    return top ? [top] : null;
  }
  if (source.zone === 'tableau') {
    const column = state.tableau[source.col];
    if (!column || !Number.isInteger(source.index)) return null;
    const run = column.slice(source.index);
    if (run.length === 0 || !run.every((c) => c.faceUp)) return null;
    for (let i = 1; i < run.length; i++) {
      if (!canPlaceOn(state.deck, run[i].id, run[i - 1].id)) return null;
    }
    return run.map((c) => c.id);
  }
  return null;
}

function validateToTableau(state, source, ids, target) {
  const column = state.tableau[target.col];
  if (!column) return no('No such column');
  if (source.zone === 'tableau' && source.col === target.col) {
    return no('That card is already in this column');
  }
  if (column.length === 0) return ok(ids);
  const base = column[column.length - 1];
  if (!base.faceUp) return no('Destination card is face down');
  const { cards } = state.deck;
  if (canPlaceOn(state.deck, ids[0], base.id)) return ok(ids);
  const moving = cards[ids[0]];
  const under = cards[base.id];
  if (under.role === 'title') return no(`Nothing can be placed on the ${under.label} title card`);
  return no(`${moving.label} does not belong with ${under.label}`);
}

function validateToFoundation(state, ids, target) {
  const slot = state.foundations[target.slot];
  if (slot === undefined) return no('No such slot');
  const { cards } = state.deck;
  const first = cards[ids[0]];
  if (slot === null) {
    if (ids.length === 1 && first.role === 'title') return ok(ids);
    return no('Only a category title card can start an empty slot');
  }
  if (slot.clearing) return no('That category is already complete');
  const pileCategory = cards[slot.pile[0]].category;
  if (ids.every((id) => cards[id].role === 'item' && cards[id].category === pileCategory)) {
    return ok(ids);
  }
  return no(`This slot is collecting ${pileCategory}`);
}

export function validateMove(state, source, target) {
  const ids = getMovableGroup(state, source);
  if (!ids) return no('That card cannot be moved');
  if (target.zone === 'tableau') return validateToTableau(state, source, ids, target);
  if (target.zone === 'foundation') return validateToFoundation(state, ids, target);
  return no('Unknown destination');
}

/** Every destination that would accept `source` right now. */
export function legalTargets(state, source) {
  const tableau = [];
  const foundation = [];
  for (let col = 0; col < TABLEAU_SIZES.length; col++) {
    if (validateMove(state, source, { zone: 'tableau', col }).ok) tableau.push(col);
  }
  for (let slot = 0; slot < FOUNDATION_SLOTS; slot++) {
    if (validateMove(state, source, { zone: 'foundation', slot }).ok) foundation.push(slot);
  }
  return { tableau, foundation };
}
