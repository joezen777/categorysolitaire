// Procedural sound effects using the Web Audio API (no audio files).
// The AudioContext is created lazily on first use, which happens inside a user gesture.

export function createSfx(getContextClass = () => globalThis.AudioContext || globalThis.webkitAudioContext) {
  let ctx = null;

  const context = () => {
    if (!ctx) {
      const Ctx = getContextClass();
      if (!Ctx) return null;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume?.();
    return ctx;
  };

  // One enveloped oscillator note: frequency may slide from `freq` to `endFreq`.
  const tone = (c, { type, freq, endFreq = freq, start = 0, duration, volume = 0.2 }) => {
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  };

  const play = (notes) => {
    const c = context();
    if (c) notes.forEach((n) => tone(c, n));
  };

  return {
    // Low descending buzz: an illegal title-card move.
    error: () => play([{ type: 'sawtooth', freq: 180, endFreq: 80, duration: 0.3, volume: 0.25 }]),
    // Two short beeps: an illegal item-card move.
    warning: () =>
      play([
        { type: 'square', freq: 440, duration: 0.09, volume: 0.12 },
        { type: 'square', freq: 440, start: 0.14, duration: 0.09, volume: 0.12 },
      ]),
    // Rising arpeggio with a sparkle on top: a category was completed.
    success: () =>
      play([
        { type: 'sine', freq: 523.25, start: 0, duration: 0.18 },
        { type: 'sine', freq: 659.25, start: 0.12, duration: 0.18 },
        { type: 'sine', freq: 783.99, start: 0.24, duration: 0.18 },
        { type: 'sine', freq: 1046.5, start: 0.36, duration: 0.4 },
        { type: 'triangle', freq: 2093, endFreq: 3136, start: 0.4, duration: 0.3, volume: 0.08 },
      ]),
  };
}
