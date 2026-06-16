import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { CardFace, EmptySlot, getCategoryColor } from './Card';
import DroppableZone from './DroppableZone';
import { useGame } from '../context/GameContext';
import { useSelection } from '../context/SelectionContext';

export default function Foundation() {
  const { foundation, moveCard } = useGame();
  const { selected, clearSelection } = useSelection();
  const [glitterSlot, setGlitterSlot] = useState(null);

  // Watch for completed categories (slot goes from having cards to null)
  const [prevFoundation, setPrevFoundation] = useState(foundation);
  useEffect(() => {
    for (let i = 0; i < 5; i++) {
      if (prevFoundation[i] !== null && foundation[i] === null) {
        setGlitterSlot(i);
        setTimeout(() => setGlitterSlot(null), 1500);
      }
    }
    setPrevFoundation(foundation);
  }, [foundation]);

  const handleSlotClick = (slotIndex) => {
    if (!selected) return;
    moveCard(selected, { type: 'foundation', slotIndex });
    clearSelection();
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
      {foundation.map((slot, index) => (
        <Box key={index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Counter label */}
          {slot && (
            <Typography
              sx={{
                fontSize: '9px',
                color: '#fff',
                backgroundColor: getCategoryColor(slot.categoryTitle),
                borderRadius: '4px',
                px: 0.5,
                py: 0.2,
                mb: 0.3,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {slot.categoryTitle} {slot.count}/{slot.total}
            </Typography>
          )}
          {!slot && <Box sx={{ height: '18px', mb: 0.3 }} />}

          {/* Droppable Slot */}
          <DroppableZone
            id={`foundation-${index}`}
            data={{ type: 'foundation', slotIndex: index }}
          >
            <Box
              sx={{
                position: 'relative',
                animation: glitterSlot === index ? 'glitter 1.5s ease-out' : 'none',
                '@keyframes glitter': {
                  '0%': { boxShadow: '0 0 20px gold', transform: 'scale(1.05)' },
                  '50%': { boxShadow: '0 0 40px gold, 0 0 60px yellow', transform: 'scale(1.1)' },
                  '100%': { boxShadow: 'none', transform: 'scale(1)', opacity: 0 },
                },
              }}
            >
              {slot ? (
                <Box onClick={() => handleSlotClick(index)} sx={{ cursor: 'pointer' }}>
                  {slot.cards.length > 0 && (
                    <CardFace
                      card={slot.cards[slot.cards.length - 1]}
                      onClick={() => handleSlotClick(index)}
                    />
                  )}
                </Box>
              ) : (
                <EmptySlot
                  onClick={() => handleSlotClick(index)}
                  label="Foundation"
                  selected={!!selected}
                />
              )}
            </Box>
          </DroppableZone>
        </Box>
      ))}
    </Box>
  );
}
