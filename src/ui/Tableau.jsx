import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mui/material';
import { getMovableGroup } from '../game/rules.js';
import { Card, Slot } from './Card.jsx';
import { DraggableCard } from './DraggableCard.jsx';

const LEGAL_SX = {
  outline: '3px dashed #00e5ff',
  outlineOffset: '1px',
  animation: 'cs-pulse 1.2s ease-in-out infinite',
};

function Column({ state, col, ctl }) {
  const cards = state.tableau[col];
  const target = { zone: 'tableau', col };
  const { setNodeRef } = useDroppable({ id: `tableau:${col}`, data: { target } });
  const legal = ctl.targets.tableau.includes(col);
  const shaking = ctl.rejected?.key === `tableau:${col}`;

  // Absolute offset = (face-down cards above) * peek-down + (face-up cards above) * peek-up.
  let down = 0;
  let up = 0;
  const placed = cards.map((entry, i) => {
    const top = `calc(${down} * var(--peek-down) + ${up} * var(--peek-up))`;
    if (entry.faceUp) up += 1;
    else down += 1;
    return { entry, i, top };
  });
  const height = `calc(var(--card-h) + ${down} * var(--peek-down) + ${Math.max(up - 1, 0)} * var(--peek-up))`;

  return (
    <Box
      ref={setNodeRef}
      role="group"
      aria-label={`Column ${col + 1}`}
      sx={{
        position: 'relative',
        width: 'var(--card-w)',
        height: cards.length === 0 ? 'var(--card-h)' : height,
        minHeight: 'var(--card-h)',
        animation: shaking ? 'cs-shake 0.4s' : undefined,
      }}
    >
      {cards.length === 0 && (
        <Slot
          label={`Empty column ${col + 1}`}
          legal={legal}
          shake={shaking}
          onClick={() => ctl.tapTarget(target)}
        >
          empty
        </Slot>
      )}
      {placed.map(({ entry, i, top }) => {
        const card = state.deck.cards[entry.id];
        const style = { position: 'absolute', left: 0, top };
        if (!entry.faceUp) return <Card key={entry.id} card={card} faceUp={false} style={style} />;

        const source = { zone: 'tableau', col, index: i };
        const isLast = i === cards.length - 1;
        const inSelection = ctl.selected?.zone === 'tableau' && ctl.selected.col === col && i >= ctl.selected.index;
        const inDrag = ctl.dragging?.zone === 'tableau' && ctl.dragging.col === col && i >= ctl.dragging.index;
        return (
          <DraggableCard
            key={entry.id}
            dragId={`tableau:${col}:${i}`}
            source={source}
            draggable={Boolean(getMovableGroup(state, source))}
            card={card}
            categoryTotal={state.deck.categories[card.category].total}
            peek={!isLast}
            selected={inSelection}
            ghost={inDrag}
            style={style}
            sx={isLast && legal ? LEGAL_SX : undefined}
            onClick={() => ctl.tapCard(source)}
          />
        );
      })}
    </Box>
  );
}

export function Tableau({ state, ctl }) {
  return (
    <Box
      component="section"
      aria-label="Play area"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, var(--card-w))', gap: 'var(--gap)', alignItems: 'start' }}
    >
      {state.tableau.map((_, col) => (
        <Column key={col} state={state} col={col} ctl={ctl} />
      ))}
    </Box>
  );
}
