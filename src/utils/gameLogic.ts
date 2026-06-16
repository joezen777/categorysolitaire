import { GameCard, FoundationSlot, TableauColumn, DropTarget } from '../types/game';

export class GameLogic {
  // Validate if a card can be placed on a foundation slot
  static canPlaceOnFoundation(card: GameCard, slot: FoundationSlot, targetIndex: number): boolean {
    // Slot is empty - only title cards can start a foundation
    if (slot.cards.length === 0) {
      return card.isTitleCard && slot.categoryTitle === null;
    }

    // Slot has cards - must be same category
    if (slot.categoryTitle !== card.categoryTitle) {
      return false;
    }

    // Only item cards (not title cards) can be added to existing foundation
    if (card.isTitleCard) {
      return false;
    }

    // Check if this item card already exists in the foundation
    const existingItemNames = slot.cards.map(c => c.itemName);
    if (existingItemNames.includes(card.itemName)) {
      return false;
    }

    return true;
  }

  // Validate if a card can be placed on a tableau column
  static canPlaceOnTableau(card: GameCard, column: TableauColumn, targetIndex: number): boolean {
    // Empty column - any card can be placed
    if (column.cards.length === 0) {
      return true;
    }

    const topCard = column.cards[column.cards.length - 1];

    // Title card rules
    if (card.isTitleCard) {
      // Title card can only go on item card of same category or on empty column
      return !topCard.isTitleCard && topCard.categoryTitle === card.categoryTitle;
    }

    // Item card rules
    // Can only go on item card of same category
    return !topCard.isTitleCard && topCard.categoryTitle === card.categoryTitle;
  }

  // Validate if a sequence of cards can be moved together
  static canMoveSequence(cards: GameCard[]): boolean {
    if (cards.length === 0) return false;
    if (cards.length === 1) return true;

    // All cards must be face up
    if (cards.some(c => c.faceUp !== 'up')) {
      return false;
    }

    // Title card cannot be part of a sequence (only item cards)
    if (cards.some(c => c.isTitleCard)) {
      return false;
    }

    // All cards must be from same category
    const category = cards[0].categoryTitle;
    return cards.every(c => c.categoryTitle === category);
  }

  // Get move destination
  static validateMove(card: GameCard, target: DropTarget, foundation: FoundationSlot[], tableau: TableauColumn[]): boolean {
    if (target.zone === 'foundation') {
      return this.canPlaceOnFoundation(card, foundation[target.index], target.index);
    } else {
      return this.canPlaceOnTableau(card, tableau[target.index], target.index);
    }
  }

  // Check if a move is valid from source to destination
  static validateMoveFromTo(
    card: GameCard,
    fromSource: string,
    fromIndex: number,
    target: DropTarget,
    foundation: FoundationSlot[],
    tableau: TableauColumn[]
  ): boolean {
    // Basic move validation
    if (!this.validateMove(card, target, foundation, tableau)) {
      return false;
    }

    // Additional rules based on source
    switch (fromSource) {
      case 'source':
        // Cannot move from source deck directly to foundation
        if (target.zone === 'foundation') {
          return false;
        }
        break;

      case 'draft':
        // Can move from draft pile to anywhere valid
        break;

      case 'tableau':
        // Moving within tableau is already validated by canPlaceOnTableau
        break;

      case 'foundation':
        // Cannot move from foundation back to foundation
        if (target.zone === 'foundation') {
          return false;
        }
        break;
    }

    return true;
  }

  // Check if category is complete
  static isCategoryComplete(slot: FoundationSlot): boolean {
    if (slot.categoryTitle === null) return false;
    
    // Need title card + all item cards
    const titleCard = slot.cards.find(c => c.isTitleCard);
    if (!titleCard) return false;

    // Count item cards for this category
    const itemCount = slot.cards.filter(c => !c.isTitleCard).length;
    
    // We need to know the total expected count from the deck config
    // For now, we'll check if all cards in the category are present
    return itemCount > 0; // Will be calculated dynamically based on deck config
  }

  // Get cards that should be flipped face up
  static getCardsToFlip(column: TableauColumn): GameCard[] {
    if (column.cards.length === 0) return [];

    const cardsToFlip: GameCard[] = [];
    let foundMovedCard = false;

    // Check from bottom up
    for (let i = column.cards.length - 1; i >= 0; i--) {
      const card = column.cards[i];
      
      if (foundMovedCard && card.faceUp === 'down') {
        cardsToFlip.push(card);
        break; // Only flip the first face-down card found
      }

      if (card.faceUp === 'up') {
        foundMovedCard = true;
      }
    }

    return cardsToFlip;
  }

  // Check if game is won
  static isGameWon(tableau: TableauColumn[], draftPile: GameCard[]): boolean {
    // Win if tableau is empty and draft pile is empty
    const tableauEmpty = tableau.every(col => col.cards.length === 0);
    const draftEmpty = draftPile.length === 0;

    return tableauEmpty && draftEmpty;
  }
}