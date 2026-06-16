import React from 'react';
import { FoundationSlot as FoundationSlotType, GameCard } from '../../types/game';
import { Box, styled, Typography, Chip } from '@mui/material';
import Card from '../Card/Card';
import DropZone from '../DropZone/DropZone';

interface FoundationProps {
  slot: FoundationSlotType;
  index: number;
  expectedCount?: number;
  onCardDrop?: (card: GameCard, targetIndex: number) => void;
  onSlotClick?: (index: number) => void;
  isDraggingOver?: boolean;
}

const SlotContainer = styled(Box)<{ isDraggingOver: boolean }>(({ isDraggingOver, theme }) => ({
  position: 'relative',
  width: '100px',
  height: '140px',
  border: isDraggingOver ? '3px solid #2196f3' : '2px dashed #ccc',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  backgroundColor: isDraggingOver ? '#e3f2fd' : '#fafafa',
  '&:hover': {
    backgroundColor: '#f5f5f5',
    borderColor: '#999',
  },
}));

const CounterBox = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
  padding: '2px 4px',
  borderRadius: '4px',
  backgroundColor: 'rgba(33, 150, 243, 0.1)',
}));

const CategoryLabel = styled(Typography)(({ theme }) => ({
  fontSize: '10px',
  fontWeight: 600,
  color: '#1976d2',
  textTransform: 'uppercase',
  flex: 1,
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const CounterChip = styled(Chip)(({ theme }) => ({
  fontSize: '10px',
  height: '20px',
  minWidth: '40px',
  fontWeight: 600,
}));

const CardsContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '80px',
  height: '112px',
}));

const CompletionOverlay = styled(Box)<{ isComplete: boolean }>(({ isComplete, theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(76, 175, 80, 0.3)',
  opacity: isComplete ? 1 : 0,
  transition: 'opacity 0.3s',
  pointerEvents: 'none',
  zIndex: 10,
  animation: isComplete ? 'glitter 1s ease-out' : 'none',
  '@keyframes glitter': {
    '0%': { opacity: 0.3, backgroundColor: 'rgba(76, 175, 80, 0.3)' },
    '25%': { opacity: 1, backgroundColor: 'rgba(76, 175, 80, 0.8)' },
    '50%': { opacity: 0.5, backgroundColor: 'rgba(76, 175, 80, 0.5)' },
    '75%': { opacity: 1, backgroundColor: 'rgba(76, 175, 80, 0.8)' },
    '100%': { opacity: 0, backgroundColor: 'rgba(76, 175, 80, 0)' },
  },
}));

const Foundation: React.FC<FoundationProps> = ({
  slot,
  index,
  expectedCount = 0,
  onCardDrop,
  onSlotClick,
  isDraggingOver = false,
}) => {
  const hasCards = slot.cards.length > 0;
  const itemCount = slot.cards.filter(c => !c.isTitleCard).length;
  const titleCard = slot.cards.find(c => c.isTitleCard);
  const isComplete = expectedCount > 0 && itemCount === expectedCount && slot.categoryTitle !== null;

  const handleSlotClick = () => {
    onSlotClick?.(index);
  };

  return (
    <DropZone
      id={`foundation-${index}`}
      zone="foundation"
      index={index}
      disabled={hasCards && isComplete}
    >
      <SlotContainer
        isDraggingOver={isDraggingOver}
        onClick={handleSlotClick}
      >
        {hasCards && titleCard && (
          <CounterBox>
            <CategoryLabel>{slot.categoryTitle}</CategoryLabel>
            <CounterChip
              label={`${itemCount}/${expectedCount}`}
              size="small"
              color={isComplete ? 'success' : 'primary'}
              variant={isComplete ? 'filled' : 'outlined'}
            />
          </CounterBox>
        )}
        
        <CardsContainer>
          {hasCards ? (
            <>
              {/* Show stacked effect for multiple cards */}
              {slot.cards.length > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '-4px',
                    left: '-4px',
                    width: '80px',
                    height: '112px',
                    zIndex: 0,
                  }}
                >
                  <Card
                    card={{
                      ...titleCard,
                      faceUp: 'up',
                    }}
                    isStacked
                  />
                </Box>
              )}
              {/* Top card */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '80px',
                  height: '112px',
                  zIndex: 1,
                }}
              >
                <Card
                  card={{
                    ...slot.cards[slot.cards.length - 1],
                    faceUp: 'up',
                  }}
                />
              </Box>
              {isComplete && <CompletionOverlay isComplete={true} />}
            </>
          ) : (
            <Box
              sx={{
                width: '80px',
                height: '112px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                fontSize: '12px',
              }}
            >
              Empty
            </Box>
          )}
        </CardsContainer>
      </SlotContainer>
    </DropZone>
  );
};

export default Foundation;