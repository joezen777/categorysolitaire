import starterDeck from './starterDeck.json';

// Register decks here; the active deck can be swapped without touching game code.
export const DECKS = {
  starter: starterDeck,
};

export const DEFAULT_DECK_ID = 'starter';

export { buildDeck, validateDeckData, CARD_KIND } from './deck.js';
