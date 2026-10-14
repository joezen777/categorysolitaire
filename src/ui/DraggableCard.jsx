import { useDraggable } from '@dnd-kit/core';
import { Card } from './Card.jsx';

/** A face-up card that can be tapped or dragged; `source` describes what it picks up. */
export function DraggableCard({ dragId, source, draggable, sx, ...props }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: dragId,
    data: { source },
    disabled: !draggable,
  });
  return (
    <Card
      ref={setNodeRef}
      interactive
      {...attributes}
      {...listeners}
      {...props}
      sx={{ touchAction: draggable ? 'manipulation' : 'auto', ...sx }}
    />
  );
}
