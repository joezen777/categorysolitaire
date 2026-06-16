import deckData from '../data/deck.json';

// Fisher-Yates shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build the category metadata map
export function getCategoryMap(deck = deckData) {
  const map = {};
  deck.forEach((card) => {
    if (!card.itemName) {
      map[card.categoryTitle] = {
        totalItems: card.totalItems || 0,
        titleCardId: card.id,
      };
    }
  });
  return map;
}

// Check if a card is a title card
export function isTitleCard(card) {
  return card.itemName === null || card.itemName === undefined;
}

// Initialize a new game state
export function initializeGame(deck = deckData) {
  const shuffled = shuffle(deck);

  // Tableau: 5 columns with 4, 5, 6, 7, 8 cards
  const columnSizes = [4, 5, 6, 7, 8];
  const tableau = [];
  let index = 0;

  for (let col = 0; col < 5; col++) {
    const column = [];
    for (let row = 0; row < columnSizes[col]; row++) {
      const card = { ...shuffled[index], faceUp: row === columnSizes[col] - 1 };
      column.push(card);
      index++;
    }
    tableau.push(column);
  }

  // Remaining cards go to the stock pile (face down)
  const stockPile = shuffled.slice(index).map((card) => ({ ...card, faceUp: false }));

  return {
    stockPile,
    wastePile: [],
    foundation: [null, null, null, null, null], // 5 foundation slots
    tableau,
    score: 0,
    gameWon: false,
  };
}

// Check if a move to the tableau is valid
export function isValidTableauMove(card, targetColumn, tableau) {
  // Moving to empty column is always valid
  if (targetColumn.length === 0) {
    return true;
  }

  const topCard = targetColumn[targetColumn.length - 1];
  
  // Top card must be face up
  if (!topCard.faceUp) return false;

  if (isTitleCard(card)) {
    // Title cards can only go on empty columns or on top of same-category item cards
    return topCard.categoryTitle === card.categoryTitle && !isTitleCard(topCard);
  } else {
    // Item cards can go on same-category item cards or same-category title cards
    return topCard.categoryTitle === card.categoryTitle;
  }
}

// Check if a move to foundation is valid
export function isValidFoundationMove(card, foundationSlot) {
  if (isTitleCard(card)) {
    // Title cards can only go into empty foundation slots
    return foundationSlot === null;
  } else {
    // Item cards need matching title or same-category item in that slot
    if (foundationSlot === null) return false;
    return foundationSlot.categoryTitle === card.categoryTitle;
  }
}

// Check if a sequence of cards (from tableau) can be moved together
export function getMovableSequence(column, startIndex) {
  if (startIndex < 0 || startIndex >= column.length) return null;
  
  const card = column[startIndex];
  if (!card.faceUp) return null;

  const sequence = [card];
  const category = card.categoryTitle;

  for (let i = startIndex + 1; i < column.length; i++) {
    if (!column[i].faceUp) return null;
    if (column[i].categoryTitle !== category) return null;
    sequence.push(column[i]);
  }

  return sequence;
}

// Check if the game is won
export function checkWinCondition(state) {
  // All tableau columns empty
  const tableauEmpty = state.tableau.every((col) => col.length === 0);
  // Stock and waste empty
  const pilesEmpty = state.stockPile.length === 0 && state.wastePile.length === 0;
  // Foundation empty (all completed categories disappeared)
  const foundationEmpty = state.foundation.every((slot) => slot === null);

  return tableauEmpty && pilesEmpty && foundationEmpty;
}
