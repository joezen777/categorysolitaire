let audioCtx = null;
let soundEnabled = true;

export const setSoundEnabled = (enabled) => {
  soundEnabled = enabled;
};

export const isSoundEnabled = () => {
  return soundEnabled;
};

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playSuccessSound = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // A beautiful upward arpeggio: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz), C6 (1046.50 Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Combine sine and triangle for a warmer chime sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gainNode.gain.setValueAtTime(0, now + index * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.45);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.45);
    });
  } catch (e) {
    console.error('Failed to play success sound:', e);
  }
};

export const playErrorSound = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Sawtooth + Triangle creating a low buzzy dissonant sound (130Hz & 136Hz)
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130, now);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(136, now);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.28);
    osc2.start(now);
    osc2.stop(now + 0.28);
  } catch (e) {
    console.error('Failed to play error sound:', e);
  }
};

export const playWarningSound = () => {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Double beep: two medium-high triangle wave beeps (440Hz, A4) spaced 150ms apart
    const beeps = [0, 0.15];
    beeps.forEach((delay) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now + delay);

      gainNode.gain.setValueAtTime(0.12, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  } catch (e) {
    console.error('Failed to play warning sound:', e);
  }
};
