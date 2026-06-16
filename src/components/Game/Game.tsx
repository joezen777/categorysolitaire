import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  styled,
  Modal,
  Button,
} from '@mui/material';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GameState, GameCard, DropTarget } from '../../types/game';
import { starterDeckCards, getCategoryItemCount } from '../../data/deckConfig';
import { audioManager } from '../../utils/audioManager';
import { GameLogic } from '../../utils/gameLogic';
import SourceDeck from '../SourceDeck/SourceDeck';
import DraftPile from '../DraftPile/DraftPile';
import Foundation from '../Foundation/Foundation';
import Tableau from '../Tableau/Tableau';
import GameMenu from '../Menu/Menu';
import Card from '../Card/Card';

const GameContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: theme.spacing(2),
}));

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1, 2),
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  backdropFilter: 'blur(10px)',
}));

const ScoreDisplay = styled(Typography)(({ theme }) => ({
  fontSize: '24px',
  fontWeight: 700,
  color: '#fff',
  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
}));

const PlayArea = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const TopSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

const DeckSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  alignItems: 'flex-start',
}));

const FoundationSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}));

const TableauSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  justifyContent: 'center',
  flexWrap: 'wrap',
}));

const WinModal = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  backgroundColor: '#fff',
  padding: theme.spacing(4),
  borderRadius: '16px',
  textAlign: 'center',
  maxWidth: '400px',
  width: '90%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
}));

const Game: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState>(() => initializeGame());
  const [selectedCard, setSelectedCard] = useState<{ card: GameCard; source: string; index: number } | null>(null);
  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [draggingCards, setDraggingCards] = useState<GameCard[]>([]);
  const [showWinModal, setShowWinModal] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context }) => {
        if (
          event.code === 'Space' &&
          context.active instanceof HTMLElement &&
          context.active.dataset?.keyboardFocus === 'true'
        ) {
          return {
            x: context.active.getBoundingClientRect().x,
            y: context.active.getBoundingClientRect().y,
          };
        }
        return undefined;
      },
    })
  );

  // Initialize game
  function initializeGame(): GameState {
    const shuffledDeck = [...starterDeckCards].sort(() => Math.random() - 0.5);

    // Create game cards with face down
    const sourceDeck: GameCard[] = shuffledDeck.map((card) => ({
      ...card,
      faceUp: 'down',
      source: 'source',
    }));

    // Initialize tableau with cards (4, 5, 6, 7, 8 cards per column)
    const tableau: GameCard[][] = [[], [], [], [], []];
    const tableauLayout = [4, 5, 6, 7, 8];
    let cardIndex = 0;

    tableauLayout.forEach((cardCount, colIndex) => {
      for (let i = 0; i < cardCount; i++) {
        if (cardIndex < sourceDeck.length) {
          const card = sourceDeck.splice(cardIndex, 1)[0];
          card.faceUp = i === cardCount - 1 ? 'up' : 'down';
          card.source = 'tableau';
          card.sourceIndex = colIndex;
          tableau[colIndex].push(card);
        }
      }
    });

    // Initialize foundation slots
    const foundation = Array(5).fill(null).map((_, i) => ({
      id: `foundation-${i}`,
      categoryTitle: null,
      cards: [],
    }));

    return {
      sourceDeck,
      draftPile: [],
      foundation,
      tableau: tableau.map((cards, i) => ({
        id: `tableau-${i}`,
        cards,
      })),
      score: 0,
      soundEnabled: true,
      gameOver: false,
    };
  }

  // Check for win condition
  useEffect(() => {
    const isWon = GameLogic.isGameWon(gameState.tableau, gameState.draftPile);
    if (isWon && !gameState.gameOver) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      audioManager.playWin();
      setShowWinModal(true);
    }
  }, [gameState.tableau, gameState.draftPile, gameState.gameOver]);

  // Draw card from source deck
  const handleDrawCard = useCallback(() => {
    if (gameState.sourceDeck.length === 0) return;

    setGameState(prev => {
      const newSourceDeck = [...prev.sourceDeck];
      const newDraftPile = [...prev.draftPile];
      const card = newSourceDeck.pop()!;
      
      card.faceUp = 'up';
      card.source = 'draft';
      newDraftPile.push(card);

      audioManager.playDeal();

      return {
        ...prev,
        sourceDeck: newSourceDeck,
        draftPile: newDraftPile,
      };
    });
  }, [gameState.sourceDeck.length]);

  // Reset draft pile
  const handleResetDraft = useCallback(() => {
    if (gameState.draftPile.length === 0) return;

    setGameState(prev => {
      const newDraftPile = [...prev.draftPile].reverse();
      newDraftPile.forEach(card => {
        card.faceUp = 'down';
        card.source = 'source';
      });

      audioManager.playFlip();

      return {
        ...prev,
        sourceDeck: newDraftPile,
        draftPile: [],
      };
    });
  }, [gameState.draftPile.length]);

  // Handle card click (tap-to-move)
  const handleCardClick = useCallback((card: GameCard, source: string, index: number) => {
    if (card.faceUp !== 'up') return;

    if (selectedCard === null) {
      // Select card
      setSelectedCard({ card, source, index });
    } else {
      // Try to move card
      const { card: selectedCardData, source: selectedSource, index: selectedIndex } = selectedCard;

      if (selectedCardData.id === card.id) {
        // Deselect
        setSelectedCard(null);
        return;
      }

      // Try to move to the clicked location
      let targetZone: 'foundation' | 'tableau' | null = null;
      let targetIndex = -1;

      if (source === 'foundation') {
        targetZone = 'foundation';
        targetIndex = index;
      } else if (source === 'tableau') {
        targetZone = 'tableau';
        targetIndex = index;
      }

      if (targetZone && targetIndex !== -1) {
        const target: DropTarget = { zone: targetZone, index: targetIndex };
        const isValid = GameLogic.validateMoveFromTo(
          selectedCardData,
          selectedSource,
          selectedIndex,
          target,
          gameState.foundation,
          gameState.tableau
        );

        if (isValid) {
          handleMoveCard(selectedCardData, selectedSource, selectedIndex, target);
          setSelectedCard(null);
        } else {
          audioManager.playError();
          setSelectedCard(null);
        }
      } else {
        setSelectedCard({ card, source, index });
      }
    }
  }, [selectedCard, gameState.foundation, gameState.tableau, handleMoveCard]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as { card: GameCard; source: string; sourceIndex: number };

    if (activeData?.card) {
      setActiveCard(activeData.card);
      
      // If dragging from tableau, get the sequence of cards
      if (activeData.source === 'tableau') {
        const column = gameState.tableau[activeData.sourceIndex];
        const cardIndex = column.cards.findIndex(c => c.id === activeData.card.id);
        if (cardIndex !== -1) {
          const sequence = column.cards.slice(cardIndex);
          if (GameLogic.canMoveSequence(sequence)) {
            setDraggingCards(sequence);
          } else {
            setDraggingCards([activeData.card]);
          }
        }
      } else {
        setDraggingCards([activeData.card]);
      }
    }
  }, [gameState.tableau]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setDraggingCards([]);

    if (!over) {
      audioManager.playError();
      return;
    }

    const activeData = active.data.current as { card: GameCard; source: string; sourceIndex: number };
    const overData = over.data.current as { zone: 'foundation' | 'tableau'; index: number };

    if (!activeData || !overData) {
      return;
    }

    const { card, source: fromSource, sourceIndex: fromIndex } = activeData;
    const { zone: toZone, index: toIndex } = overData;

    // Validate the move
    const target: DropTarget = { zone: toZone, index: toIndex };
    const isValid = GameLogic.validateMoveFromTo(
      card,
      fromSource,
      fromIndex,
      target,
      gameState.foundation,
      gameState.tableau
    );

    if (isValid) {
      // Handle moving multiple cards from tableau
      if (fromSource === 'tableau' && draggingCards.length > 1) {
        setGameState(prev => {
          const newState = { ...prev };

          // Remove cards from source column
          newState.tableau = prev.tableau.map((col, i) => {
            if (i === fromIndex) {
              const cardIndex = col.cards.findIndex(c => c.id === card.id);
              const newCards = col.cards.slice(0, cardIndex);
              
              // Flip top card if face down
              if (newCards.length > 0 && newCards[newCards.length - 1].faceUp === 'down') {
                newCards[newCards.length - 1].faceUp = 'up';
              }
              
              return { ...col, cards: newCards };
            }
            return col;
          });

          // Add cards to destination column
          newState.tableau = prev.tableau.map((col, i) => {
            if (i === toIndex) {
              const newCards = draggingCards.map(c => ({
                ...c,
                source: 'tableau',
                sourceIndex: toIndex,
              }));
              return {
                ...col,
                cards: [...col.cards, ...newCards],
              };
            }
            return col;
          });

          newState.score += draggingCards.length * 10;
          audioManager.playSuccess();

          return newState;
        });
      } else {
        // Move single card
        handleMoveCard(card, fromSource, fromIndex, target);
      }
    } else {
      audioManager.playError();
    }
  }, [gameState.foundation, gameState.tableau, draggingCards, handleMoveCard]);

  // Move card to destination
  const handleMoveCard = useCallback((
    card: GameCard,
    fromSource: string,
    fromIndex: number,
    target: DropTarget
  ) => {
    setGameState(prev => {
      const newState = { ...prev };

      // Remove card from source
      switch (fromSource) {
        case 'draft':
          newState.draftPile = prev.draftPile.filter(c => c.id !== card.id);
          break;
        case 'tableau':
          newState.tableau = prev.tableau.map((col, i) => {
            if (i === fromIndex) {
              const newCards = col.cards.filter(c => c.id !== card.id);
              // Flip top card if face down
              if (newCards.length > 0 && newCards[newCards.length - 1].faceUp === 'down') {
                newCards[newCards.length - 1].faceUp = 'up';
              }
              return { ...col, cards: newCards };
            }
            return col;
          });
          break;
        case 'foundation':
          newState.foundation = prev.foundation.map((slot, i) => {
            if (i === fromIndex) {
              return {
                ...slot,
                cards: slot.cards.filter(c => c.id !== card.id),
                categoryTitle: slot.cards.length <= 1 ? null : slot.categoryTitle,
              };
            }
            return slot;
          });
          break;
      }

      // Add card to destination
      if (target.zone === 'foundation') {
        newState.foundation = prev.foundation.map((slot, i) => {
          if (i === target.index) {
            const newCard = { ...card, source: 'foundation', sourceIndex: i };
            if (card.isTitleCard) {
              return {
                ...slot,
                categoryTitle: card.categoryTitle,
                cards: [newCard],
              };
            }
            return {
              ...slot,
              cards: [...slot.cards, newCard],
            };
          }
          return slot;
        });

        // Check for category completion
        const updatedSlot = newState.foundation[target.index];
        if (updatedSlot.categoryTitle) {
          const titleCard = updatedSlot.cards.find(c => c.isTitleCard);
          const itemCount = updatedSlot.cards.filter(c => !c.isTitleCard).length;
          
          // Get expected item count from deck config
          const categoryCards = starterDeckCards.filter(c => c.categoryTitle === updatedSlot.categoryTitle);
          const expectedCount = categoryCards.filter(c => !c.isTitleCard).length;

          if (itemCount === expectedCount && titleCard) {
            // Category complete
            setTimeout(() => {
              audioManager.playCategoryComplete();
              setGameState(prevState => {
                const newFoundation = prevState.foundation.map((slot, i) => {
                  if (i === target.index) {
                    return {
                      id: slot.id,
                      categoryTitle: null,
                      cards: [],
                    };
                  }
                  return slot;
                });
                return {
                  ...prevState,
                  foundation: newFoundation,
                  score: prevState.score + 100,
                };
              });
            }, 500);
          }
        }
      } else if (target.zone === 'tableau') {
        newState.tableau = prev.tableau.map((col, i) => {
          if (i === target.index) {
            const newCard = { ...card, source: 'tableau', sourceIndex: i };
            return {
              ...col,
              cards: [...col.cards, newCard],
            };
          }
          return col;
        });
      }

      newState.score += 10;
      audioManager.playSuccess();

      return newState;
    });
  }, []);

  // Handle restart
  const handleRestart = useCallback(() => {
    setGameState(initializeGame());
    setSelectedCard(null);
    setShowWinModal(false);
  }, []);

  // Handle quit
  const handleQuit = useCallback(() => {
    // Navigate away or show quit screen
    window.location.reload();
  }, []);

  // Handle sound toggle
  const handleSoundToggle = useCallback(() => {
    setGameState(prev => {
      const newSoundEnabled = !prev.soundEnabled;
      audioManager.setEnabled(newSoundEnabled);
      return { ...prev, soundEnabled: newSoundEnabled };
    });
  }, []);

  // Handle slot click (for tap-to-move to empty foundation)
  const handleFoundationSlotClick = useCallback((slotIndex: number) => {
    if (selectedCard) {
      const target: DropTarget = { zone: 'foundation', index: slotIndex };
      const isValid = GameLogic.validateMoveFromTo(
        selectedCard.card,
        selectedCard.source,
        selectedCard.index,
        target,
        gameState.foundation,
        gameState.tableau
      );

      if (isValid) {
        handleMoveCard(selectedCard.card, selectedCard.source, selectedCard.index, target);
        setSelectedCard(null);
      } else {
        audioManager.playError();
        setSelectedCard(null);
      }
    }
  }, [selectedCard, gameState.foundation, gameState.tableau, handleMoveCard]);

  // Handle tableau column click (for tap-to-move to empty column)
  const handleTableauColumnClick = useCallback((columnIndex: number) => {
    if (selectedCard) {
      const target: DropTarget = { zone: 'tableau', index: columnIndex };
      const isValid = GameLogic.validateMoveFromTo(
        selectedCard.card,
        selectedCard.source,
        selectedCard.index,
        target,
        gameState.foundation,
        gameState.tableau
      );

      if (isValid) {
        handleMoveCard(selectedCard.card, selectedCard.source, selectedCard.index, target);
        setSelectedCard(null);
      } else {
        audioManager.playError();
        setSelectedCard(null);
      }
    }
  }, [selectedCard, gameState.foundation, gameState.tableau, handleMoveCard]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <GameContainer>
        <Container maxWidth="lg">
          <Header>
            <ScoreDisplay>Score: {gameState.score}</ScoreDisplay>
            <GameMenu
              onRestart={handleRestart}
              onQuit={handleQuit}
              soundEnabled={gameState.soundEnabled}
              onSoundToggle={handleSoundToggle}
            />
          </Header>

          <PlayArea>
            <TopSection>
              <DeckSection>
                <SourceDeck
                  cards={gameState.sourceDeck}
                  onDrawCard={handleDrawCard}
                  onResetDraft={handleResetDraft}
                  draftPileEmpty={gameState.draftPile.length === 0}
                />
                <DraftPile
                  cards={gameState.draftPile}
                  onCardClick={(card, index) =>
                    handleCardClick(card, 'draft', index)
                  }
                  disabled={false}
                />
              </DeckSection>

              <FoundationSection>
                {gameState.foundation.map((slot, index) => {
                  // Calculate expected count for this category
                  let expectedCount = 0;
                  if (slot.categoryTitle) {
                    const categoryCards = starterDeckCards.filter(c => c.categoryTitle === slot.categoryTitle);
                    expectedCount = categoryCards.filter(c => !c.isTitleCard).length;
                  }
                  
                  return (
                    <Foundation
                      key={slot.id}
                      slot={slot}
                      index={index}
                      expectedCount={expectedCount}
                      onSlotClick={handleFoundationSlotClick}
                      isDraggingOver={false}
                    />
                  );
                })}
              </FoundationSection>
            </TopSection>

            <TableauSection>
              {gameState.tableau.map((column, index) => (
                <Tableau
                  key={column.id}
                  column={column}
                  index={index}
                  onCardClick={(card, cardIndex, columnIndex) =>
                    handleCardClick(card, 'tableau', columnIndex)
                  }
                  onDropZoneClick={handleTableauColumnClick}
                  selectedCards={selectedCard ? [selectedCard.card] : []}
                  isDraggingOver={false}
                />
              ))}
            </TableauSection>
          </PlayArea>
        </Container>

        <DragOverlay>
          {activeCard && <Card card={activeCard} isDragging />}
        </DragOverlay>

        {showWinModal && (
          <Modal open={showWinModal} onClose={() => setShowWinModal(false)}>
            <WinModal>
              <Typography variant="h4" gutterBottom sx={{ color: '#4caf50' }}>
                🎉 Game Over - You Win! 🎉
              </Typography>
              <Typography variant="h6" gutterBottom>
                Final Score: {gameState.score}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleRestart}
                sx={{ mt: 3 }}
              >
                Play Again
              </Button>
            </WinModal>
          </Modal>
        )}
      </GameContainer>
    </DndContext>
  );
};

export default Game;