// Deck registry. To add or swap a deck, drop a JSON file in this folder with
// the shape [{ "id": string, "categoryTitle": string, "itemName": string }, ...]
// and register it below. Category title cards are generated automatically from
// the unique `categoryTitle` values, so the JSON only lists the item cards.
import starterDeck from './starterDeck.json';

export const DECKS = {
  starter: { name: 'Starter Deck', entries: starterDeck },
};

export const DEFAULT_DECK_KEY = 'starter';
