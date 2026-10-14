import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Box } from '@mui/material';
import { getMovableGroup } from '../game/rules.js';
import { Card } from './Card.jsx';
import { Foundations } from './Foundations.jsx';
import { StockWaste } from './StockWaste.jsx';
import { Tableau } from './Tableau.jsx';

function collisionDetection(args) {
  const within = pointerWithin(args);
  return within.length > 0 ? within : rectIntersection(args);
}

function DragPreview({ state, source }) {
  const ids = getMovableGroup(state, source) ?? [];
  return (
    <Box sx={{ position: 'relative', width: 'var(--card-w)', height: 'var(--card-h)', cursor: 'grabbing' }}>
      {ids.map((id, i) => {
        const card = state.deck.cards[id];
        return (
          <Card
            key={id}
            card={card}
            categoryTotal={state.deck.categories[card.category].total}
            peek={i < ids.length - 1}
            selected
            style={{ position: 'absolute', left: 0, top: `calc(${i} * var(--peek-up))` }}
          />
        );
      })}
    </Box>
  );
}

export function Board({ state, ctl }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const sameColumn = (source, target) =>
    source.zone === 'tableau' && target?.zone === 'tableau' && source.col === target.col;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={({ active }) => ctl.onDragStart(active.data.current.source)}
      onDragCancel={ctl.onDragCancel}
      onDragEnd={({ active, over }) => {
        const source = active.data.current.source;
        const target = over?.data.current?.target ?? null;
        // Dropping back where it came from is a quiet no-op, not an error.
        ctl.onDragEnd(source, sameColumn(source, target) ? null : target);
      }}
    >
      <Box
        sx={{
          width: 'var(--board-w)',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          pb: '40px',
        }}
      >
        <StockWaste state={state} ctl={ctl} />
        <Foundations state={state} ctl={ctl} />
        <Tableau state={state} ctl={ctl} />
      </Box>
      <DragOverlay dropAnimation={ctl.dropAccepted.current ? null : undefined}>
        {ctl.dragging ? <DragPreview state={state} source={ctl.dragging} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
