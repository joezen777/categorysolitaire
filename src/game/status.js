// The game is won only when every card in the deck has been grouped and cleared.
export function isWon(game, totalCards) {
  return (
    totalCards > 0 &&
    (game.cleared?.length ?? 0) === totalCards &&
    game.source.length === 0 &&
    game.draft.length === 0 &&
    game.foundations.every((f) => f.length === 0) &&
    game.tableau.every((c) => c.length === 0)
  );
}
