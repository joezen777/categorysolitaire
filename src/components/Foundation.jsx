import { useDroppable } from '@dnd-kit/core';
import PlayingCard from './PlayingCard';

const SPARKLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53 + 11) % 100}%`,
  delay: `${(i % 7) * 0.08}s`,
}));

function FoundationSlot({ index, slot, onClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { to: { zone: 'foundation', slot: index } },
  });
  const topCard = slot ? slot.items[slot.items.length - 1] || slot.title : null;

  return (
    <div className="foundation__cell">
      <div className="foundation__counter">
        {slot && (
          <>
            <span className="foundation__title">{slot.title.label}</span>
            <span className="foundation__count">
              {slot.items.length}/{slot.title.total}
            </span>
          </>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`slot foundation__slot${isOver ? ' slot--over' : ''}`}
        onClick={onClick}
        role="button"
        aria-label={slot ? `Foundation ${slot.title.label}` : `Empty foundation slot ${index + 1}`}
      >
        {topCard && (
          <PlayingCard card={topCard} className={slot.completing ? 'card--glitter' : ''} />
        )}
        {slot?.completing && (
          <div className="glitter" aria-hidden>
            {SPARKLES.map((s, i) => (
              <span key={i} className="glitter__spark" style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
            ))}
            <span className="glitter__points">+100</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Foundation({ slots, onSlotClick }) {
  return (
    <div className="foundation">
      {slots.map((slot, i) => (
        <FoundationSlot key={i} index={i} slot={slot} onClick={() => onSlotClick(i)} />
      ))}
    </div>
  );
}
