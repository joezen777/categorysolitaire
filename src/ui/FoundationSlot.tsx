import { useDroppable } from '@dnd-kit/core';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { DeckModel } from '../deck';
import type { FoundationSlot as Slot } from '../game/engine';
import { CardView } from './CardView';
import { useMetrics } from './metrics';
import { SlotButton } from './SlotButton';
import { palette } from './theme';

export interface Burst {
  key: number;
  slot: number;
  category: string;
  topCardId: string;
}

interface FoundationSlotProps {
  index: number;
  slot: Slot;
  deck: DeckModel;
  legal: boolean;
  burst: Burst | null;
  onTap: () => void;
}

const SPARKLES = [
  { x: '10%', y: '15%', d: 0 },
  { x: '75%', y: '10%', d: 80 },
  { x: '45%', y: '45%', d: 160 },
  { x: '15%', y: '70%', d: 240 },
  { x: '80%', y: '65%', d: 120 },
  { x: '50%', y: '85%', d: 300 },
];

export function FoundationSlot({ index, slot, deck, legal, burst, onTap }: FoundationSlotProps) {
  const m = useMetrics();
  const { setNodeRef, isOver } = useDroppable({ id: `foundation:${index}`, data: { target: { kind: 'foundation', slot: index } } });
  const category = slot.category ? deck.categories[slot.category] : null;
  const collected = slot.cardIds.length - 1;
  const top = slot.cardIds.length ? deck.byId[slot.cardIds[slot.cardIds.length - 1]] : null;
  const legalText = legal ? ', valid destination' : '';

  return (
    <Box sx={{ width: m.cardW, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <Box
        aria-hidden
        sx={{
          height: m.labelFont * 2.6,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          textAlign: 'center',
          fontSize: m.labelFont,
          lineHeight: 1.2,
          color: '#fff',
          mb: '4px',
        }}
      >
        {category && (
          <>
            <Box sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{category.name}</Box>
            <Box sx={{ fontWeight: 800, color: palette.titleAccent }}>
              {collected}/{category.itemCount}
            </Box>
          </>
        )}
      </Box>
      <Box
        ref={setNodeRef}
        sx={{
          position: 'relative',
          borderRadius: '8px',
          outline: legal ? `3px dashed ${palette.legal}` : undefined,
          outlineOffset: '3px',
          bgcolor: isOver && legal ? 'rgba(124,242,164,0.18)' : undefined,
        }}
      >
        {top && category ? (
          <ButtonBase
            onClick={onTap}
            aria-label={`Category slot ${index + 1}: ${category.name}, ${collected} of ${category.itemCount} items collected${legalText}`}
            sx={{ display: 'block', borderRadius: '8px', '&.Mui-focusVisible': { outline: '3px solid #fff', outlineOffset: '2px' } }}
          >
            <CardView card={top} faceUp itemCount={category.itemCount} />
          </ButtonBase>
        ) : (
          <SlotButton label={`Empty category slot ${index + 1}${legalText}`} onClick={onTap}>
            Category slot
          </SlotButton>
        )}
        {burst && <CompletionBurst burst={burst} deck={deck} />}
      </Box>
    </Box>
  );
}

function CompletionBurst({ burst, deck }: { burst: Burst; deck: DeckModel }) {
  const card = deck.byId[burst.topCardId];
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        pointerEvents: 'none',
        animation: 'cs-glitter-out 1s ease-in forwards',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.6 },
      }}
    >
      <CardView card={card} faceUp itemCount={deck.categories[card.category].itemCount} />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '8px',
          background: 'linear-gradient(120deg, transparent 20%, rgba(255,236,150,0.7) 45%, transparent 70%)',
        }}
      />
      {SPARKLES.map((s, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            fontSize: 18,
            color: palette.titleAccent,
            textShadow: '0 0 6px #fff',
            opacity: 0,
            animation: `cs-sparkle 700ms ease-out ${s.d}ms forwards`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 1 },
          }}
        >
          ✦
        </Box>
      ))}
    </Box>
  );
}
