// Procedural sound effects using the Web Audio API (no audio files).
let ctx = null;
let enabled = true;

function getContext() {
  if (!enabled || typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(ac, { freq, endFreq, type = 'sine', start = 0, duration = 0.2, volume = 0.2 }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function setSoundEnabled(value) {
  enabled = value;
}

// Low descending buzz: illegal move in the play area.
export function playError() {
  const ac = getContext();
  if (!ac) return;
  tone(ac, { freq: 220, endFreq: 110, type: 'sawtooth', duration: 0.28, volume: 0.12 });
  tone(ac, { freq: 233, endFreq: 116, type: 'square', duration: 0.28, volume: 0.05 });
}

// Two short alert beeps: illegal move onto a foundation slot.
export function playWarning() {
  const ac = getContext();
  if (!ac) return;
  tone(ac, { freq: 660, type: 'triangle', duration: 0.12, volume: 0.18 });
  tone(ac, { freq: 520, type: 'triangle', start: 0.15, duration: 0.16, volume: 0.18 });
}

// Rising arpeggio with sparkle: a category was completed.
export function playSuccess() {
  const ac = getContext();
  if (!ac) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone(ac, { freq, type: 'triangle', start: i * 0.09, duration: 0.35, volume: 0.16 }),
  );
  for (let i = 0; i < 6; i++) {
    tone(ac, {
      freq: 1800 + Math.random() * 1600,
      type: 'sine',
      start: 0.35 + i * 0.05,
      duration: 0.12,
      volume: 0.05,
    });
  }
}

// Soft tick for successful placement / dealing.
export function playTick() {
  const ac = getContext();
  if (!ac) return;
  tone(ac, { freq: 900, endFreq: 600, type: 'sine', duration: 0.06, volume: 0.06 });
}
