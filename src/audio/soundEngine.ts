export type SoundName = 'error' | 'warning' | 'success';

interface Tone {
  freq: number;
  endFreq?: number;
  start: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const SOUNDS: Record<SoundName, Tone[]> = {
  // Low descending buzz.
  error: [
    { freq: 220, endFreq: 110, start: 0, duration: 0.22, type: 'square', gain: 0.08 },
    { freq: 233, endFreq: 116, start: 0, duration: 0.22, type: 'sawtooth', gain: 0.04 },
  ],
  // Two short mid beeps.
  warning: [
    { freq: 660, start: 0, duration: 0.09, type: 'triangle', gain: 0.18 },
    { freq: 520, start: 0.12, duration: 0.12, type: 'triangle', gain: 0.18 },
  ],
  // Rising major arpeggio with a sparkle on top.
  success: [
    { freq: 523.25, start: 0, duration: 0.18, type: 'sine', gain: 0.2 },
    { freq: 659.25, start: 0.09, duration: 0.18, type: 'sine', gain: 0.2 },
    { freq: 783.99, start: 0.18, duration: 0.2, type: 'sine', gain: 0.2 },
    { freq: 1046.5, start: 0.27, duration: 0.45, type: 'sine', gain: 0.18 },
    { freq: 2093, start: 0.3, duration: 0.35, type: 'triangle', gain: 0.05 },
  ],
};

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Procedural sound effects via the Web Audio API. The context is created
 * lazily and only resumed from a user gesture (`unlock`). When audio is not
 * supported every call is a no-op.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private failed = false;

  get supported(): boolean {
    return !this.failed && getAudioContextCtor() !== null;
  }

  /** Call from inside a user gesture handler. */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch((err: unknown) => {
        console.warn('Audio could not be resumed', err);
      });
    }
  }

  play(name: SoundName): void {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime + 0.01;
    for (const tone of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = now + tone.start;
      const t1 = t0 + tone.duration;
      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, t0);
      if (tone.endFreq) osc.frequency.exponentialRampToValueAtTime(tone.endFreq, t1);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(tone.gain, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain).connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  }

  dispose(): void {
    const ctx = this.ctx;
    this.ctx = null;
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch((err: unknown) => console.warn('Audio context close failed', err));
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx || this.failed) return this.ctx;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch (err) {
      this.failed = true;
      console.warn('Web Audio is unavailable; continuing without sound', err);
    }
    return this.ctx;
  }
}
