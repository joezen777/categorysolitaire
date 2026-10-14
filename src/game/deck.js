// Converts raw deck entries ({ id, categoryTitle, itemName }) into playable
// cards. Every category gets one generated title card plus its item cards.

export const CARD_TITLE = 'title';
export const CARD_ITEM = 'item';

export function validateDeck(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Deck must be a non-empty array');
  }
  const ids = new Set();
  for (const e of entries) {
    if (!e || typeof e.id !== 'string' || !e.categoryTitle || !e.itemName) {
      throw new Error(`Invalid deck entry: ${JSON.stringify(e)}`);
    }
    if (ids.has(e.id)) throw new Error(`Duplicate deck id: ${e.id}`);
    ids.add(e.id);
  }
}

export function buildCards(entries) {
  validateDeck(entries);
  const byCategory = new Map();
  for (const e of entries) {
    if (!byCategory.has(e.categoryTitle)) byCategory.set(e.categoryTitle, []);
    byCategory.get(e.categoryTitle).push(e);
  }
  const cards = [];
  for (const [category, items] of byCategory) {
    cards.push({
      id: `title:${category}`,
      type: CARD_TITLE,
      category,
      label: category,
      total: items.length,
    });
    for (const item of items) {
      cards.push({
        id: item.id,
        type: CARD_ITEM,
        category,
        label: item.itemName,
        total: items.length,
      });
    }
  }
  return { cards, categoryCount: byCategory.size };
}

export function shuffle(list, random = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
