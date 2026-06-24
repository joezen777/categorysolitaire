/**
 * Category Solitaire Game Logic Helper
 */

// Shuffles an array in place (Fisher-Yates)
export const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Colors map for categories to give them a premium visual theme (HSL)
export const getCategoryColor = (categoryTitle) => {
  let hash = 0;
  for (let i = 0; i < categoryTitle.length; i++) {
    hash = categoryTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate a distinct hue, with nice saturation and lightness for dark mode
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 85%, 65%)`;
};

// Initialize the game state from the raw deck JSON array
export const initializeGame = (deckData) => {
  // Count items per category
  const categoryCounts = {};
  deckData.forEach(item => {
    categoryCounts[item.categoryTitle] = (categoryCounts[item.categoryTitle] || 0) + 1;
  });

  const allCards = [];

  // Generate Title Cards and Item Cards
  const categoriesSeen = new Set();
  deckData.forEach(item => {
    const category = item.categoryTitle;
    
    // Create Title Card once per category
    if (!categoriesSeen.has(category)) {
      categoriesSeen.add(category);
      allCards.push({
        id: `${category.toLowerCase()}_title`,
        categoryTitle: category,
        itemName: category, // Shows category name on face
        isTitle: true,
        totalItems: categoryCounts[category],
        faceUp: false,
      });
    }

    // Create Item Card
    allCards.push({
      id: item.id,
      categoryTitle: category,
      itemName: item.itemName,
      isTitle: false,
      faceUp: false,
    });
  });

  // Shuffle all 86 cards
  const shuffledDeck = shuffle(allCards);

  // Deal to 5 Tableau columns:
  // Col 1: 4 cards
  // Col 2: 5 cards
  // Col 3: 6 cards
  // Col 4: 7 cards
  // Col 5: 8 cards
  // Total dealt = 30 cards
  const tableau = [[], [], [], [], []];
  let deckIndex = 0;

  const colSizes = [4, 5, 6, 7, 8];
  for (let colIdx = 0; colIdx < 5; colIdx++) {
    const size = colSizes[colIdx];
    for (let cardIdx = 0; cardIdx < size; cardIdx++) {
      const card = shuffledDeck[deckIndex++];
      // Bottom card of each column is face up
      if (cardIdx === size - 1) {
        card.faceUp = true;
      } else {
        card.faceUp = false;
      }
      tableau[colIdx].push(card);
    }
  }

  // Remaining cards go to the Source Deck (face down)
  const sourceDeck = shuffledDeck.slice(deckIndex).map(card => ({
    ...card,
    faceUp: false,
  }));

  return {
    tableau,
    sourceDeck,
    draftPile: [],
    // 5 empty slots for Foundation, represented as arrays of cards
    foundation: [[], [], [], [], []],
    score: 0,
  };
};

/**
 * Validates whether a card (or stack) can be moved to a destination
 * 
 * @param {Object} card The card being moved (lead card of a stack)
 * @param {string} targetType 'tableau' or 'foundation'
 * @param {number} targetIndex Index of the target column or slot (0-4)
 * @param {Array} targetCards The cards currently in the target location
 * @returns {boolean} True if move is legal
 */
export const isValidMove = (card, targetType, targetIndex, targetCards) => {
  if (targetType === 'tableau') {
    // If target column is empty, any card can be placed
    if (targetCards.length === 0) {
      return true;
    }

    // If target column is not empty, check the bottom card
    const bottomCard = targetCards[targetCards.length - 1];

    // Only allow placing on face-up cards
    if (!bottomCard.faceUp) {
      return false;
    }

    // In the Tableau:
    // Any card (Title or Item) can only be placed on an Item card of the same category.
    // Placement on a Title card is invalid (Title card is always the final top element of a category stack in Tableau).
    if (bottomCard.isTitle) {
      return false;
    }

    return bottomCard.categoryTitle === card.categoryTitle;
  } 
  
  if (targetType === 'foundation') {
    // If foundation slot is empty, only a Title card can start it
    if (targetCards.length === 0) {
      return card.isTitle;
    }

    // If foundation slot is not empty, it must match the category
    const baseCard = targetCards[0];
    if (baseCard.categoryTitle !== card.categoryTitle) {
      return false;
    }

    // Title card can't be placed on a non-empty foundation slot (it is already at the bottom)
    if (card.isTitle) {
      return false;
    }

    // Item card must match the category of the foundation slot
    return true;
  }

  return false;
};

/**
 * Check if a stack of cards in a tableau column starting from index `startIndex`
 * is a valid draggable sequence (all item cards of the same category, or a single card).
 */
export const isValidDragSequence = (cards, startIndex) => {
  if (startIndex < 0 || startIndex >= cards.length) return false;
  
  const leadCard = cards[startIndex];
  
  // If we're dragging a single card, it's always valid to drag if it is face up
  if (startIndex === cards.length - 1) {
    return leadCard.faceUp;
  }

  // If dragging a sequence:
  // 1. All cards in the sequence must be face up
  // 2. All cards in the sequence must be category item cards (not Title cards, as Title cards cannot have items stacked on top of them in a draggable way)
  // 3. All cards in the sequence must belong to the same category
  for (let i = startIndex; i < cards.length; i++) {
    const card = cards[i];
    if (!card.faceUp) return false;
    if (card.isTitle) return false; // Title card cannot be in the middle/bottom of a moving stack
    if (card.categoryTitle !== leadCard.categoryTitle) return false;
  }

  return true;
};
