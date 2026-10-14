import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import type { DeckModel } from '../deck';
import type { MoveSource } from '../game/engine';
import { CardView } from './CardView';
import { useMetrics } from './metrics';
import { PlayableCard } from './PlayableCard';
import { SlotButton } from './SlotButton';
import type { CardFlags } from './TableauColumn';

interface SourcePilesProps {
  stock: string[];
  waste: string[];
  deck: DeckModel;
  flags: CardFlags;
  onStockTap: () => void;
  onWasteTap: (source: MoveSource) => void;
}

function PileCaption({ children }: { children: string }) {
  const m = useMetrics();
  return (
    <Box sx={{ fontSize: m.labelFont, color: 'rgba(255,255,255,0.85)', textAlign: 'center', mt: '4px' }}>{children}</Box>
  );
}

/** The face-down source deck and face-up draft pile. */
export function SourcePiles({ stock, waste, deck, flags, onStockTap, onWasteTap }: SourcePilesProps) {
  const top = waste.length ? deck.byId[waste[waste.length - 1]] : null;
  const topSource: MoveSource | null = top ? { kind: 'waste', cardId: top.id } : null;

  return (
    <>
      <Box>
        {stock.length > 0 ? (
          <ButtonBase
            onClick={onStockTap}
            aria-label={`Source deck, ${stock.length} cards face down. Draw a card`}
            sx={{ display: 'block', borderRadius: '8px', '&.Mui-focusVisible': { outline: '3px solid #fff', outlineOffset: '2px' } }}
          >
            <CardView card={null} faceUp={false} />
          </ButtonBase>
        ) : (
          <SlotButton
            label={waste.length ? 'Source deck empty. Turn the draft pile over' : 'Source deck empty'}
            onClick={onStockTap}
            disabled={waste.length === 0}
          >
            {waste.length ? '↻ Flip' : 'Empty'}
          </SlotButton>
        )}
        <PileCaption>{`Deck ${stock.length}`}</PileCaption>
      </Box>
      <Box>
        {top && topSource ? (
          <PlayableCard
            card={top}
            source={topSource}
            itemCount={deck.categories[top.category].itemCount}
            canDrag={flags.canDrag(topSource)}
            selected={flags.isSelected(top.id)}
            shake={flags.isShaking(top.id)}
            dimmed={flags.isDragging(top.id)}
            locationLabel="top of draft pile"
            onTap={() => onWasteTap(topSource)}
          />
        ) : (
          <Box aria-label="Draft pile empty" role="img">
            <EmptyPlaceholder />
          </Box>
        )}
        <PileCaption>{`Draft ${waste.length}`}</PileCaption>
      </Box>
    </>
  );
}

function EmptyPlaceholder() {
  const m = useMetrics();
  return <Box sx={{ width: m.cardW, height: m.cardH, borderRadius: '8px', border: '2px dashed rgba(255,255,255,0.3)' }} />;
}
