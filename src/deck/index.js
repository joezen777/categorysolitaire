import starterDeck from './starterDeck.json';

export const CARD_TYPE = { TITLE: 'title', ITEM: 'item' };

// Builds the playable card list from a deck array of
// { id, categoryTitle, itemName } entries. To use a different deck, pass
// another array with the same shape (or swap the JSON import below).
export function buildCards(deckData) {
  const categories = new Map();
  for (const { id, categoryTitle, itemName } of deckData) {
    if (!categories.has(categoryTitle)) categories.set(categoryTitle, []);
    categories.get(categoryTitle).push({ type: CARD_TYPE.ITEM, id, categoryTitle, itemName });
  }
  const cards = [];
  for (const [categoryTitle, items] of categories) {
    cards.push({
      type: CARD_TYPE.TITLE,
      id: `title:${categoryTitle}`,
      categoryTitle,
      itemCount: items.length,
    });
    cards.push(...items);
  }
  return cards;
}

export const cards = buildCards(starterDeck);
export { starterDeck };
