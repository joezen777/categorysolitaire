import React from 'react';
import { TableauColumn as TableauColumnType, GameCard } from '../../types/game';
import { Box, styled } from '@mui/material';
import DraggableCard from '../DraggableCard/DraggableCard';
import Card from '../Card/Card';
import DropZone from '../DropZone/DropZone';

interface TableauProps {
  column: TableauColumnType;
  index: number;
  onCardClick?: (card: GameCard, cardIndex: number, columnIndex: number) => void;
  onCardDrop?: (cards: GameCard[], targetColumnIndex: number) => void;
  isDraggingOver?: boolean;
  selectedCards?: GameCard[];
  onDropZoneClick?: (columnIndex: number) => void;
}

const ColumnContainer = styled(Box)<{ isDraggingOver: boolean }>(({ isDraggingOver, theme }) => ({
  position: 'relative',
  width: '80px',
  minHeight: '400px',
  maxHeight: '600px',
  overflowY: 'auto',
  overflowX: 'hidden',
  border: isDraggingOver ? '3px solid #2196f3' : '2px dashed transparent',
  borderRadius: '8px',
  padding: '4px',
  transition: 'all 0.2s',
  backgroundColor: isDraggingOver ? '#e3f2fd' : 'transparent',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '3px',
    '&:hover': {
      background: '#555',
    },
  },
}));

const CardWrapper = styled(Box)<{ index: number; isSelected: boolean }>(({ index, isSelected, theme }) => ({
  position: 'absolute',
  left: '0',
  width: '80px',
  top: `${index * 20}px`, // Stack cards with 20px overlap
  zIndex: index,
  cursor: 'pointer',
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
  ...(isSelected && {
    transform: 'translateY(-5px)',
  }),
}));

const EmptyColumnPlaceholder = styled(Box)(({ theme }) => ({
  width: '80px',
  height: '112px',
  border: '2px dashed #ccc',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#999',
  fontSize: '12px',
  marginTop: '20px',
}));

const Tableau: React.FC<TableauProps> = ({
  column,
  index,
  onCardClick,
  onCardDrop,
  isDraggingOver = false,
  selectedCards = [],
  onDropZoneClick,
}) => {
  const hasCards = column.cards.length > 0;

  const handleCardClick = (card: GameCard, cardIndex: number) => {
    if (card.faceUp === 'up') {
      onCardClick?.(card, cardIndex, index);
    }
  };

  const handleColumnClick = () => {
    onDropZoneClick?.(index);
  };

  // Calculate total height needed for the column
  const columnHeight = hasCards ? (column.cards.length - 1) * 20 + 112 : 0;

  const isCardSelected = (card: GameCard) => {
    return selectedCards.some(c => c.id === card.id);
  };

  return (
    <DropZone
      id={`tableau-${index}`}
      zone="tableau"
      index={index}
      disabled={false}
    >
      <ColumnContainer
        isDraggingOver={isDraggingOver}
        sx={{ height: `${Math.max(columnHeight, 400)}px` }}
        onClick={handleColumnClick}
      >
        {hasCards ? (
          column.cards.map((card, cardIndex) => (
            <CardWrapper
              key={card.id}
              index={cardIndex}
              isSelected={isCardSelected(card)}
            >
              {card.faceUp === 'up' ? (
                <DraggableCard
                  card={card}
                  id={`tableau-${index}-${card.id}`}
                  source="tableau"
                  sourceIndex={index}
                  onClick={() => handleCardClick(card, cardIndex)}
                  isStacked={cardIndex < column.cards.length - 1}
                />
              ) : (
                <Card
                  card={card}
                  onClick={() => handleCardClick(card, cardIndex)}
                  isStacked={cardIndex < column.cards.length - 1}
                />
              )}
            </CardWrapper>
          ))
        ) : (
          <EmptyColumnPlaceholder>Empty</EmptyColumnPlaceholder>
        )}
      </ColumnContainer>
    </DropZone>
  );
};

export default Tableau;