import { useEffect, useRef, useState } from 'react';
import type { SoundName } from '../audio/soundEngine';
import type { Store } from '../game/store';
import type { Burst } from './FoundationSlot';

const SHAKE_MS = 400;

/**
 * Turns store feedback events into transient presentation effects (sounds,
 * shake, glitter). All timers are owned here and cleared on new game/unmount,
 * so nothing from an old game can leak into a new one.
 */
export function useFeedbackEffects(store: Store, play: (name: SoundName) => void, reducedMotion: boolean) {
  const [shakingIds, setShakingIds] = useState<readonly string[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const timers = useRef(new Set<number>());

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    clearTimers();
    setShakingIds([]);
    setBursts([]);
  }, [store.gameId]);

  const { feedback } = store;
  useEffect(() => {
    if (!feedback) return;
    if (feedback.kind !== 'info') play(feedback.kind);
    if (feedback.rejectedIds?.length) {
      setShakingIds(feedback.rejectedIds);
      schedule(() => setShakingIds([]), SHAKE_MS);
    }
    const completion = feedback.completion;
    if (completion) {
      const burst: Burst = {
        key: feedback.id,
        slot: completion.slot,
        category: completion.category,
        topCardId: completion.cardIds[completion.cardIds.length - 1],
      };
      setBursts((prev) => [...prev.filter((b) => b.slot !== burst.slot), burst]);
      schedule(() => setBursts((prev) => prev.filter((b) => b.key !== burst.key)), reducedMotion ? 600 : 1000);
    }
    // Only react to a new feedback event; play/reducedMotion changes must not replay it.
  }, [feedback]);

  return { shakingIds, bursts };
}
