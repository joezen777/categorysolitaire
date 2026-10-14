import type { Card, DeckModel } from '../deck';

/** Rule configuration (independent of which deck is in use). */
export const TABLEAU_SIZES = [4, 5, 6, 7, 8] as const;
export const FOUNDATION_COUNT = 5;
export const POINTS_PER_CATEGORY = 100;

export interface TableauCard {
  id: string;
  faceUp: boolean;
}

export interface FoundationSlot {
  /** Category occupying the slot, or null when the slot is empty. */
  category: string | null;
  /** cardIds[0] is the category title card; the rest are items. */
  cardIds: string[];
}

export interface GameState {
  deck: DeckModel;
  /** Face-down source pile; the last element is the top card. */
  stock: string[];
  /** Face-up draft pile; the last element is the top card. */
  waste: string[];
  tableau: TableauCard[][];
  foundations: FoundationSlot[];
  score: number;
  completedCategories: string[];
}

export type MoveSource =
  | { kind: 'waste'; cardId: string }
  | { kind: 'tableau'; column: number; cardId: string };

export type MoveTarget = { kind: 'tableau'; column: number } | { kind: 'foundation'; slot: number };

export type MoveResult =
  | { ok: true; state: GameState; movedIds: string[]; completedCategory: string | null }
  | { ok: false; reason: string };

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dealGame(deck: DeckModel, rng: Rng = Math.random): GameState {
  const needed = TABLEAU_SIZES.reduce((sum, n) => sum + n, 0);
  if (deck.cards.length < needed) {
    throw new Error(`Deck has ${deck.cards.length} cards; at least ${needed} are needed to deal`);
  }
  const ids = shuffle(deck.cards.map((c) => c.id), rng);
  let cursor = 0;
  const tableau = TABLEAU_SIZES.map((size) => {
    const column = ids.slice(cursor, cursor + size).map((id, i) => ({ id, faceUp: i === size - 1 }));
    cursor += size;
    return column;
  });
  return {
    deck,
    stock: ids.slice(cursor),
    waste: [],
    tableau,
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => ({ category: null, cardIds: [] })),
    score: 0,
    completedCategories: [],
  };
}

/** Turn the top source card face up onto the draft pile. */
export function drawCard(state: GameState): GameState {
  if (state.stock.length === 0) return state;
  const top = state.stock[state.stock.length - 1];
  return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, top] };
}

/**
 * Flip the draft pile back into the source pile. The card that was at the
 * bottom of the draft pile becomes the next card drawn; the former top card
 * is drawn last.
 */
export function recycleWaste(state: GameState): GameState {
  if (state.stock.length > 0 || state.waste.length === 0) return state;
  return { ...state, stock: [...state.waste].reverse(), waste: [] };
}

/** Cards that would travel with a pick-up from `source`, or a reason it cannot move. */
export function getMovingCards(state: GameState, source: MoveSource): { ids: string[] } | { reason: string } {
  if (source.kind === 'waste') {
    const top = state.waste[state.waste.length - 1];
    if (top === undefined || top !== source.cardId) return { reason: 'Only the top draft card can be moved.' };
    return { ids: [top] };
  }
  const column = state.tableau[source.column];
  const index = column ? column.findIndex((c) => c.id === source.cardId) : -1;
  if (index < 0) return { reason: 'That card is no longer in this column.' };
  const run = column.slice(index);
  if (run.some((c) => !c.faceUp)) return { reason: 'Only face-up cards can be moved.' };
  if (run.length > 1) {
    const cards = run.map((c) => state.deck.byId[c.id]);
    const category = cards[0].category;
    if (!cards.every((c) => c.role === 'item' && c.category === category)) {
      return { reason: 'Only a stack of item cards from one category can move together.' };
    }
  }
  return { ids: run.map((c) => c.id) };
}

function describe(card: Card): string {
  return card.role === 'title' ? `the ${card.label} title card` : card.label;
}

/** Validate a complete move without changing anything. Returns null when legal. */
export function validateMove(state: GameState, source: MoveSource, target: MoveTarget): string | null {
  const moving = getMovingCards(state, source);
  if ('reason' in moving) return moving.reason;
  const lead = state.deck.byId[moving.ids[0]];

  if (target.kind === 'tableau') {
    const column = state.tableau[target.column];
    if (!column) return 'That column does not exist.';
    if (source.kind === 'tableau' && source.column === target.column) return 'The card is already in that column.';
    const bottom = column[column.length - 1];
    if (!bottom) return null;
    const below = state.deck.byId[bottom.id];
    if (!bottom.faceUp || below.role !== 'item' || below.category !== lead.category) {
      return `${capitalize(describe(lead))} cannot go on ${describe(below)}.`;
    }
    return null;
  }

  const slot = state.foundations[target.slot];
  if (!slot) return 'That slot does not exist.';
  if (lead.role === 'title') {
    return slot.category === null ? null : 'A title card needs an empty category slot.';
  }
  if (slot.category === null) return `Place the ${lead.category} title card in a slot before its items.`;
  if (slot.category !== lead.category) return `${lead.label} does not belong in the ${slot.category} slot.`;
  return null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function revealBottom(column: TableauCard[]): TableauCard[] {
  const last = column[column.length - 1];
  if (!last || last.faceUp) return column;
  return [...column.slice(0, -1), { ...last, faceUp: true }];
}

/** Validate then apply a move atomically, including reveal and category completion. */
export function applyMove(state: GameState, source: MoveSource, target: MoveTarget): MoveResult {
  const reason = validateMove(state, source, target);
  if (reason) return { ok: false, reason };
  const movedIds = (getMovingCards(state, source) as { ids: string[] }).ids;

  let { waste, tableau, foundations, score, completedCategories } = state;

  if (source.kind === 'waste') {
    waste = waste.slice(0, -1);
  } else {
    tableau = tableau.map((column, i) =>
      i === source.column ? revealBottom(column.slice(0, column.length - movedIds.length)) : column,
    );
  }

  let completedCategory: string | null = null;
  if (target.kind === 'tableau') {
    const placed = movedIds.map((id) => ({ id, faceUp: true }));
    tableau = tableau.map((column, i) => (i === target.column ? [...column, ...placed] : column));
  } else {
    const lead = state.deck.byId[movedIds[0]];
    foundations = foundations.map((slot, i) => {
      if (i !== target.slot) return slot;
      const filled: FoundationSlot = { category: lead.category, cardIds: [...slot.cardIds, ...movedIds] };
      const needed = state.deck.categories[lead.category].itemCount + 1;
      if (filled.cardIds.length === needed && !completedCategories.includes(lead.category)) {
        completedCategory = lead.category;
        return { category: null, cardIds: [] };
      }
      return filled;
    });
    if (completedCategory) {
      score += POINTS_PER_CATEGORY;
      completedCategories = [...completedCategories, completedCategory];
    }
  }

  return {
    ok: true,
    movedIds,
    completedCategory,
    state: { ...state, waste, tableau, foundations, score, completedCategories },
  };
}

/** All targets that would accept a move from `source`. */
export function legalTargets(state: GameState, source: MoveSource): MoveTarget[] {
  const targets: MoveTarget[] = [
    ...state.tableau.map((_, column) => ({ kind: 'tableau' as const, column })),
    ...state.foundations.map((_, slot) => ({ kind: 'foundation' as const, slot })),
  ];
  return targets.filter((t) => validateMove(state, source, t) === null);
}

/** Collected items / total items for a foundation slot, derived from the deck. */
export function foundationProgress(state: GameState, slot: FoundationSlot): { collected: number; total: number } | null {
  if (!slot.category) return null;
  return { collected: slot.cardIds.length - 1, total: state.deck.categories[slot.category].itemCount };
}

export function isWon(state: GameState): boolean {
  return (
    state.stock.length === 0 &&
    state.waste.length === 0 &&
    state.tableau.every((c) => c.length === 0) &&
    state.foundations.every((f) => f.cardIds.length === 0) &&
    state.completedCategories.length === state.deck.categoryCount
  );
}
