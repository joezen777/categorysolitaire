export type CardFace = 'up' | 'down';

export interface GameState {
  sourceDeck: Card[];
  draftPile: Card[];
  foundation: FoundationSlot[];
  tableau: TableauColumn[];
  score: number;
  soundEnabled: boolean;
  gameOver: boolean;
}

export interface GameCard {
  id: string;
  categoryTitle: string;
  itemName: string;
  isTitleCard: boolean;
  faceUp: CardFace;
  // Optional location tracking
  source?: 'source' | 'draft' | 'foundation' | 'tableau';
  sourceIndex?: number; // For foundation or tableau column index
}

export interface FoundationSlot {
  id: string;
  categoryTitle: string | null;
  cards: GameCard[];
}

export interface TableauColumn {
  id: string;
  cards: GameCard[];
}

export type DropZone = 'foundation' | 'tableau';

export interface DropTarget {
  zone: DropZone;
  index: number;
}

export interface MoveValidation {
  valid: boolean;
  reason?: string;
}