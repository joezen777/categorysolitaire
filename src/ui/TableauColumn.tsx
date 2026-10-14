import { useDroppable } from '@dnd-kit/core';
import Box from '@mui/material/Box';
import type { DeckModel } from '../deck';
import type { MoveSource, TableauCard } from '../game/engine';
import { CardView } from './CardView';
import { stackOffsets, useMetrics } from './metrics';
import { PlayableCard } from './PlayableCard';
import { SlotButton } from './SlotButton';
import { palette } from './theme';

export interface CardFlags {
  isSelected: (cardId: string) => boolean;
  isShaking: (cardId: string) => boolean;
  isDragging: (cardId: string) => boolean;
  canDrag: (source: MoveSource) => boolean;
}

interface TableauColumnProps {
  index: number;
  cards: TableauCard[];
  deck: DeckModel;
  legal: boolean;
  flags: CardFlags;
  onCardTap: (source: MoveSource) => void;
  onColumnTap: () => void;
}

export function TableauColumn({ index, cards, deck, legal, flags, onCardTap, onColumnTap }: TableauColumnProps) {
  const m = useMetrics();
  const { setNodeRef, isOver } = useDroppable({ id: `tableau:${index}`, data: { target: { kind: 'tableau', column: index } } });
  const tops = stackOffsets(cards.map((c) => c.faceUp), m);
  const height = (tops[tops.length - 1] ?? 0) + m.cardH;
  const label = `column ${index + 1}`;

  return (
    <Box
      ref={setNodeRef}
      role="group"
      aria-label={`Column ${index + 1}, ${cards.length} cards${legal ? ', valid destination' : ''}`}
      // Pointer convenience: tapping face-down cards or the column body targets the column.
      // Keyboard users target the column through its bottom card or empty slot button.
      onClick={onColumnTap}
      sx={{
        position: 'relative',
        width: m.cardW,
        height,
        minHeight: m.cardH,
        borderRadius: '8px',
        outline: legal ? `3px dashed ${palette.legal}` : undefined,
        outlineOffset: '3px',
        bgcolor: isOver && legal ? 'rgba(124,242,164,0.18)' : undefined,
      }}
    >
      {cards.length === 0 && (
        <SlotButton label={`Empty ${label}${legal ? ', valid destination' : ''}`} onClick={onColumnTap}>
          Empty
        </SlotButton>
      )}
      {cards.map((tc, i) => {
        const card = deck.byId[tc.id];
        const source: MoveSource = { kind: 'tableau', column: index, cardId: tc.id };
        return (
          <Box key={tc.id} sx={{ position: 'absolute', top: tops[i], left: 0, zIndex: i + 1 }}>
            {tc.faceUp ? (
              <PlayableCard
                card={card}
                source={source}
                itemCount={deck.categories[card.category].itemCount}
                canDrag={flags.canDrag(source)}
                selected={flags.isSelected(tc.id)}
                shake={flags.isShaking(tc.id)}
                dimmed={flags.isDragging(tc.id)}
                locationLabel={`${label}${i === cards.length - 1 ? ', bottom card' : ''}`}
                onTap={() => onCardTap(source)}
              />
            ) : (
              <CardView card={null} faceUp={false} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}
