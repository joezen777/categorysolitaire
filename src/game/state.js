import { buildCardDeck, shuffleCards } from "./deck.js";

export const TABLEAU_SIZES = [4, 5, 6, 7, 8];
export const FOUNDATION_COUNT = 5;

export function createInitialGame(deckItems) {
  const { cards, categories } = buildCardDeck(deckItems);
  const shuffledCards = shuffleCards(cards);
  const tableau = TABLEAU_SIZES.map((size) => {
    const column = shuffledCards.splice(0, size).map((card) => ({
      ...card,
      faceUp: false,
    }));
    return revealBottomCard(column);
  });

  return {
    source: shuffledCards.map((card) => ({ ...card, faceUp: false })),
    draft: [],
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => null),
    tableau,
    categories,
    clearedCategoryIds: [],
    score: 0,
    startedAt: Date.now(),
  };
}

export function revealBottomCard(column) {
  if (column.length === 0) {
    return column;
  }

  return column.map((card, index) =>
    index === column.length - 1 ? { ...card, faceUp: true } : card,
  );
}

export function clearSelectionAfterMove(selection, moveResult) {
  if (!moveResult.ok) {
    return null;
  }

  return selection ? null : selection;
}
