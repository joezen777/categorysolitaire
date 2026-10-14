/**
 * Procedural sound effects on the native Web Audio API. No audio files.
 * The AudioContext is created/resumed lazily from a user gesture via unlock().
 */

const RECIPES = {
  // low double buzz
  error: [
    { type: 'sawtooth', from: 150, to: 110, at: 0, dur: 0.14, gain: 0.18 },
    { type: 'sawtooth', from: 130, to: 90, at: 0.16, dur: 0.18, gain: 0.18 },
  ],
  // two short mid beeps
  warning: [
    { type: 'square', from: 440, to: 440, at: 0, dur: 0.09, gain: 0.1 },
    { type: 'square', from: 330, to: 330, at: 0.12, dur: 0.12, gain: 0.1 },
  ],
  // rising arpeggio
  success: [523.25, 659.25, 783.99, 1046.5].map((f, i) => ({
    type: 'triangle',
    from: f,
    to: f,
    at: i * 0.09,
    dur: 0.28,
    gain: 0.16,
  })),
};

export function createSfx() {
  let ctx = null;
  let muted = false;
  const live = new Set();

  const Ctor = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  const supported = Boolean(Ctor);

  function unlock() {
    if (!supported) return false;
    try {
      if (!ctx) ctx = new Ctor();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  function play(name) {
    if (muted || !ctx || ctx.state === 'closed') return;
    const recipe = RECIPES[name];
    if (!recipe) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    for (const note of recipe) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      const start = now + note.at;
      const end = start + note.dur;
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.from, start);
      osc.frequency.linearRampToValueAtTime(note.to, end);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(note.gain, start + 0.015);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(amp).connect(ctx.destination);
      live.add(osc);
      osc.onended = () => {
        live.delete(osc);
        osc.disconnect();
        amp.disconnect();
      };
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  function setMuted(value) {
    muted = value;
    if (muted) {
      for (const osc of live) {
        try {
          osc.stop();
        } catch {
          // already stopped
        }
      }
    }
  }

  function dispose() {
    setMuted(true);
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    ctx = null;
  }

  return { supported, unlock, play, setMuted, dispose };
}
