import { revealBottomCard } from "./state.js";

export const MOVE_KIND = {
  NONE: "none",
  TITLE: "title",
  ITEM: "item",
  ITEM_SEQUENCE: "item-sequence",
};

export function getMoveCards(game, source) {
  if (!source) {
    return [];
  }

  if (source.type === "draft") {
    const card = game.draft.at(-1);
    return card ? [card] : [];
  }

  if (source.type === "tableau") {
    const column = game.tableau[source.columnIndex] || [];
    return column.slice(source.cardIndex);
  }

  return [];
}

export function getMoveKind(cards) {
  if (cards.length === 0) {
    return MOVE_KIND.NONE;
  }

  if (cards.length === 1 && cards[0].type === "title") {
    return MOVE_KIND.TITLE;
  }

  if (cards.length === 1 && cards[0].type === "item") {
    return MOVE_KIND.ITEM;
  }

  if (cards.every((card) => card.type === "item")) {
    return MOVE_KIND.ITEM_SEQUENCE;
  }

  return MOVE_KIND.NONE;
}

export function canStartMove(game, source) {
  const cards = getMoveCards(game, source);

  if (source?.type === "draft") {
    return cards.length === 1 && cards[0].faceUp;
  }

  if (source?.type === "tableau") {
    if (cards.length === 0 || cards.some((card) => !card.faceUp)) {
      return false;
    }

    const kind = getMoveKind(cards);
    if (kind === MOVE_KIND.TITLE || kind === MOVE_KIND.ITEM) {
      return true;
    }

    return (
      kind === MOVE_KIND.ITEM_SEQUENCE &&
      new Set(cards.map((card) => card.categoryId)).size === 1
    );
  }

  return false;
}

export function canMoveToTableau(game, source, columnIndex) {
  if (!canStartMove(game, source)) {
    return false;
  }

  const cards = getMoveCards(game, source);
  const firstCard = cards[0];
  const targetColumn = game.tableau[columnIndex] || [];
  const targetCard = targetColumn.at(-1);

  if (source.type === "tableau" && source.columnIndex === columnIndex) {
    return false;
  }

  if (!targetCard) {
    return true;
  }

  if (!targetCard.faceUp) {
    return false;
  }

  if (firstCard.type === "title") {
    return (
      cards.length === 1 &&
      targetCard.type === "item" &&
      targetCard.categoryId === firstCard.categoryId
    );
  }

  return (
    cards.every((card) => card.type === "item") &&
    targetCard.type === "item" &&
    targetCard.categoryId === firstCard.categoryId &&
    cards.every((card) => card.categoryId === firstCard.categoryId)
  );
}

export function canMoveToFoundation(game, source, slotIndex) {
  if (!canStartMove(game, source)) {
    return false;
  }

  const cards = getMoveCards(game, source);
  const card = cards[0];
  const foundation = game.foundations[slotIndex];

  if (cards.length !== 1) {
    return false;
  }

  if (card.type === "title") {
    return !foundation;
  }

  if (card.type === "item") {
    return Boolean(
      foundation &&
        foundation.categoryId === card.categoryId &&
        foundation.hasTitle &&
        !foundation.completing,
    );
  }

  return false;
}

export function applyMove(game, source, destination) {
  if (!source || !destination) {
    return { ok: false, game, tone: "warning" };
  }

  if (destination.type === "tableau") {
    return moveToTableau(game, source, destination.columnIndex);
  }

  if (destination.type === "foundation") {
    return moveToFoundation(game, source, destination.slotIndex);
  }

  return { ok: false, game, tone: "warning" };
}

export function dealFromSource(game) {
  if (game.source.length === 0) {
    if (game.draft.length === 0) {
      return { ok: false, game, tone: "warning" };
    }

    const source = game.draft
      .slice()
      .reverse()
      .map((card) => ({ ...card, faceUp: false }));

    return {
      ok: true,
      game: {
        ...game,
        source,
        draft: [],
      },
      recycled: true,
    };
  }

  const source = game.source.slice();
  const draft = game.draft.slice();
  const dealtCard = { ...source.pop(), faceUp: true };
  draft.push(dealtCard);

  return {
    ok: true,
    game: {
      ...game,
      source,
      draft,
    },
    dealtCard,
  };
}

function moveToTableau(game, source, columnIndex) {
  if (!canMoveToTableau(game, source, columnIndex)) {
    return { ok: false, game, tone: illegalTone(game, source) };
  }

  const cards = getMoveCards(game, source).map((card) => ({
    ...card,
    faceUp: true,
  }));
  const nextGame = removeCardsFromSource(game, source);
  const tableau = nextGame.tableau.map((column, index) =>
    index === columnIndex ? [...column, ...cards] : column,
  );

  return {
    ok: true,
    game: {
      ...nextGame,
      tableau,
    },
  };
}

function moveToFoundation(game, source, slotIndex) {
  if (!canMoveToFoundation(game, source, slotIndex)) {
    return { ok: false, game, tone: illegalTone(game, source) };
  }

  const [card] = getMoveCards(game, source);
  const nextGame = removeCardsFromSource(game, source);
  const foundations = nextGame.foundations.slice();
  const existing = foundations[slotIndex];
  let completedCategoryId = null;

  if (card.type === "title") {
    foundations[slotIndex] = {
      categoryId: card.categoryId,
      categoryTitle: card.categoryTitle,
      totalItems: card.totalItems,
      color: card.color,
      hasTitle: true,
      cards: [{ ...card, faceUp: true }],
      itemCount: 0,
      completing: false,
    };
  } else {
    const updatedCards = [...existing.cards, { ...card, faceUp: true }];
    const itemCount = existing.itemCount + 1;
    const isComplete = itemCount === existing.totalItems;
    foundations[slotIndex] = {
      ...existing,
      cards: updatedCards,
      itemCount,
      completing: isComplete,
    };

    if (isComplete) {
      completedCategoryId = existing.categoryId;
    }
  }

  return {
    ok: true,
    game: {
      ...nextGame,
      foundations,
    },
    completedCategoryId,
    completedSlotIndex: completedCategoryId ? slotIndex : null,
  };
}

function removeCardsFromSource(game, source) {
  if (source.type === "draft") {
    return {
      ...game,
      draft: game.draft.slice(0, -1),
    };
  }

  if (source.type === "tableau") {
    const tableau = game.tableau.map((column, columnIndex) => {
      if (columnIndex !== source.columnIndex) {
        return column;
      }

      return revealBottomCard(column.slice(0, source.cardIndex));
    });

    return {
      ...game,
      tableau,
    };
  }

  return game;
}

function illegalTone(game, source) {
  const [card] = getMoveCards(game, source);
  return card?.type === "title" ? "error" : "warning";
}

export function completeFoundationSlot(game, slotIndex, categoryId) {
  if (!categoryId) {
    return game;
  }

  const foundation = game.foundations[slotIndex];
  if (!foundation || foundation.categoryId !== categoryId) {
    return game;
  }

  const foundations = game.foundations.slice();
  foundations[slotIndex] = null;

  return {
    ...game,
    foundations,
    clearedCategoryIds: [...game.clearedCategoryIds, categoryId],
    score: game.score + 100,
  };
}

export function isWon(game) {
  return (
    game.clearedCategoryIds.length === game.categories.length &&
    game.source.length === 0 &&
    game.draft.length === 0 &&
    game.tableau.every((column) => column.length === 0) &&
    game.foundations.every((foundation) => foundation === null)
  );
}
