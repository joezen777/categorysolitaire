import React from 'react';
import { GameCard } from '../../types/game';
import { Box, styled } from '@mui/material';
import DraggableCard from '../DraggableCard/DraggableCard';

interface DraftPileProps {
  cards: GameCard[];
  onCardClick?: (card: GameCard, index: number) => void;
  disabled?: boolean;
}

const PileContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '80px',
  height: '112px',
}));

const DraftPile: React.FC<DraftPileProps> = ({
  cards,
  onCardClick,
  disabled = false,
}) => {
  if (cards.length === 0) {
    return (
      <PileContainer>
        <Box
          sx={{
            width: '80px',
            height: '112px',
            border: '2px dashed #ccc',
            borderRadius: '8px',
            backgroundColor: '#fafafa',
          }}
        />
      </PileContainer>
    );
  }

  const topCard = cards[cards.length - 1];

  return (
    <PileContainer>
      {/* Stack effect for cards beneath */}
      {cards.length > 1 && (
        <>
          {cards.length > 2 && (
            <Box
              sx={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                width: '80px',
                height: '112px',
                zIndex: 0,
              }}
            >
              <Card
                card={{
                  ...cards[cards.length - 3],
                  faceUp: 'up',
                }}
                isStacked
              />
            </Box>
          )}
          <Box
            sx={{
              position: 'absolute',
              top: '-3px',
              left: '-3px',
              width: '80px',
              height: '112px',
              zIndex: 1,
            }}
          >
            <Card
              card={{
                ...cards[cards.length - 2],
                faceUp: 'up',
              }}
              isStacked
            />
          </Box>
        </>
      )}
      {/* Top card */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '80px',
          height: '112px',
          zIndex: 2,
        }}
      >
        <DraggableCard
          card={{
            ...topCard,
            faceUp: 'up',
          }}
          id={`draft-${topCard.id}`}
          source="draft"
          sourceIndex={cards.length - 1}
          onClick={() => !disabled && onCardClick?.(topCard, cards.length - 1)}
        />
      </Box>
    </PileContainer>
  );
};

export default DraftPile;