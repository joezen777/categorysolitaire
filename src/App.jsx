import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

import deckData from './data/deck.json';
import SolitaireCard from './components/SolitaireCard';
import MenuCog from './components/MenuCog';
import GlitterEffect from './components/GlitterEffect';
import {
  initializeGame,
  isValidMove,
  isValidDragSequence,
  getCategoryColor
} from './utils/gameLogic';
import {
  playSuccessSound,
  playErrorSound,
  playWarningSound,
  setSoundEnabled,
  isSoundEnabled
} from './utils/audio';

export default function App() {
  // Game States
  const [gameState, setGameState] = useState('welcome'); // welcome, playing, won
  const [board, setBoard] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  
  // Tap-to-move state
  const [selectedCardInfo, setSelectedCardInfo] = useState(null); // { type, index, cardIndex, card }

  // Glitter & Fade states for completions
  const [glitteringSlots, setGlitteringSlots] = useState([false, false, false, false, false]);
  const [fadingSlots, setFadingSlots] = useState([false, false, false, false, false]);

  // Dragging states
  const [activeDrag, setActiveDrag] = useState(null);
  // activeDrag: { type, index, cardIndex, cards, startX, startY, currentX, currentY, offsetX, offsetY, isDragging }

  const dragVisualRef = useRef(null);

  // Initialize sound setting
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);

  // Start/Restart Game
  const handleStartGame = () => {
    const newBoard = initializeGame(deckData);
    setBoard(newBoard);
    setSelectedCardInfo(null);
    setGlitteringSlots([false, false, false, false, false]);
    setFadingSlots([false, false, false, false, false]);
    setGameState('playing');
  };

  const handleQuitGame = () => {
    setGameState('welcome');
    setBoard(null);
    setSelectedCardInfo(null);
  };

  // Sound Toggle
  const handleToggleSound = () => {
    setSoundOn(prev => !prev);
  };

  // Recycle Draft Pile to Source Deck
  const handleSourceDeckClick = () => {
    if (gameState !== 'playing' || !board) return;

    const { sourceDeck, draftPile } = board;

    if (sourceDeck.length > 0) {
      // Deal 1 card to draft pile
      const updatedSource = [...sourceDeck];
      const dealtCard = updatedSource.pop();
      dealtCard.faceUp = true;

      setBoard(prev => ({
        ...prev,
        sourceDeck: updatedSource,
        draftPile: [...prev.draftPile, dealtCard]
      }));
      // Clear tap selection when drawing
      setSelectedCardInfo(null);
    } else if (draftPile.length > 0) {
      // Recycle draft pile
      // Flip draft pile over and invert order
      // So top of draft pile (last element) becomes bottom of source deck (first element),
      // and bottom of draft pile (first element) becomes top of source deck (last element).
      // That means reversing the draft pile, flipping face-down, and setting as source deck.
      const recycledCards = [...draftPile].reverse().map(card => ({
        ...card,
        faceUp: false
      }));

      setBoard(prev => ({
        ...prev,
        sourceDeck: recycledCards,
        draftPile: []
      }));
      setSelectedCardInfo(null);
    }
  };

  // Core move execution
  const executeMove = (source, target) => {
    // source: { type: 'tableau'|'draft'|'foundation', index, cardIndex }
    // target: { type: 'tableau'|'foundation', index }
    
    setBoard(prev => {
      let movedCards = [];
      let updatedTableau = prev.tableau.map(col => [...col]);
      let updatedDraft = [...prev.draftPile];
      let updatedFoundation = prev.foundation.map(slot => [...slot]);
      let updatedScore = prev.score;

      // Extract cards from source
      if (source.type === 'tableau') {
        const col = updatedTableau[source.index];
        movedCards = col.slice(source.cardIndex);
        updatedTableau[source.index] = col.slice(0, source.cardIndex);
        
        // Auto flip new bottom card in source column
        if (updatedTableau[source.index].length > 0) {
          const newBottom = updatedTableau[source.index][updatedTableau[source.index].length - 1];
          newBottom.faceUp = true;
        }
      } else if (source.type === 'draft') {
        const card = updatedDraft.pop();
        movedCards = [card];
      } else if (source.type === 'foundation') {
        const card = updatedFoundation[source.index].pop();
        movedCards = [card];
      }

      // Add cards to target
      if (target.type === 'tableau') {
        updatedTableau[target.index] = [...updatedTableau[target.index], ...movedCards];
      } else if (target.type === 'foundation') {
        updatedFoundation[target.index] = [...updatedFoundation[target.index], ...movedCards];
      }

      // Prepare state copy
      const nextBoard = {
        ...prev,
        tableau: updatedTableau,
        draftPile: updatedDraft,
        foundation: updatedFoundation,
        score: updatedScore
      };

      // Check if this drop completed a category in foundation
      if (target.type === 'foundation') {
        const slotIdx = target.index;
        const slotCards = updatedFoundation[slotIdx];
        if (slotCards.length > 0) {
          const titleCard = slotCards[0];
          const itemCardsCount = slotCards.length - 1;
          
          if (titleCard.isTitle && itemCardsCount === titleCard.totalItems) {
            // Success! completed category
            triggerCategoryCompletion(slotIdx, titleCard.categoryTitle);
          }
        }
      }

      return nextBoard;
    });

    setSelectedCardInfo(null);
  };

  // Triggers the glitter animation, plays sound, adds points, clears slot after 1.2s delay
  const triggerCategoryCompletion = (slotIdx, categoryTitle) => {
    // 1. Trigger glitter and fading animations in UI
    setGlitteringSlots(prev => {
      const next = [...prev];
      next[slotIdx] = true;
      return next;
    });

    setFadingSlots(prev => {
      const next = [...prev];
      next[slotIdx] = true;
      return next;
    });

    // 2. Play Success Sound procedurally
    playSuccessSound();

    // 3. Clear slot and award points after animation
    setTimeout(() => {
      setBoard(prev => {
        const updatedFoundation = prev.foundation.map((slot, idx) => 
          idx === slotIdx ? [] : slot
        );
        const updatedScore = prev.score + 100;

        const nextBoard = {
          ...prev,
          foundation: updatedFoundation,
          score: updatedScore
        };

        // Check Win Condition:
        // All categories (13 total) cleared, i.e. everything is empty
        const isTableauEmpty = nextBoard.tableau.every(col => col.length === 0);
        const isDraftEmpty = nextBoard.draftPile.length === 0;
        const isSourceEmpty = nextBoard.sourceDeck.length === 0;
        const isFoundationEmpty = nextBoard.foundation.every(slot => slot.length === 0);

        if (isTableauEmpty && isDraftEmpty && isSourceEmpty && isFoundationEmpty) {
          setGameState('won');
        }

        return nextBoard;
      });

      // Reset glitter/fade indicators
      setGlitteringSlots(prev => {
        const next = [...prev];
        next[slotIdx] = false;
        return next;
      });
      setFadingSlots(prev => {
        const next = [...prev];
        next[slotIdx] = false;
        return next;
      });

    }, 1200);
  };

  // Play warning or error sounds for illegal moves
  const playIllegalMoveSound = (card) => {
    if (card.isTitle) {
      playErrorSound();
    } else {
      playWarningSound();
    }
  };

  // Pointer Down event (starts Drag or counts as Tap)
  const handlePointerDown = (e, source) => {
    // source: { type: 'tableau'|'draft'|'foundation', index, cardIndex }
    
    // Only allow left-clicks/touches on face-up cards
    if (e.button !== 0 && e.button !== undefined) return;
    
    let cardToMove;
    let cardsToMove = [];

    if (source.type === 'tableau') {
      const column = board.tableau[source.index];
      if (!isValidDragSequence(column, source.cardIndex)) return;
      cardToMove = column[source.cardIndex];
      cardsToMove = column.slice(source.cardIndex);
    } else if (source.type === 'draft') {
      cardToMove = board.draftPile[board.draftPile.length - 1];
      cardsToMove = [cardToMove];
    } else if (source.type === 'foundation') {
      const slot = board.foundation[source.index];
      // Only top card in foundation is draggable
      if (source.cardIndex !== slot.length - 1) return;
      cardToMove = slot[source.cardIndex];
      cardsToMove = [cardToMove];
    }

    if (!cardToMove || !cardToMove.faceUp) return;

    e.preventDefault();
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setActiveDrag({
      type: source.type,
      index: source.index,
      cardIndex: source.cardIndex,
      cards: cardsToMove,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      offsetX,
      offsetY,
      isDragging: false
    });
  };

  // Pointer Move (global window tracker)
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!activeDrag) return;

      const deltaX = e.clientX - activeDrag.startX;
      const deltaY = e.clientY - activeDrag.startY;
      const distance = Math.hypot(deltaX, deltaY);

      // Start drag if dragged more than 5px
      if (distance > 5 && !activeDrag.isDragging) {
        setActiveDrag(prev => ({ ...prev, isDragging: true }));
      }

      if (activeDrag.isDragging || distance > 5) {
        setActiveDrag(prev => ({
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY
        }));
      }
    };

    const handlePointerUp = (e) => {
      if (!activeDrag) return;

      const deltaX = e.clientX - activeDrag.startX;
      const deltaY = e.clientY - activeDrag.startY;
      const distance = Math.hypot(deltaX, deltaY);

      if (activeDrag.isDragging || distance > 5) {
        // Drag-and-Drop finished
        // Determine target element under pointer
        const element = document.elementFromPoint(e.clientX, e.clientY);
        let targetType = null;
        let targetIndex = null;

        let cur = element;
        while (cur && cur !== document.body) {
          if (cur.hasAttribute('data-tableau-index')) {
            targetType = 'tableau';
            targetIndex = parseInt(cur.getAttribute('data-tableau-index'), 10);
            break;
          }
          if (cur.hasAttribute('data-foundation-index')) {
            targetType = 'foundation';
            targetIndex = parseInt(cur.getAttribute('data-foundation-index'), 10);
            break;
          }
          cur = cur.parentElement;
        }

        const movingCard = activeDrag.cards[0];
        
        if (targetType !== null && targetIndex !== null) {
          const targetCards = targetType === 'tableau' 
            ? board.tableau[targetIndex]
            : board.foundation[targetIndex];
          
          if (isValidMove(movingCard, targetType, targetIndex, targetCards)) {
            executeMove(
              { type: activeDrag.type, index: activeDrag.index, cardIndex: activeDrag.cardIndex },
              { type: targetType, index: targetIndex }
            );
          } else {
            // Illegal drop -> play sound
            playIllegalMoveSound(movingCard);
          }
        } else {
          // Dropped on empty space
          playIllegalMoveSound(movingCard);
        }
      } else {
        // Simple Tap action
        handleCardTap({
          type: activeDrag.type,
          index: activeDrag.index,
          cardIndex: activeDrag.cardIndex,
          card: activeDrag.cards[0]
        });
      }

      setActiveDrag(null);
    };

    if (activeDrag) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, board]);

  // Handles Tap-to-move logic
  const handleCardTap = (tapInfo) => {
    // tapInfo: { type, index, cardIndex, card }

    if (!selectedCardInfo) {
      // Select card
      setSelectedCardInfo(tapInfo);
    } else {
      // Attempting to place selected card on the tapped card
      const source = selectedCardInfo;
      
      // If tapping same card, deselect
      if (source.type === tapInfo.type && source.index === tapInfo.index && source.cardIndex === tapInfo.cardIndex) {
        setSelectedCardInfo(null);
        return;
      }

      // Check if the tapped location is a valid destination
      // Tapping a card in tableau column is a request to place ON that column
      let targetType = tapInfo.type;
      let targetIndex = tapInfo.index;

      if (targetType === 'draft') {
        // Cannot place cards on draft pile
        setSelectedCardInfo(null);
        playIllegalMoveSound(source.card);
        return;
      }

      const targetCards = targetType === 'tableau'
        ? board.tableau[targetIndex]
        : board.foundation[targetIndex];

      if (isValidMove(source.card, targetType, targetIndex, targetCards)) {
        executeMove(
          { type: source.type, index: source.index, cardIndex: source.cardIndex },
          { type: targetType, index: targetIndex }
        );
      } else {
        playIllegalMoveSound(source.card);
        setSelectedCardInfo(null);
      }
    }
  };

  // Handles tapping an empty column or foundation slot placeholder directly
  const handleEmptySlotTap = (targetType, targetIndex) => {
    if (!selectedCardInfo) return;

    const source = selectedCardInfo;
    const targetCards = targetType === 'tableau' ? [] : [];

    if (isValidMove(source.card, targetType, targetIndex, targetCards)) {
      executeMove(
        { type: source.type, index: source.index, cardIndex: source.cardIndex },
        { type: targetType, index: targetIndex }
      );
    } else {
      playIllegalMoveSound(source.card);
      setSelectedCardInfo(null);
    }
  };

  // Welcome Screen Render
  if (gameState === 'welcome') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #090714 0%, #151138 100%)',
          color: '#ffffff',
          px: 3,
          textAlign: 'center'
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(25, 20, 45, 0.65)',
            backdropFilter: 'blur(15px)',
            maxWidth: 550,
            width: '100%',
            boxShadow: '0 0 35px rgba(168, 85, 247, 0.25)'
          }}
        >
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 800, 
              mb: 2, 
              background: 'linear-gradient(45deg, #38bdf8, #a855f7, #f43f5e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(168, 85, 247, 0.4)',
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              letterSpacing: '-0.5px'
            }}
          >
            Category Solitaire
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6 }}>
            Arrange items from 13 different categories. Start by placing a Category Title card into a slot or column, then stack item cards of the same category. Sort all cards to clear the deck and win!
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartGame}
            startIcon={<PlayArrowIcon />}
            sx={{
              background: 'linear-gradient(45deg, #a855f7, #f43f5e)',
              color: '#fff',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              borderRadius: 3,
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
              transition: 'transform 0.2s ease, box-shadow 0.2s',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 0 25px rgba(168, 85, 247, 0.7)',
                background: 'linear-gradient(45deg, #a855f7, #f43f5e)',
              }
            }}
          >
            Play Game
          </Button>
        </Paper>
      </Box>
    );
  }

  // Active Game Render
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', pb: 2 }}>
      {/* Header bar */}
      <Container maxWidth="xl" sx={{ mt: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEventsIcon sx={{ color: '#fbbf24', fontSize: '1.8rem' }} />
            <Typography variant="h5" sx={{ fontWeight: '800', letterSpacing: '0.5px', color: '#fff' }}>
              Score: <span style={{ color: '#fbbf24' }}>{board.score}</span>
            </Typography>
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: '800', 
              fontSize: { xs: '1rem', sm: '1.25rem' }, 
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.5px',
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Category Solitaire
          </Typography>
          <MenuCog
            soundEnabled={soundOn}
            onToggleSound={handleToggleSound}
            onRestart={handleStartGame}
            onQuit={handleQuitGame}
          />
        </Box>
      </Container>

      {/* Main Board Container */}
      <Container 
        maxWidth="xl" 
        className="no-scrollbar"
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: { xs: 2, sm: 3 },
          overflowX: 'auto',
          px: { xs: 1, sm: 2 }
        }}
      >
        {/* Upper Board: Source, Draft, and Foundation Slots */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            gap: { xs: 1.5, sm: 3 },
            minWidth: '600px' // Ensure elements don't crush on small devices
          }}
        >
          {/* Deck & Draft pile area */}
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 } }}>
            {/* Source Deck */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, fontSize: '10px' }}>
                DECK ({board.sourceDeck.length})
              </Typography>
              <Paper
                elevation={board.sourceDeck.length > 0 ? 4 : 0}
                onClick={handleSourceDeckClick}
                sx={{
                  width: { xs: '68px', sm: '80px', md: '90px' },
                  height: { xs: '96px', sm: '112px', md: '126px' },
                  borderRadius: '8px',
                  border: board.sourceDeck.length > 0 ? '1.5px solid rgba(255,255,255,0.15)' : '2px dashed rgba(255, 255, 255, 0.1)',
                  background: board.sourceDeck.length > 0
                    ? 'repeating-linear-gradient(135deg, #1e1b4b, #1e1b4b 8px, #312e81 8px, #312e81 16px)'
                    : 'transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                {board.sourceDeck.length === 0 && (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.25)', fontSize: '10px', textAlign: 'center', p: 1 }}>
                    Recycle
                  </Typography>
                )}
              </Paper>
            </Box>

            {/* Draft Pile */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, fontSize: '10px' }}>
                DRAFT
              </Typography>
              <Box
                sx={{
                  width: { xs: '68px', sm: '80px', md: '90px' },
                  height: { xs: '96px', sm: '112px', md: '126px' },
                  borderRadius: '8px',
                  border: board.draftPile.length === 0 ? '2px dashed rgba(255, 255, 255, 0.1)' : 'none',
                  position: 'relative',
                  boxSizing: 'border-box'
                }}
              >
                {board.draftPile.length > 0 && (
                  <SolitaireCard
                    card={board.draftPile[board.draftPile.length - 1]}
                    selected={
                      selectedCardInfo &&
                      selectedCardInfo.type === 'draft' &&
                      selectedCardInfo.index === 0
                    }
                    onTap={() => handleCardTap({
                      type: 'draft',
                      index: 0,
                      cardIndex: board.draftPile.length - 1,
                      card: board.draftPile[board.draftPile.length - 1]
                    })}
                    dragHandlers={{
                      onPointerDown: (e) => handlePointerDown(e, {
                        type: 'draft',
                        index: 0,
                        cardIndex: board.draftPile.length - 1
                      })
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Foundation area */}
          <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 } }}>
            {board.foundation.map((slot, slotIdx) => {
              const isEmpty = slot.length === 0;
              const topCard = !isEmpty ? slot[slot.length - 1] : null;
              const titleCard = !isEmpty ? slot[0] : null;
              const collected = !isEmpty ? slot.length - 1 : 0;
              const total = titleCard ? titleCard.totalItems : 0;

              return (
                <Box key={slotIdx} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: titleCard ? getCategoryColor(titleCard.categoryTitle) : 'rgba(255,255,255,0.4)', 
                      mb: 0.5, 
                      fontSize: '10px',
                      fontWeight: titleCard ? 'bold' : 'normal',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      height: '15px',
                      overflow: 'hidden',
                      maxWidth: { xs: '68px', sm: '80px', md: '90px' }
                    }}
                  >
                    {!isEmpty ? `${titleCard.categoryTitle.substring(0,6)} ${collected}/${total}` : `SLOT ${slotIdx + 1}`}
                  </Typography>
                  <Box
                    data-foundation-index={slotIdx}
                    onClick={() => handleEmptySlotTap('foundation', slotIdx)}
                    className={fadingSlots[slotIdx] ? 'slot-complete' : ''}
                    sx={{
                      width: { xs: '68px', sm: '80px', md: '90px' },
                      height: { xs: '96px', sm: '112px', md: '126px' },
                      borderRadius: '8px',
                      border: isEmpty ? '2px dashed rgba(255, 255, 255, 0.15)' : 'none',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isEmpty && selectedCardInfo ? 'pointer' : 'default',
                      transition: 'background-color 0.2s',
                      boxSizing: 'border-box',
                      backgroundColor: isEmpty && selectedCardInfo && selectedCardInfo.card.isTitle ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    }}
                  >
                    <GlitterEffect 
                      active={glitteringSlots[slotIdx]} 
                      color={titleCard ? getCategoryColor(titleCard.categoryTitle) : '#ffd700'} 
                    />
                    {!isEmpty && (
                      <SolitaireCard
                        card={topCard}
                        selected={
                          selectedCardInfo &&
                          selectedCardInfo.type === 'foundation' &&
                          selectedCardInfo.index === slotIdx
                        }
                        onTap={() => handleCardTap({
                          type: 'foundation',
                          index: slotIdx,
                          cardIndex: slot.length - 1,
                          card: topCard
                        })}
                        dragHandlers={{
                          onPointerDown: (e) => handlePointerDown(e, {
                            type: 'foundation',
                            index: slotIdx,
                            cardIndex: slot.length - 1
                          })
                        }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Play Area (Tableau) */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            gap: { xs: 1.5, sm: 3 },
            mt: 2,
            minWidth: '600px',
            flexGrow: 1
          }}
        >
          {board.tableau.map((column, colIdx) => {
            const isEmpty = column.length === 0;
            // Height calculation based on stack length to prevent overflow/cutting off
            const stackHeight = isEmpty 
              ? '130px' 
              : `calc(130px + ${(column.length - 1) * 28}px)`;

            return (
              <Box
                key={colIdx}
                data-tableau-index={colIdx}
                onClick={(e) => {
                  // Only trigger empty column tap if clicking empty column backing itself
                  if (e.target === e.currentTarget) {
                    handleEmptySlotTap('tableau', colIdx);
                  }
                }}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minHeight: '400px',
                  borderRadius: '12px',
                  border: isEmpty ? '2.5px dashed rgba(255, 255, 255, 0.08)' : '1px solid rgba(255, 255, 255, 0.02)',
                  background: isEmpty ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'background-color 0.2s',
                  padding: '8px 4px',
                  boxSizing: 'border-box',
                  cursor: isEmpty && selectedCardInfo ? 'pointer' : 'default',
                  position: 'relative'
                }}
              >
                {isEmpty ? (
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.15)', mt: 4, fontWeight: 'bold' }}>
                    EMPTY
                  </Typography>
                ) : (
                  <Box sx={{ position: 'relative', width: '100%', height: stackHeight }}>
                    {column.map((card, cardIdx) => {
                      const isDraggedInActiveDrag = activeDrag && 
                        activeDrag.type === 'tableau' && 
                        activeDrag.index === colIdx && 
                        cardIdx >= activeDrag.cardIndex;

                      return (
                        <SolitaireCard
                          key={card.id}
                          card={card}
                          index={cardIdx}
                          isStacked={true}
                          style={{
                            opacity: isDraggedInActiveDrag ? 0.25 : 1,
                            visibility: isDraggedInActiveDrag && activeDrag.isDragging ? 'hidden' : 'visible'
                          }}
                          selected={
                            selectedCardInfo &&
                            selectedCardInfo.type === 'tableau' &&
                            selectedCardInfo.index === colIdx &&
                            selectedCardInfo.cardIndex === cardIdx
                          }
                          onTap={(e) => {
                            e.stopPropagation();
                            if (card.faceUp) {
                              handleCardTap({
                                type: 'tableau',
                                index: colIdx,
                                cardIndex: cardIdx,
                                card
                              });
                            }
                          }}
                          dragHandlers={{
                            onPointerDown: (e) => handlePointerDown(e, {
                              type: 'tableau',
                              index: colIdx,
                              cardIndex: cardIdx
                            })
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Container>

      {/* Dragging floating elements portal */}
      {activeDrag && activeDrag.isDragging && (
        <Box
          ref={dragVisualRef}
          sx={{
            position: 'fixed',
            left: activeDrag.currentX - activeDrag.offsetX,
            top: activeDrag.currentY - activeDrag.offsetY,
            pointerEvents: 'none',
            zIndex: 1000,
            transform: 'rotate(2deg) scale(1.02)',
            transition: 'transform 0.1s',
            filter: 'drop-shadow(0 15px 15px rgba(0, 0, 0, 0.6))',
            width: { xs: '68px', sm: '80px', md: '90px' }
          }}
        >
          {activeDrag.cards.map((c, i) => (
            <SolitaireCard
              key={c.id}
              card={c}
              index={i}
              isStacked={true}
            />
          ))}
        </Box>
      )}

      {/* Win Game / Game Over modal */}
      <Dialog
        open={gameState === 'won'}
        PaperProps={{
          sx: {
            backgroundColor: '#090714',
            color: '#fff',
            border: '2px solid #a855f7',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.6)',
            borderRadius: 4,
            textAlign: 'center',
            p: 3,
            maxWidth: 400
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: '900', fontSize: '2rem', color: '#fbbf24' }}>
          Game Over
        </DialogTitle>
        <DialogContent>
          <EmojiEventsIcon sx={{ fontSize: '5rem', color: '#fbbf24', my: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
            YOU WIN!
          </Typography>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', mb: 2 }}>
            Congratulations, you successfully grouped and cleared all cards!
          </DialogContentText>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '1.5rem' }}>
            Final Score: {board ? board.score : 0}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            variant="contained"
            onClick={handleStartGame}
            sx={{
              background: 'linear-gradient(45deg, #a855f7, #f43f5e)',
              fontWeight: 'bold',
              px: 4,
              py: 1.2,
              borderRadius: 2,
              fontSize: '1rem',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)',
              '&:hover': {
                background: 'linear-gradient(45deg, #a855f7, #f43f5e)',
                transform: 'scale(1.03)'
              }
            }}
          >
            Play Again
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
