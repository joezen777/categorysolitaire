import { useDroppable } from '@dnd-kit/core';
import PlayingCard from './PlayingCard';
import DraggableCard from './DraggableCard';

// Absolute `top` offset for a card given how many face-down / face-up cards sit above it.
export function stackOffset(down, up, extra = '0px') {
  return `calc(${down} * var(--off-down) + ${up} * var(--off-up) + ${extra})`;
}

function TableauColumn({ col, column, canPick, isDragging, isSelected, isShaking, onCardClick, onColumnClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${col}`,
    data: { to: { zone: 'tableau', col } },
  });

  let down = 0;
  let up = 0;
  const positioned = column.map((entry) => {
    const top = stackOffset(down, up);
    if (entry.faceUp) up++;
    else down++;
    return { entry, top };
  });
  const lastDown = column.length ? down - (column[column.length - 1].faceUp ? 0 : 1) : 0;
  const lastUp = column.length ? up - (column[column.length - 1].faceUp ? 1 : 0) : 0;
  const minHeight = column.length ? stackOffset(lastDown, lastUp, 'var(--card-h)') : 'var(--card-h)';

  return (
    <div
      ref={setNodeRef}
      className={`tableau__column${isOver ? ' tableau__column--over' : ''}`}
      style={{ minHeight }}
      onClick={() => onColumnClick(col)}
    >
      <div className="slot slot--empty tableau__base" />
      {positioned.map(({ entry, top }, index) => {
        const from = { zone: 'tableau', col, index };
        const style = { top, zIndex: index + 1 };
        if (!entry.faceUp) {
          return <PlayingCard key={entry.card.id} card={entry.card} faceUp={false} style={style} />;
        }
        return (
          <DraggableCard
            key={entry.card.id}
            card={entry.card}
            from={from}
            disabled={!canPick(from)}
            style={style}
            hidden={isDragging(from)}
            selected={isSelected(from)}
            shaking={isShaking(from)}
            onClick={(e) => {
              e.stopPropagation();
              onCardClick(from);
            }}
          />
        );
      })}
    </div>
  );
}

export default function Tableau({ columns, ...handlers }) {
  return (
    <div className="tableau">
      {columns.map((column, col) => (
        <TableauColumn key={col} col={col} column={column} {...handlers} />
      ))}
    </div>
  );
}
