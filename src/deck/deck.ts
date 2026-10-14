/**
 * Deck model. A deck is a flat JSON array of entries. An entry with
 * `itemName: null` is the category title card; every other entry is an item
 * card of that category. Swapping decks is purely a data change.
 */
export interface DeckEntry {
  id: string;
  categoryTitle: string;
  itemName: string | null;
}

export type CardRole = 'title' | 'item';

export interface Card {
  id: string;
  role: CardRole;
  category: string;
  /** Text shown on the card face: the category name or the item name. */
  label: string;
}

export interface Category {
  name: string;
  titleId: string;
  itemCount: number;
}

export interface DeckModel {
  cards: readonly Card[];
  byId: Readonly<Record<string, Card>>;
  categories: Readonly<Record<string, Category>>;
  categoryCount: number;
}

export class DeckError extends Error {}

export function buildDeck(entries: readonly DeckEntry[]): DeckModel {
  const byId: Record<string, Card> = {};
  const titles: Record<string, string> = {};
  const itemCounts: Record<string, number> = {};
  const cards: Card[] = [];

  for (const entry of entries) {
    const category = entry.categoryTitle?.trim();
    if (!entry.id || !category) {
      throw new DeckError(`Deck entry is missing an id or categoryTitle: ${JSON.stringify(entry)}`);
    }
    if (byId[entry.id]) throw new DeckError(`Duplicate card id "${entry.id}"`);

    const isTitle = entry.itemName === null;
    const card: Card = {
      id: entry.id,
      role: isTitle ? 'title' : 'item',
      category,
      label: isTitle ? category : String(entry.itemName).trim(),
    };
    if (!card.label) throw new DeckError(`Card "${entry.id}" has an empty itemName`);

    if (isTitle) {
      if (titles[category]) throw new DeckError(`Category "${category}" has more than one title card`);
      titles[category] = card.id;
    } else {
      itemCounts[category] = (itemCounts[category] ?? 0) + 1;
    }
    byId[card.id] = card;
    cards.push(card);
  }

  const categories: Record<string, Category> = {};
  for (const name of new Set([...Object.keys(titles), ...Object.keys(itemCounts)])) {
    if (!titles[name]) throw new DeckError(`Category "${name}" has no title card`);
    if (!itemCounts[name]) throw new DeckError(`Category "${name}" has no item cards`);
    categories[name] = { name, titleId: titles[name], itemCount: itemCounts[name] };
  }

  return { cards, byId, categories, categoryCount: Object.keys(categories).length };
}
