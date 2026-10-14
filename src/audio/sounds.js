// Procedural sound effects with the Web Audio API (no audio files).
// Each effect is a list of notes: [startOffset s, duration s, startHz, endHz, waveform, gain].
const EFFECTS = {
  // Illegal title-card move: low descending buzz.
  error: [
    [0, 0.16, 180, 120, 'square', 0.12],
    [0.18, 0.22, 140, 90, 'square', 0.12],
  ],
  // Illegal item-card move: short double beep.
  warning: [
    [0, 0.1, 520, 440, 'triangle', 0.25],
    [0.14, 0.12, 440, 360, 'triangle', 0.25],
  ],
  // Category completed: rising arpeggio.
  success: [
    [0, 0.14, 523.25, 523.25, 'sine', 0.22],
    [0.1, 0.14, 659.25, 659.25, 'sine', 0.22],
    [0.2, 0.14, 783.99, 783.99, 'sine', 0.22],
    [0.3, 0.35, 1046.5, 1046.5, 'sine', 0.25],
  ],
};

export const SOUND_NAMES = Object.keys(EFFECTS);

function defaultContextFactory() {
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  return Ctor ? new Ctor() : null;
}

// Returns { play(name), setEnabled(bool), isEnabled() }. The AudioContext is
// created lazily on the first enabled play (after a user gesture).
export function createSoundPlayer(contextFactory = defaultContextFactory) {
  let ctx = null;
  let enabled = true;

  function play(name) {
    const notes = EFFECTS[name];
    if (!enabled || !notes) return false;
    if (!ctx) ctx = contextFactory();
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume?.();
    const now = ctx.currentTime;
    for (const [offset, duration, fromHz, toHz, type, gain] of notes) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const start = now + offset;
      const end = start + duration;
      osc.type = type;
      osc.frequency.setValueAtTime(fromHz, start);
      osc.frequency.linearRampToValueAtTime(toHz, end);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
    return true;
  }

  return {
    play,
    setEnabled(value) {
      enabled = value;
    },
    isEnabled: () => enabled,
  };
}
