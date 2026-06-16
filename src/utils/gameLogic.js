export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function isTitleCard(card) {
  return card.itemName === null
}

export function getCategoryItemCount(deck, categoryTitle) {
  return deck.filter(c => c.categoryTitle === categoryTitle && c.itemName !== null).length
}

export function initializeGame(deckData) {
  const shuffled = shuffle(deckData)
  const tableau = [[], [], [], [], []]
  const columnSizes = [4, 5, 6, 7, 8]
  let cardIndex = 0

  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < columnSizes[col]; row++) {
      const card = { ...shuffled[cardIndex], faceUp: row === columnSizes[col] - 1 }
      tableau[col].push(card)
      cardIndex++
    }
  }

  const stock = shuffled.slice(cardIndex).map(c => ({ ...c, faceUp: false }))

  return {
    stock,
    waste: [],
    foundations: [null, null, null, null, null],
    tableau,
    score: 0,
  }
}

export function isValidStack(cards) {
  if (cards.length === 0) return false
  if (cards.length === 1) return true
  const category = cards[0].categoryTitle
  return cards.every(c => c.faceUp && c.categoryTitle === category)
}

export function canMoveToTableauColumn(cards, targetColumn) {
  if (!isValidStack(cards)) return false
  if (targetColumn.length === 0) return true

  const movingCard = cards[0]
  const targetTop = targetColumn[targetColumn.length - 1]

  if (!targetTop.faceUp) return false

  if (isTitleCard(movingCard)) {
    return targetTop.categoryTitle === movingCard.categoryTitle && !isTitleCard(targetTop)
  }

  return targetTop.categoryTitle === movingCard.categoryTitle && !isTitleCard(targetTop)
}

export function canMoveToFoundation(cards, foundation, deckData) {
  if (cards.length !== 1) return false
  const card = cards[0]

  if (foundation === null) {
    return isTitleCard(card)
  }

  if (isTitleCard(card)) return false

  return card.categoryTitle === foundation.categoryTitle
}
