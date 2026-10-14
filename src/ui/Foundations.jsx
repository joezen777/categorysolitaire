import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mui/material';
import { POINTS_PER_CATEGORY } from '../game/config.js';
import { Card, Slot } from './Card.jsx';
import { Glitter } from './Glitter.jsx';

const LEGAL_SX = {
  outline: '3px dashed #00e5ff',
  outlineOffset: '1px',
  animation: 'cs-pulse 1.2s ease-in-out infinite',
};

function FoundationSlot({ state, slot, ctl }) {
  const target = { zone: 'foundation', slot };
  const { setNodeRef } = useDroppable({ id: `foundation:${slot}`, data: { target } });
  const entry = state.foundations[slot];
  const legal = ctl.targets.foundation.includes(slot);
  const shaking = ctl.rejected?.key === `foundation:${slot}`;

  let counter = ' ';
  let top = null;
  let category = null;
  if (entry) {
    top = state.deck.cards[entry.pile[entry.pile.length - 1]];
    category = state.deck.categories[state.deck.cards[entry.pile[0]].category];
    const collected = entry.pile.length - 1;
    counter = entry.clearing
      ? `+${POINTS_PER_CATEGORY}!`
      : `${category.name} ${collected}/${category.total}`;
  }

  return (
    <Box ref={setNodeRef} sx={{ width: 'var(--card-w)' }}>
      <Box
        sx={{
          height: 18,
          fontSize: 'clamp(9px, calc(var(--card-w) * 0.15), 13px)',
          fontWeight: 700,
          lineHeight: '18px',
          textAlign: 'center',
          color: entry?.clearing ? '#ffd54f' : '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={entry ? `${category.name} ${entry.pile.length - 1}/${category.total}` : undefined}
      >
        {counter}
      </Box>
      <Box sx={{ position: 'relative' }}>
        {entry ? (
          <>
            <Card
              card={top}
              categoryTotal={category.total}
              interactive
              aria-label={`Foundation slot ${slot + 1}: ${category.name}, ${entry.pile.length - 1} of ${category.total} collected${
                entry.clearing ? ', complete' : ''
              }`}
              onClick={() => ctl.tapTarget(target)}
              sx={{
                ...(legal ? LEGAL_SX : null),
                ...(shaking ? { animation: 'cs-shake 0.4s', outline: '3px solid #ff5252' } : null),
                ...(entry.clearing ? { animation: 'cs-fade 1.3s forwards', pointerEvents: 'none' } : null),
              }}
            />
            {entry.clearing && <Glitter />}
          </>
        ) : (
          <Slot
            label={`Empty foundation slot ${slot + 1}`}
            legal={legal}
            shake={shaking}
            onClick={() => ctl.tapTarget(target)}
          >
            {slot + 1}
          </Slot>
        )}
      </Box>
    </Box>
  );
}

export function Foundations({ state, ctl }) {
  return (
    <Box
      component="section"
      aria-label="Foundations"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, var(--card-w))', gap: 'var(--gap)' }}
    >
      {state.foundations.map((_, slot) => (
        <FoundationSlot key={slot} state={state} slot={slot} ctl={ctl} />
      ))}
    </Box>
  );
}
