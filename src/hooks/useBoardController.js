import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMovableGroup, legalTargets } from '../game/rules.js';
import { POINTS_PER_CATEGORY } from '../game/config.js';

const REJECT_FLASH_MS = 500;
const TAP_GUARD_MS = 250;

const sameSource = (a, b) =>
  a && b && a.zone === b.zone && a.col === b.col && a.index === b.index;

/**
 * Input layer shared by tap-to-move and drag-and-drop. Both paths end in
 * `attempt(source, target)`, which calls the same game transition.
 * Selection, status text and flashes are presentation state only.
 */
export function useBoardController({ game, sfx }) {
  const { state } = game;
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [status, setStatus] = useState('');
  const [rejected, setRejected] = useState(null);
  const dropAccepted = useRef(false);
  const lastDragEnd = useRef(0);
  const flashTimer = useRef(null);

  // A new game (or leaving play) invalidates any in-flight interaction.
  useEffect(() => {
    setSelected(null);
    setDragging(null);
    setRejected(null);
    setStatus('');
  }, [state.gameId]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const flashReject = useCallback((key) => {
    clearTimeout(flashTimer.current);
    setRejected({ key, seq: Math.random() });
    flashTimer.current = setTimeout(() => setRejected(null), REJECT_FLASH_MS);
  }, []);

  const attempt = useCallback(
    (source, target) => {
      const result = game.move(source, target);
      if (result.ok) {
        setSelected(null);
        if (result.completed.length > 0) {
          sfx.play('success');
          setStatus(
            `${result.completed.map((c) => c.category).join(', ')} complete! +${
              POINTS_PER_CATEGORY * result.completed.length
            } points`,
          );
        } else {
          setStatus('');
        }
      } else {
        sfx.play(target.zone === 'foundation' ? 'warning' : 'error');
        setStatus(`Illegal move: ${result.reason}`);
        flashReject(
          target.zone === 'foundation' ? `foundation:${target.slot}` : `tableau:${target.col}`,
        );
        setSelected(null);
      }
      return result.ok;
    },
    [game, sfx, flashReject],
  );

  const select = useCallback(
    (source) => {
      const ids = getMovableGroup(state, source);
      if (!ids) {
        sfx.play('warning');
        setStatus('That card cannot be moved');
        return;
      }
      const label = state.deck.cards[ids[0]].label;
      setSelected(source);
      setStatus(
        `Selected ${label}${ids.length > 1 ? ` and ${ids.length - 1} more` : ''}. Choose a highlighted destination.`,
      );
    },
    [state, sfx],
  );

  const guarded = (fn) => (...args) => {
    if (performance.now() - lastDragEnd.current < TAP_GUARD_MS) return;
    fn(...args);
  };

  const tapCard = useCallback(
    guarded((source) => {
      if (selected && sameSource(selected, source)) {
        setSelected(null);
        setStatus('Selection cleared');
        return;
      }
      // Tapping a card in another tableau column means "move here".
      if (selected && source.zone === 'tableau' && !(selected.zone === 'tableau' && selected.col === source.col)) {
        attempt(selected, { zone: 'tableau', col: source.col });
        return;
      }
      select(source);
    }),
    [selected, attempt, select],
  );

  const tapTarget = useCallback(
    guarded((target) => {
      if (!selected) {
        setStatus('Select a card first');
        return;
      }
      attempt(selected, target);
    }),
    [selected, attempt],
  );

  const tapStock = useCallback(
    guarded(() => {
      setSelected(null);
      const result = state.stock.length > 0 ? game.draw() : game.recycle();
      if (!result.ok) {
        sfx.play('warning');
        setStatus(result.reason);
      } else {
        setStatus('');
      }
    }),
    [state.stock.length, game, sfx],
  );

  const onDragStart = useCallback((source) => {
    dropAccepted.current = false;
    setSelected(null);
    setDragging(source);
  }, []);

  const onDragEnd = useCallback(
    (source, target) => {
      lastDragEnd.current = performance.now();
      setDragging(null);
      dropAccepted.current = target ? attempt(source, target) : false;
    },
    [attempt],
  );

  const onDragCancel = useCallback(() => {
    lastDragEnd.current = performance.now();
    dropAccepted.current = false;
    setDragging(null);
  }, []);

  const activeSource = dragging ?? selected;
  const targets = useMemo(
    () => (activeSource ? legalTargets(state, activeSource) : { tableau: [], foundation: [] }),
    [state, activeSource],
  );

  return {
    selected,
    dragging,
    targets,
    status,
    rejected,
    dropAccepted,
    tapCard,
    tapTarget,
    tapStock,
    onDragStart,
    onDragEnd,
    onDragCancel,
  };
}
