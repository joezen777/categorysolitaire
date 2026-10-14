/**
 * Turns raw deck JSON into an immutable deck model.
 *
 * Raw format: array of { id, categoryTitle, itemName }.
 * A card with itemName === null is the category's title card; any other
 * card is an item of categoryTitle.
 */

export function buildDeck(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Deck must be a non-empty array');
  }
  const cards = {};
  const categories = {};
  const order = [];

  for (const entry of raw) {
    const { id, categoryTitle, itemName } = entry ?? {};
    if (typeof id !== 'string' || !id) throw new Error('Deck card is missing an id');
    if (typeof categoryTitle !== 'string' || !categoryTitle) {
      throw new Error(`Deck card ${id} is missing categoryTitle`);
    }
    if (itemName !== null && (typeof itemName !== 'string' || !itemName)) {
      throw new Error(`Deck card ${id} has an invalid itemName`);
    }
    if (cards[id]) throw new Error(`Duplicate card id: ${id}`);

    const role = itemName === null ? 'title' : 'item';
    cards[id] = { id, category: categoryTitle, role, label: itemName ?? categoryTitle };

    let cat = categories[categoryTitle];
    if (!cat) {
      cat = categories[categoryTitle] = { name: categoryTitle, titleId: null, total: 0 };
      order.push(categoryTitle);
    }
    if (role === 'title') {
      if (cat.titleId) throw new Error(`Category ${categoryTitle} has more than one title card`);
      cat.titleId = id;
    } else {
      cat.total += 1;
    }
  }

  for (const name of order) {
    const cat = categories[name];
    if (!cat.titleId) throw new Error(`Category ${name} has no title card`);
    if (cat.total === 0) throw new Error(`Category ${name} has no items`);
  }

  return { cards, categories, categoryNames: order, cardIds: raw.map((c) => c.id) };
}
