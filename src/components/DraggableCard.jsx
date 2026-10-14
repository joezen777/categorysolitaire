import { useDraggable } from '@dnd-kit/core';
import PlayingCard from './PlayingCard';

// A face-up card that can be dragged (dnd-kit) and tapped (onClick).
export default function DraggableCard({ card, from, disabled, className = '', ...cardProps }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: card.id,
    data: { from },
    disabled,
  });
  return (
    <PlayingCard
      ref={setNodeRef}
      card={card}
      faceUp
      className={`${className} ${disabled ? '' : 'card--movable'}`.trim()}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      {...cardProps}
    />
  );
}
