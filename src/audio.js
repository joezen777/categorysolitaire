// Procedural sound effects via the Web Audio API (no audio files).
let ctx = null;
let enabled = true;

export const setSoundEnabled = (v) => {
  enabled = v;
};

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, start = 0, dur = 0.15, type = 'sine', gain = 0.15, slideTo }) {
  const c = getCtx();
  if (!c || !enabled) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const playError = () => {
  tone({ freq: 220, dur: 0.18, type: 'sawtooth', slideTo: 140 });
  tone({ freq: 160, start: 0.12, dur: 0.22, type: 'sawtooth', slideTo: 90 });
};

export const playWarning = () => {
  tone({ freq: 440, dur: 0.1, type: 'square', gain: 0.08 });
  tone({ freq: 440, start: 0.15, dur: 0.1, type: 'square', gain: 0.08 });
};

export const playSuccess = () => {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone({ freq: f, start: i * 0.1, dur: 0.25, type: 'triangle', gain: 0.18 }),
  );
};

export const playMove = () => tone({ freq: 600, dur: 0.05, type: 'sine', gain: 0.06 });
