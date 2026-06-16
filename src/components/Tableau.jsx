import React from 'react';
import { Box } from '@mui/material';
import { CardFace, CardBack, EmptySlot, CARD_WIDTH, CARD_HEIGHT } from './Card';
import DraggableCard from './DraggableCard';
import DroppableZone from './DroppableZone';
import { useGame } from '../context/GameContext';
import { useSelection } from '../context/SelectionContext';
import { getMovableSequence } from '../utils/gameLogic';

const STACK_OFFSET_FACEDOWN = 18;
const STACK_OFFSET_FACEUP = 28;

export default function Tableau() {
  const { tableau, moveCard } = useGame();
  const { selected, select, clearSelection } = useSelection();

  const handleCardClick = (colIndex, cardIndex) => {
    const column = tableau[colIndex];
    const card = column[cardIndex];

    // Can't interact with face-down cards
    if (!card.faceUp) return;

    if (selected) {
      // If clicking on same card, deselect
      if (
        selected.type === 'tableau' &&
        selected.colIndex === colIndex &&
        selected.cardIndex === cardIndex
      ) {
        clearSelection();
        return;
      }

      // Try to move selected card(s) to this column
      moveCard(selected, { type: 'tableau', colIndex });
      clearSelection();
    } else {
      // Select this card (and all below it if valid sequence)
      const sequence = getMovableSequence(column, cardIndex);
      if (sequence) {
        select({ type: 'tableau', colIndex, cardIndex });
      }
    }
  };

  const handleEmptyColumnClick = (colIndex) => {
    if (selected) {
      moveCard(selected, { type: 'tableau', colIndex });
      clearSelection();
    }
  };

  const getColumnHeight = (column) => {
    if (column.length === 0) return CARD_HEIGHT;
    let height = CARD_HEIGHT;
    for (let i = 0; i < column.length - 1; i++) {
      height += column[i].faceUp ? STACK_OFFSET_FACEUP : STACK_OFFSET_FACEDOWN;
    }
    return height;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '300px',
        px: 0.5,
      }}
    >
      {tableau.map((column, colIndex) => {
        const colHeight = getColumnHeight(column);
        const isSelected = selected?.type === 'tableau' && selected.colIndex === colIndex;

        return (
          <DroppableZone
            key={`tableau-col-${colIndex}`}
            id={`tableau-col-${colIndex}`}
            data={{ type: 'tableau', colIndex }}
          >
            <Box
              sx={{
                position: 'relative',
                width: CARD_WIDTH,
                height: colHeight,
                minHeight: CARD_HEIGHT,
                flexShrink: 0,
              }}
            >
              {column.length === 0 ? (
                <EmptySlot
                  onClick={() => handleEmptyColumnClick(colIndex)}
                  label=""
                  selected={!!selected}
                />
              ) : (
                column.map((card, cardIndex) => {
                  const topOffset = column
                    .slice(0, cardIndex)
                    .reduce(
                      (sum, c) => sum + (c.faceUp ? STACK_OFFSET_FACEUP : STACK_OFFSET_FACEDOWN),
                      0
                    );
                  const isLastCard = cardIndex === column.length - 1;
                  const isCardSelected = isSelected && cardIndex >= selected.cardIndex;
                  const canDrag = card.faceUp && getMovableSequence(column, cardIndex) !== null;

                  if (!card.faceUp) {
                    return (
                      <Box
                        key={card.id}
                        sx={{ position: 'absolute', top: topOffset, left: 0 }}
                      >
                        <CardBack />
                      </Box>
                    );
                  }

                  return (
                    <Box
                      key={card.id}
                      sx={{ position: 'absolute', top: topOffset, left: 0, zIndex: cardIndex }}
                    >
                      <DraggableCard
                        id={`tableau-${colIndex}-${cardIndex}`}
                        data={{ type: 'tableau', colIndex, cardIndex }}
                        disabled={!canDrag}
                      >
                        <CardFace
                          card={card}
                          compact={!isLastCard}
                          onClick={() => handleCardClick(colIndex, cardIndex)}
                          selected={isCardSelected}
                        />
                      </DraggableCard>
                    </Box>
                  );
                })
              )}
            </Box>
          </DroppableZone>
        );
      })}
    </Box>
  );
}
