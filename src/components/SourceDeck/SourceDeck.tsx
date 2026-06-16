import React from 'react';
import { GameCard } from '../../types/game';
import { Box, Paper, styled } from '@mui/material';
import Card from '../Card/Card';

interface SourceDeckProps {
  cards: GameCard[];
  onDrawCard: () => void;
  onResetDraft: () => void;
  draftPileEmpty: boolean;
}

const DeckContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '80px',
  height: '112px',
  cursor: 'pointer',
}));

const EmptySlot = styled(Box)(({ theme }) => ({
  width: '80px',
  height: '112px',
  border: '2px dashed #ccc',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backgroundColor: '#f5f5f5',
  transition: 'all 0.2s',
  '&:hover': {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
}));

const CardStack = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '80px',
  height: '112px',
}));

const SourceDeck: React.FC<SourceDeckProps> = ({
  cards,
  onDrawCard,
  onResetDraft,
  draftPileEmpty,
}) => {
  const hasCards = cards.length > 0;

  const handleClick = () => {
    if (hasCards) {
      onDrawCard();
    } else if (draftPileEmpty) {
      onResetDraft();
    }
  };

  if (hasCards) {
    return (
      <DeckContainer onClick={handleClick}>
        {/* Stack effect - show a few cards behind */}
        {cards.length > 1 && (
          <>
            <CardStack sx={{ top: '-4px', left: '-4px', zIndex: 1 }}>
              <Box
                sx={{
                  width: '80px',
                  height: '112px',
                  background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #1a237e 100%)',
                  borderRadius: '8px',
                  border: '2px solid #0d47a1',
                }}
              />
            </CardStack>
            {cards.length > 2 && (
              <CardStack sx={{ top: '-8px', left: '-8px', zIndex: 0 }}>
                <Box
                  sx={{
                    width: '80px',
                    height: '112px',
                    background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #1a237e 100%)',
                    borderRadius: '8px',
                    border: '2px solid #0d47a1',
                  }}
                />
              </CardStack>
            )}
          </>
        )}
        {/* Top card */}
        <CardStack sx={{ zIndex: 2 }}>
          <Card
            card={{
              ...cards[cards.length - 1],
              faceUp: 'down',
            }}
          />
        </CardStack>
      </DeckContainer>
    );
  }

  return (
    <EmptySlot onClick={handleClick}>
      <Box
        sx={{
          textAlign: 'center',
          color: '#666',
          fontSize: '12px',
        }}
      >
        {draftPileEmpty ? 'Reset' : 'Empty'}
      </Box>
    </EmptySlot>
  );
};

export default SourceDeck;