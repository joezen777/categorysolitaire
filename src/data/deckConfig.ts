// Deck configuration - modular and easily swappable
export interface Card {
  id: string;
  categoryTitle: string;
  itemName: string;
  isTitleCard: boolean;
}

export interface CategoryConfig {
  title: string;
  items: string[];
}

export const starterDeck: CategoryConfig[] = [
  {
    title: "King",
    items: ["Scepter", "Orb", "Throne"]
  },
  {
    title: "Chimera",
    items: ["Goat", "Lion", "Snake"]
  },
  {
    title: "Ceramic",
    items: ["Vase", "Mug", "Plate", "Tile", "Bowl"]
  },
  {
    title: "Jupiter",
    items: ["Io", "Ganymedes", "Callisto", "Europa"]
  },
  {
    title: "Think",
    items: ["Consider", "Suppose", "Imagine", "Ponder", "Suggestion"]
  },
  {
    title: "Smell",
    items: ["Nose", "Odor", "Perfume", "Bouquet", "Aroma", "Scent"]
  },
  {
    title: "Winds",
    items: ["Vendavel", "Mistral", "Bora", "Breeze", "Piteraq", "Chinook", "Zephyr", "Sirocco"]
  },
  {
    title: "Refuge",
    items: ["Den", "Hideout", "Hideaway", "Safety", "Lair", "Security", "Shelter"]
  },
  {
    title: "Beds",
    items: ["Bunk", "Crib", "Cradle", "Berth", "Sofa bed", "Futon", "Cot", "Hammock"]
  },
  {
    title: "Wine",
    items: ["Riesling", "Prosecco", "Merlot", "Cabernet", "Rose", "Cava"]
  },
  {
    title: "Neck",
    items: ["Bowtie", "Dress Shirt", "Scarf", "Tie"]
  },
  {
    title: "Pirate",
    items: ["Rum", "Pegleg", "Treasure", "Cannon", "Cutlass", "Parrot"]
  },
  {
    title: "Aviation",
    items: ["Jet", "Runway", "Flight", "Airport", "Pilot", "Fuselage", "Airline", "Airship"]
  }
];

// Convert category config to card deck
export const generateDeck = (config: CategoryConfig[]): Card[] => {
  const cards: Card[] = [];
  let cardIdCounter = 0;

  config.forEach(category => {
    // Add title card
    cards.push({
      id: `card-${cardIdCounter++}`,
      categoryTitle: category.title,
      itemName: category.title, // Title card shows category as item
      isTitleCard: true
    });

    // Add item cards
    category.items.forEach(item => {
      cards.push({
        id: `card-${cardIdCounter++}`,
        categoryTitle: category.title,
        itemName: item,
        isTitleCard: false
      });
    });
  });

  return cards;
};

export const starterDeckCards = generateDeck(starterDeck);

// Helper to get total cards in a category (title + items)
export const getCategoryCardCount = (category: CategoryConfig): number => {
  return 1 + category.items.length;
};

// Helper to get item count only
export const getCategoryItemCount = (category: CategoryConfig): number => {
  return category.items.length;
};