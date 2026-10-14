import { useCallback, useMemo, useState, type Dispatch } from 'react';
import { getMovingCards, legalTargets, type MoveSource, type MoveTarget } from '../game/engine';
import type { Action, Store } from '../game/store';

const sameTarget = (a: MoveTarget, b: MoveTarget) =>
  a.kind === b.kind && (a.kind === 'tableau' ? a.column === (b as typeof a).column : a.slot === (b as typeof a).slot);

const isOwnColumn = (source: MoveSource, target: MoveTarget) =>
  source.kind === 'tableau' && target.kind === 'tableau' && source.column === target.column;

/**
 * Translates taps, clicks, keyboard activation and drag-and-drop into store
 * actions. Both input styles end in the same `move` action, so they share
 * validation and transitions.
 */
export function useBoardInteraction(store: Store, dispatch: Dispatch<Action>) {
  const { game, selected, gameId } = store;
  const [drag, setDrag] = useState<{ gameId: number; source: MoveSource } | null>(null);
  // A drag from a previous game is ignored without needing a reset effect.
  const dragSource = drag && drag.gameId === gameId ? drag.source : null;
  const active = dragSource ?? selected;

  const targets = useMemo(() => (active ? legalTargets(game, active) : []), [game, active]);
  const draggingIds = useMemo(() => {
    if (!dragSource) return new Set<string>();
    const moving = getMovingCards(game, dragSource);
    return new Set('ids' in moving ? moving.ids : []);
  }, [game, dragSource]);

  const isLegal = useCallback((t: MoveTarget) => targets.some((x) => sameTarget(x, t)), [targets]);

  const canDrag = useCallback((source: MoveSource) => 'ids' in getMovingCards(game, source), [game]);

  const select = useCallback(
    (source: MoveSource) => {
      const moving = getMovingCards(game, source);
      if ('reason' in moving) dispatch({ type: 'reject', message: moving.reason, rejectedIds: [source.cardId] });
      else dispatch({ type: 'select', source });
    },
    [game, dispatch],
  );

  const tapTarget = useCallback(
    (target: MoveTarget) => {
      if (!selected) return;
      if (isOwnColumn(selected, target)) dispatch({ type: 'select', source: null });
      else dispatch({ type: 'move', source: selected, target });
    },
    [selected, dispatch],
  );

  const tapCard = useCallback(
    (source: MoveSource) => {
      if (selected?.cardId === source.cardId) {
        dispatch({ type: 'select', source: null });
        return;
      }
      if (selected && source.kind === 'tableau') {
        const target: MoveTarget = { kind: 'tableau', column: source.column };
        if (!isOwnColumn(selected, target)) {
          dispatch({ type: 'move', source: selected, target });
          return;
        }
      }
      select(source);
    },
    [selected, select, dispatch],
  );

  const startDrag = useCallback(
    (source: MoveSource) => {
      if (selected) dispatch({ type: 'select', source: null });
      setDrag({ gameId, source });
    },
    [selected, gameId, dispatch],
  );

  const endDrag = useCallback(
    (source: MoveSource, target: MoveTarget | null) => {
      setDrag(null);
      // Dropping nowhere or back on the origin column just returns the card.
      if (!target || isOwnColumn(source, target)) return;
      dispatch({ type: 'move', source, target });
    },
    [dispatch],
  );

  const cancelDrag = useCallback(() => setDrag(null), []);

  return { selected, dragSource, draggingIds, isLegal, canDrag, tapCard, tapTarget, startDrag, endDrag, cancelDrag };
}
