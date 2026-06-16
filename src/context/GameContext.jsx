import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  initializeGame,
  isTitleCard,
  isValidTableauMove,
  isValidFoundationMove,
  getMovableSequence,
  getCategoryMap,
  checkWinCondition,
} from '../utils/gameLogic';
import {
  playErrorSound,
  playWarningSound,
  playSuccessSound,
  playCardFlipSound,
  playCardPlaceSound,
} from '../utils/sound';
import deckData from '../data/deck.json';

const GameContext = createContext(null);

const categoryMap = getCategoryMap(deckData);

function gameReducer(state, action) {
  switch (action.type) {
    case 'RESTART_GAME': {
      return initializeGame(deckData);
    }

    case 'DRAW_CARD': {
      if (state.stockPile.length === 0) return state;
      const newStock = [...state.stockPile];
      const drawn = { ...newStock.pop(), faceUp: true };
      return {
        ...state,
        stockPile: newStock,
        wastePile: [...state.wastePile, drawn],
      };
    }

    case 'RESET_STOCK': {
      if (state.stockPile.length > 0 || state.wastePile.length === 0) return state;
      // Flip waste pile over and reverse order
      const newStock = [...state.wastePile].reverse().map((c) => ({ ...c, faceUp: false }));
      return {
        ...state,
        stockPile: newStock,
        wastePile: [],
      };
    }

    case 'MOVE_CARD': {
      const { source, destination } = action.payload;
      return handleMove(state, source, destination);
    }

    case 'SET_GAME_WON': {
      return { ...state, gameWon: true };
    }

    default:
      return state;
  }
}

function handleMove(state, source, destination) {
  // Get the card(s) being moved
  let movingCards = [];
  let newState = { ...state };

  // Source: waste pile
  if (source.type === 'waste') {
    if (state.wastePile.length === 0) return state;
    const card = state.wastePile[state.wastePile.length - 1];
    movingCards = [card];
    newState.wastePile = state.wastePile.slice(0, -1);
  }
  // Source: tableau column
  else if (source.type === 'tableau') {
    const col = state.tableau[source.colIndex];
    const sequence = getMovableSequence(col, source.cardIndex);
    if (!sequence) return state;
    movingCards = sequence;
    const newTableau = state.tableau.map((c, i) => {
      if (i === source.colIndex) {
        const newCol = c.slice(0, source.cardIndex);
        // Flip new bottom card face up
        if (newCol.length > 0 && !newCol[newCol.length - 1].faceUp) {
          newCol[newCol.length - 1] = { ...newCol[newCol.length - 1], faceUp: true };
        }
        return newCol;
      }
      return c;
    });
    newState.tableau = newTableau;
  }
  // Source: foundation (not typically needed but for completeness)
  else if (source.type === 'foundation') {
    return state; // Can't move from foundation back
  } else {
    return state;
  }

  // Destination: tableau column
  if (destination.type === 'tableau') {
    const targetCol = newState.tableau[destination.colIndex];
    const firstCard = movingCards[0];

    if (!isValidTableauMove(firstCard, targetCol, newState.tableau)) {
      // Invalid move - revert
      playErrorSound();
      return state;
    }

    newState.tableau = newState.tableau.map((c, i) => {
      if (i === destination.colIndex) {
        return [...c, ...movingCards];
      }
      return c;
    });
    playCardPlaceSound();
  }
  // Destination: foundation
  else if (destination.type === 'foundation') {
    // Only single cards can go to foundation
    if (movingCards.length > 1) {
      playWarningSound();
      return state;
    }

    const card = movingCards[0];
    const slotIndex = destination.slotIndex;
    const slot = newState.foundation[slotIndex];

    if (!isValidFoundationMove(card, slot)) {
      playWarningSound();
      return state;
    }

    const newFoundation = [...newState.foundation];
    if (isTitleCard(card)) {
      // Place title card - start new foundation pile
      newFoundation[slotIndex] = {
        categoryTitle: card.categoryTitle,
        cards: [card],
        count: 0,
        total: categoryMap[card.categoryTitle]?.totalItems || 0,
      };
    } else {
      // Place item card on existing foundation
      const pile = { ...newFoundation[slotIndex] };
      pile.cards = [...pile.cards, card];
      pile.count = pile.count + 1;
      newFoundation[slotIndex] = pile;

      // Check if category is complete
      if (pile.count >= pile.total) {
        // Category complete! Award points and clear slot
        newState.score = (newState.score || 0) + 100;
        newFoundation[slotIndex] = null;
        // Defer success sound
        setTimeout(() => playSuccessSound(), 100);
      }
    }

    newState.foundation = newFoundation;
    if (!(isTitleCard(card) === false && newState.foundation[slotIndex] === null)) {
      playCardPlaceSound();
    }
  } else {
    return state;
  }

  // Check win condition
  if (checkWinCondition(newState)) {
    newState.gameWon = true;
    setTimeout(() => playSuccessSound(), 300);
  }

  return newState;
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, null, () => initializeGame(deckData));

  const drawCard = useCallback(() => {
    playCardFlipSound();
    dispatch({ type: 'DRAW_CARD' });
  }, []);

  const resetStock = useCallback(() => {
    playCardFlipSound();
    dispatch({ type: 'RESET_STOCK' });
  }, []);

  const moveCard = useCallback((source, destination) => {
    dispatch({ type: 'MOVE_CARD', payload: { source, destination } });
  }, []);

  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART_GAME' });
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...state,
        drawCard,
        resetStock,
        moveCard,
        restartGame,
        categoryMap,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
