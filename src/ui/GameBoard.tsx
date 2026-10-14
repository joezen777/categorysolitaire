import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import Box from '@mui/material/Box';
import { useMemo, useRef, type Dispatch } from 'react';
import { getMovingCards, type MoveTarget } from '../game/engine';
import type { Action, Store } from '../game/store';
import { CardView } from './CardView';
import { FoundationSlot, type Burst } from './FoundationSlot';
import { MetricsContext, stackOffsets, useBoardMetrics } from './metrics';
import type { DragData } from './PlayableCard';
import { SourcePiles } from './SourcePiles';
import { TableauColumn, type CardFlags } from './TableauColumn';
import { useBoardInteraction } from './useBoardInteraction';

export const BOARD_MAX_WIDTH = 5 * 120 + 4 * 12;

const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

interface GameBoardProps {
  store: Store;
  dispatch: Dispatch<Action>;
  shakingIds: readonly string[];
  bursts: Burst[];
  reducedMotion: boolean;
}

export function GameBoard({ store, dispatch, shakingIds, bursts, reducedMotion }: GameBoardProps) {
  const { game } = store;
  const { deck } = game;
  const boardRef = useRef<HTMLDivElement>(null);
  const metrics = useBoardMetrics(boardRef);
  const ui = useBoardInteraction(store, dispatch);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short press-and-hold starts a touch drag so normal swipes still scroll the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const flags: CardFlags = useMemo(
    () => ({
      isSelected: (id) => ui.selected?.cardId === id,
      isShaking: (id) => shakingIds.includes(id),
      isDragging: (id) => ui.draggingIds.has(id),
      canDrag: ui.canDrag,
    }),
    [ui.selected, ui.draggingIds, ui.canDrag, shakingIds],
  );

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData | undefined;
    if (data) ui.startDrag(data.source);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as DragData | undefined;
    const target = (e.over?.data.current as { target?: MoveTarget } | undefined)?.target ?? null;
    if (data) ui.endDrag(data.source, target);
    else ui.cancelDrag();
  };

  const cardName = (id: string | number) => deck.byId[String(id).replace(/^card:/, '')]?.label ?? 'card';
  const placeName = (id: string | number) => {
    const [kind, n] = String(id).split(':');
    return kind === 'foundation' ? `category slot ${Number(n) + 1}` : `column ${Number(n) + 1}`;
  };
  const accessibility = {
    screenReaderInstructions: {
      draggable: 'Press Enter or Space to select this card, then activate a destination column or category slot.',
    },
    announcements: {
      onDragStart: ({ active }: DragStartEvent) => `Picked up ${cardName(active.id)}.`,
      onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
        over ? `${cardName(active.id)} is over ${placeName(over.id)}.` : `${cardName(active.id)} is no longer over a destination.`,
      onDragEnd: ({ active, over }: DragEndEvent) =>
        over ? `${cardName(active.id)} dropped on ${placeName(over.id)}.` : `${cardName(active.id)} returned.`,
      onDragCancel: ({ active }: { active: { id: string | number } }) => `Dragging ${cardName(active.id)} cancelled.`,
    },
  };

  const overlayIds = useMemo(() => {
    if (!ui.dragSource) return [];
    const moving = getMovingCards(game, ui.dragSource);
    return 'ids' in moving ? moving.ids : [];
  }, [game, ui.dragSource]);
  const overlayTops = stackOffsets(overlayIds.map(() => true), metrics);

  const row = {
    display: 'grid',
    gridTemplateColumns: `repeat(5, ${metrics.cardW}px)`,
    columnGap: `${metrics.gap}px`,
    justifyContent: 'center',
  } as const;

  return (
    <MetricsContext.Provider value={metrics}>
      <Box ref={boardRef} sx={{ width: '100%', maxWidth: BOARD_MAX_WIDTH, mx: 'auto' }}>
        <DndContext
          sensors={sensors}
          accessibility={accessibility}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={ui.cancelDrag}
        >
          <Box component="section" aria-label="Source deck and draft pile" sx={{ ...row, mb: 1 }}>
            <SourcePiles
              stock={game.stock}
              waste={game.waste}
              deck={deck}
              flags={flags}
              onStockTap={() => dispatch({ type: 'stock' })}
              onWasteTap={ui.tapCard}
            />
          </Box>

          <Box component="section" aria-label="Category slots" sx={{ ...row, mb: 2 }}>
            {game.foundations.map((slot, i) => (
              <FoundationSlot
                key={i}
                index={i}
                slot={slot}
                deck={deck}
                legal={ui.isLegal({ kind: 'foundation', slot: i })}
                burst={bursts.find((b) => b.slot === i) ?? null}
                onTap={() => ui.tapTarget({ kind: 'foundation', slot: i })}
              />
            ))}
          </Box>

          <Box component="section" aria-label="Play area" sx={{ ...row, alignItems: 'start', pb: 4 }}>
            {game.tableau.map((cards, i) => (
              <TableauColumn
                key={i}
                index={i}
                cards={cards}
                deck={deck}
                legal={ui.isLegal({ kind: 'tableau', column: i })}
                flags={flags}
                onCardTap={ui.tapCard}
                onColumnTap={() => ui.tapTarget({ kind: 'tableau', column: i })}
              />
            ))}
          </Box>

          <DragOverlay dropAnimation={reducedMotion ? null : { duration: 180, easing: 'ease-out' }}>
            {overlayIds.length > 0 && (
              <Box sx={{ position: 'relative', width: metrics.cardW, height: overlayTops[overlayTops.length - 1] + metrics.cardH }}>
                {overlayIds.map((id, i) => {
                  const card = deck.byId[id];
                  return (
                    <Box key={id} sx={{ position: 'absolute', top: overlayTops[i], left: 0 }}>
                      <CardView card={card} faceUp itemCount={deck.categories[card.category].itemCount} lifted />
                    </Box>
                  );
                })}
              </Box>
            )}
          </DragOverlay>
        </DndContext>
      </Box>
    </MetricsContext.Provider>
  );
}
