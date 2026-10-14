import { useDraggable } from '@dnd-kit/core';
import ButtonBase from '@mui/material/ButtonBase';
import type { Card } from '../deck';
import type { MoveSource } from '../game/engine';
import { CardView, describeCard } from './CardView';
import { palette } from './theme';

export interface DragData {
  source: MoveSource;
}

interface PlayableCardProps {
  card: Card;
  source: MoveSource;
  itemCount: number;
  canDrag: boolean;
  selected: boolean;
  shake: boolean;
  dimmed: boolean;
  /** Extra context for the accessible name, e.g. "column 2". */
  locationLabel: string;
  onTap: () => void;
}

/** A face-up card that can be tapped/clicked/keyboard-activated or dragged. */
export function PlayableCard({ card, source, itemCount, canDrag, selected, shake, dimmed, locationLabel, onTap }: PlayableCardProps) {
  const { setNodeRef, listeners, attributes } = useDraggable({
    id: `card:${card.id}`,
    data: { source } satisfies DragData,
    disabled: !canDrag,
  });

  return (
    <ButtonBase
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      aria-pressed={selected}
      aria-label={`${describeCard(card, itemCount)}, ${locationLabel}${selected ? ', selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      disableRipple
      sx={{
        display: 'block',
        borderRadius: '8px',
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        cursor: canDrag ? 'grab' : 'pointer',
        '&.Mui-focusVisible, &:focus-visible': {
          outline: `3px solid ${palette.titleText}`,
          outlineOffset: '2px',
          boxShadow: `0 0 0 6px ${palette.feltDark}`,
        },
      }}
    >
      <CardView card={card} faceUp itemCount={itemCount} selected={selected} shake={shake} dimmed={dimmed} />
    </ButtonBase>
  );
}
