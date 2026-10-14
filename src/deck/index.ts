import starterDeckEntries from './starterDeck.json';
import { buildDeck, type DeckEntry } from './deck';

export * from './deck';

/** The active deck. To use a different deck, point this import at another JSON file. */
export const activeDeck = buildDeck(starterDeckEntries as DeckEntry[]);
