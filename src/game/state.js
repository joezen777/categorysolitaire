// Pure game-state helpers. Piles hold { id, faceUp } entries; the last
// element of a pile array is its top (source/draft) or exposed bottom card
// (tableau column).

export const COLUMN_SIZES = [4, 5, 6, 7, 8];
export const FOUNDATION_COUNT = 5;

export function shuffle(items, rng = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// cards: enriched deck cards from buildDeck(). Returns a fresh game state.
export function createGame(cards, rng = Math.random) {
  const ids = shuffle(cards.map((c) => c.id), rng);
  let next = 0;
  const tableau = COLUMN_SIZES.map((size) => {
    const column = ids.slice(next, next + size).map((id) => ({ id, faceUp: false }));
    next += column.length;
    if (column.length) column[column.length - 1].faceUp = true;
    return column;
  });
  const source = ids.slice(next).map((id) => ({ id, faceUp: false }));
  return {
    source,
    draft: [],
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => null),
    tableau,
    score: 0,
  };
}

// Moves the top source card face up onto the draft. No-op when source is empty.
export function drawCard(state) {
  if (!state.source.length) return state;
  const top = state.source[state.source.length - 1];
  return {
    ...state,
    source: state.source.slice(0, -1),
    draft: [...state.draft, { id: top.id, faceUp: true }],
  };
}

// When the source is empty, flips the draft back face down so the former
// draft bottom is drawn first and the former draft top last. No-op otherwise.
export function recycleDraft(state) {
  if (state.source.length || !state.draft.length) return state;
  return {
    ...state,
    source: [...state.draft].reverse().map(({ id }) => ({ id, faceUp: false })),
    draft: [],
  };
}

// The only draft card available to move interactions.
export function draftTop(state) {
  return state.draft.length ? state.draft[state.draft.length - 1] : null;
}

// Won only when every card has been grouped and cleared: nothing left in the
// source, draft, tableau, or any foundation slot.
export function isWon(state) {
  return (
    state.source.length === 0 &&
    state.draft.length === 0 &&
    state.tableau.every((col) => col.length === 0) &&
    state.foundations.every((slot) => slot === null)
  );
}

// Every card id currently on the board, in a stable region order.
export function allPlacedIds(state) {
  return [
    ...state.source.map((c) => c.id),
    ...state.draft.map((c) => c.id),
    ...state.foundations.flatMap((f) => (f ? f.cards.map((c) => c.id) : [])),
    ...state.tableau.flatMap((col) => col.map((c) => c.id)),
  ];
}
