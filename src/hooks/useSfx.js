import { useCallback, useEffect, useRef, useState } from 'react';
import { createSfx } from '../audio/sfx.js';

/** React wrapper around the audio engine: lifecycle cleanup plus a mute toggle. */
export function useSfx() {
  const engine = useRef(null);
  const mutedRef = useRef(false);
  const [muted, setMutedState] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const sfx = createSfx();
    sfx.setMuted(mutedRef.current);
    engine.current = sfx;
    setSupported(sfx.supported);
    return () => {
      sfx.dispose();
      engine.current = null;
    };
  }, []);

  const unlock = useCallback(() => engine.current?.unlock(), []);
  const play = useCallback((name) => engine.current?.play(name), []);
  const setMuted = useCallback((value) => {
    mutedRef.current = value;
    engine.current?.setMuted(value);
    setMutedState(value);
  }, []);

  return { unlock, play, muted, setMuted, supported };
}
