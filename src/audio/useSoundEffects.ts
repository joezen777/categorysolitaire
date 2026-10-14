import { useCallback, useEffect, useRef } from 'react';
import { SoundEngine, type SoundName } from './soundEngine';

/**
 * Owns one SoundEngine for the component lifetime. Audio is unlocked on the
 * first pointer/key gesture; `play` respects the current mute setting.
 */
export function useSoundEffects(muted: boolean) {
  const engineRef = useRef<SoundEngine | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const engine = new SoundEngine();
    engineRef.current = engine;
    const unlock = () => {
      if (!mutedRef.current) engine.unlock();
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const play = useCallback((name: SoundName) => {
    if (!mutedRef.current) engineRef.current?.play(name);
  }, []);

  /** Call from a gesture handler (e.g. when unmuting) to resume audio immediately. */
  const unlock = useCallback(() => engineRef.current?.unlock(), []);

  return { play, unlock };
}
