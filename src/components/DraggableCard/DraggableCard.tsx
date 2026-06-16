import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GameCard } from '../../types/game';
import Card from '../Card/Card';

interface DraggableCardProps {
  card: GameCard;
  id: string;
  source: string;
  sourceIndex: number;
  onClick?: () => void;
  isStacked?: boolean;
}

export const DraggableCard: React.FC<DraggableCardProps> = ({
  card,
  id,
  source,
  sourceIndex,
  onClick,
  isStacked = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      card,
      source,
      sourceIndex,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        card={card}
        onClick={onClick}
        isDragging={isDragging}
        isStacked={isStacked}
      />
    </div>
  );
};

export default DraggableCard;