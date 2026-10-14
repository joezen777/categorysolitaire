import { Box } from '@mui/material';
import { getMovableGroup } from '../game/rules.js';
import { Card, Slot } from './Card.jsx';
import { DraggableCard } from './DraggableCard.jsx';

const countSx = {
  position: 'absolute',
  right: 2,
  bottom: 2,
  px: '5px',
  borderRadius: '8px',
  bgcolor: 'rgba(0,0,0,0.75)',
  color: '#fff',
  fontSize: 12,
  lineHeight: '16px',
};

export function StockWaste({ state, ctl }) {
  const wasteTop = state.waste[state.waste.length - 1];
  const wasteSource = { zone: 'waste' };
  const card = wasteTop ? state.deck.cards[wasteTop] : null;
  const selected = ctl.selected?.zone === 'waste';
  const dragging = ctl.dragging?.zone === 'waste';

  return (
    <Box
      component="section"
      aria-label="Source and draft piles"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, var(--card-w))', gap: 'var(--gap)' }}
    >
      <Box sx={{ position: 'relative' }}>
        {state.stock.length > 0 ? (
          <>
            <Card
              faceUp={false}
              interactive
              aria-label={`Draw a card. ${state.stock.length} left in source pile`}
              onClick={ctl.tapStock}
            />
            <Box component="span" aria-hidden="true" sx={countSx}>
              {state.stock.length}
            </Box>
          </>
        ) : (
          <Slot
            label={
              state.waste.length > 0
                ? 'Source pile empty. Flip the draft pile back over'
                : 'Source pile empty'
            }
            onClick={state.waste.length > 0 ? ctl.tapStock : undefined}
            sx={{ fontSize: 'calc(var(--card-w) * 0.4)' }}
          >
            {state.waste.length > 0 ? '↻' : ''}
          </Slot>
        )}
      </Box>
      <Box sx={{ position: 'relative' }}>
        {card ? (
          <>
            <DraggableCard
              dragId="waste"
              source={wasteSource}
              draggable={Boolean(getMovableGroup(state, wasteSource))}
              card={card}
              categoryTotal={state.deck.categories[card.category].total}
              selected={selected}
              ghost={dragging}
              onClick={() => ctl.tapCard(wasteSource)}
            />
            <Box component="span" aria-hidden="true" sx={countSx}>
              {state.waste.length}
            </Box>
          </>
        ) : (
          <Slot label="Draft pile empty" />
        )}
      </Box>
    </Box>
  );
}
