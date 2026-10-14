export const TABLEAU_SIZES = [4, 5, 6, 7, 8];
export const FOUNDATION_COUNT = 5;

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tableau columns are arrays ordered top to bottom; the last card is the
// exposed (face-up) one. The source is face-down; the draft starts empty.
export function dealGame(cards, rng = Math.random) {
  const deck = shuffle(cards, rng);
  let next = 0;
  const tableau = TABLEAU_SIZES.map((n) => {
    const column = deck.slice(next, next + n);
    next += n;
    return column;
  });
  return {
    tableau,
    source: deck.slice(next),
    draft: [],
    cleared: [],
    faceUpCounts: TABLEAU_SIZES.map(() => 1),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
    score: 0,
  };
}
