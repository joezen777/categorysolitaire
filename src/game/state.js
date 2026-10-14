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

// Every card id currently on the board, in a stable region order.
export function allPlacedIds(state) {
  return [
    ...state.source.map((c) => c.id),
    ...state.draft.map((c) => c.id),
    ...state.foundations.flatMap((f) => (f ? f.cards.map((c) => c.id) : [])),
    ...state.tableau.flatMap((col) => col.map((c) => c.id)),
  ];
}
