const CATEGORY_COLORS = [
  "#2d6f78",
  "#b6405b",
  "#3568a8",
  "#aa6b18",
  "#52713d",
  "#7557a8",
  "#c65f3b",
  "#2d7d55",
  "#8c566a",
  "#4a6b8c",
  "#9a7a22",
  "#247d82",
  "#7e6249",
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function createCategoryMeta(deckItems) {
  const categories = [];
  const categoryMap = new Map();

  deckItems.forEach((item) => {
    if (!categoryMap.has(item.categoryTitle)) {
      const index = categories.length;
      const meta = {
        id: slugify(item.categoryTitle),
        title: item.categoryTitle,
        totalItems: 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
      categoryMap.set(item.categoryTitle, meta);
      categories.push(meta);
    }

    categoryMap.get(item.categoryTitle).totalItems += 1;
  });

  return { categories, categoryMap };
}

export function buildCardDeck(deckItems) {
  const { categories, categoryMap } = createCategoryMeta(deckItems);
  const titleCards = categories.map((category) => ({
    id: `${category.id}-title`,
    type: "title",
    categoryId: category.id,
    categoryTitle: category.title,
    itemName: null,
    totalItems: category.totalItems,
    color: category.color,
    faceUp: false,
  }));

  const itemCards = deckItems.map((item) => {
    const category = categoryMap.get(item.categoryTitle);

    return {
      id: item.id,
      type: "item",
      categoryId: category.id,
      categoryTitle: item.categoryTitle,
      itemName: item.itemName,
      totalItems: category.totalItems,
      color: category.color,
      faceUp: false,
    };
  });

  return { cards: [...titleCards, ...itemCards], categories };
}

export function shuffleCards(cards) {
  const shuffled = cards.map((card) => ({ ...card }));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
