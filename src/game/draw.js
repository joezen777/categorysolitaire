// Source and draft are arrays whose LAST element is the top of the pile.

// Moves the top source card onto the draft. No-op when the source is empty.
export function drawCard(game) {
  if (game.source.length === 0) return game;
  const card = game.source[game.source.length - 1];
  return {
    ...game,
    source: game.source.slice(0, -1),
    draft: [...game.draft, card],
  };
}

// Only when the source is empty: the draft returns to the source face down,
// inverted so the former draft bottom is drawn first and the former top last.
export function recycleDraft(game) {
  if (game.source.length !== 0 || game.draft.length === 0) return game;
  return { ...game, source: [...game.draft].reverse(), draft: [] };
}
