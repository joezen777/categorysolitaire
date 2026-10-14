// Deck model helpers. A deck is a flat JSON array of
// { id, categoryTitle, itemName } entries. An entry with itemName === null
// is the category's title card; every other entry is an item card.
// Swap decks by passing a different array to buildDeck().

export const CARD_KIND = {
  TITLE: 'title',
  ITEM: 'item',
};

export function validateDeckData(data) {
  if (!Array.isArray(data)) throw new Error('Deck data must be an array');
  const ids = new Set();
  const titles = new Set();
  const itemCategories = new Set();
  for (const entry of data) {
    const { id, categoryTitle, itemName } = entry ?? {};
    if (typeof id !== 'string' || !id) throw new Error('Every card needs a string id');
    if (ids.has(id)) throw new Error(`Duplicate card id: ${id}`);
    ids.add(id);
    if (typeof categoryTitle !== 'string' || !categoryTitle) {
      throw new Error(`Card ${id} needs a categoryTitle`);
    }
    if (itemName === null) {
      if (titles.has(categoryTitle)) throw new Error(`Duplicate title card: ${categoryTitle}`);
      titles.add(categoryTitle);
    } else if (typeof itemName === 'string' && itemName) {
      itemCategories.add(categoryTitle);
    } else {
      throw new Error(`Card ${id} has an invalid itemName`);
    }
  }
  for (const category of titles) {
    if (!itemCategories.has(category)) throw new Error(`Category ${category} has no items`);
  }
  for (const category of itemCategories) {
    if (!titles.has(category)) throw new Error(`Category ${category} has no title card`);
  }
}

// Returns { cards, categories } where cards are enriched with `kind` and
// title cards carry `itemCount`; categories maps title -> item total.
export function buildDeck(data) {
  validateDeckData(data);
  const categories = {};
  for (const { categoryTitle, itemName } of data) {
    if (itemName !== null) categories[categoryTitle] = (categories[categoryTitle] ?? 0) + 1;
  }
  const cards = data.map(({ id, categoryTitle, itemName }) =>
    itemName === null
      ? { id, categoryTitle, itemName, kind: CARD_KIND.TITLE, itemCount: categories[categoryTitle] }
      : { id, categoryTitle, itemName, kind: CARD_KIND.ITEM },
  );
  return { cards, categories };
}
