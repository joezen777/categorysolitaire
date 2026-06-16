import React from 'react';
import { GameCard, CardFace } from '../../types/game';
import { Card as MUICard, CardContent, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

interface CardProps {
  card: GameCard;
  onClick?: () => void;
  isDragging?: boolean;
  stackIndex?: number;
  isStacked?: boolean;
}

const StyledCard = styled(MUICard, {
  shouldForwardProp: (prop) => prop !== 'isDragging' && prop !== 'isStacked',
})<{ isDragging: boolean; isStacked: boolean }>(({ isDragging, isStacked }) => ({
  width: '80px',
  height: '112px',
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s',
  borderRadius: '8px',
  position: 'relative',
  backgroundColor: '#fff',
  ...(isDragging && {
    transform: 'scale(1.05)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
    zIndex: 1000,
  }),
  ...(isStacked && {
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  }),
}));

const CardBack = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #1a237e 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '2px solid #0d47a1',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    width: '60%',
    height: '80%',
    background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)',
    borderRadius: '4px',
  },
}));

const CardFront = styled(Box)<{ isTitleCard: boolean }>(({ isTitleCard, theme }) => ({
  width: '100%',
  height: '100%',
  background: isTitleCard 
    ? 'linear-gradient(135deg, #ffd700 0%, #ffed4a 50%, #ffd700 100%)'
    : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
  border: `2px solid ${isTitleCard ? '#ff8f00' : '#e0e0e0'}`,
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  position: 'relative',
}));

const CategoryBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '4px',
  left: '4px',
  backgroundColor: '#1976d2',
  color: 'white',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: 600,
}));

const CardText = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'isTitleCard',
})<{ isTitleCard: boolean }>(({ isTitleCard, theme }) => ({
  fontSize: isTitleCard ? '14px' : '12px',
  fontWeight: isTitleCard ? 700 : 500,
  color: isTitleCard ? '#000' : '#333',
  textAlign: 'center',
  lineHeight: 1.3,
  textTransform: isTitleCard ? 'uppercase' : 'capitalize',
  wordWrap: 'break-word',
  maxWidth: '100%',
}));

const StackedText = styled(Typography)(({ theme }) => ({
  fontSize: '8px',
  fontWeight: 600,
  color: '#666',
  textAlign: 'center',
  lineHeight: 1.2,
  textTransform: 'capitalize',
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}));

const Card: React.FC<CardProps> = ({
  card,
  onClick,
  isDragging = false,
  stackIndex = 0,
  isStacked = false,
}) => {
  const renderFaceDown = () => {
    return <CardBack />;
  };

  const renderFaceUp = (showStackedText: boolean = false) => {
    return (
      <CardFront isTitleCard={card.isTitleCard}>
        {!card.isTitleCard && (
          <CategoryBadge>{card.categoryTitle}</CategoryBadge>
        )}
        {showStackedText ? (
          <StackedText>{card.itemName}</StackedText>
        ) : (
          <CardText isTitleCard={card.isTitleCard}>
            {card.itemName}
            {card.isTitleCard && (
              <Box sx={{ fontSize: '10px', mt: 1, fontWeight: 400 }}>
                + Items
              </Box>
            )}
          </CardText>
        )}
      </CardFront>
    );
  };

  return (
    <StyledCard
      isDragging={isDragging}
      isStacked={isStacked}
      onClick={onClick}
    >
      <CardContent sx={{ p: 0, height: '100%' }}>
        {card.faceUp === 'down' ? renderFaceDown() : renderFaceUp(isStacked)}
      </CardContent>
    </StyledCard>
  );
};

export default Card;