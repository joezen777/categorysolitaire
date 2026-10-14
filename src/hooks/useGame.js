import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, draw, finishClear, move, quit, recycle } from '../game/state.js';

export const CLEAR_DELAY_MS = 1300;

/**
 * Owns the single authoritative game state. Transitions run against a ref so
 * rapid inputs always see the latest state and report accurate results.
 */
export function useGame(deck) {
  const [state, setState] = useState(() => createGame(deck));
  const latest = useRef(state);
  const timers = useRef(new Map());

  const run = useCallback((transition) => {
    const result = transition(latest.current);
    if (result.ok) {
      latest.current = result.state;
      setState(result.state);
    }
    return result;
  }, []);

  // One celebration timer per completing slot; stale timers die with their game.
  useEffect(() => {
    const wanted = new Map();
    state.foundations.forEach((slot, i) => {
      if (slot?.clearing) {
        const category = state.deck.cards[slot.pile[0]].category;
        wanted.set(`${state.gameId}:${i}:${category}`, { slot: i, category });
      }
    });
    for (const [key, handle] of timers.current) {
      if (!wanted.has(key)) {
        clearTimeout(handle);
        timers.current.delete(key);
      }
    }
    for (const [key, { slot, category }] of wanted) {
      if (timers.current.has(key)) continue;
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          run((s) => finishClear(s, slot, category));
        }, CLEAR_DELAY_MS),
      );
    }
  }, [state, run]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const restart = useCallback(() => {
    const next = createGame(deck, { gameId: latest.current.gameId + 1 });
    latest.current = next;
    setState(next);
  }, [deck]);

  return {
    state,
    draw: useCallback(() => run(draw), [run]),
    recycle: useCallback(() => run(recycle), [run]),
    move: useCallback((source, target) => run((s) => move(s, source, target)), [run]),
    quit: useCallback(() => run(quit), [run]),
    restart,
  };
}
