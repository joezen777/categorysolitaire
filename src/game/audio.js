export function createTonePlayer() {
  let audioContext = null;

  const getContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    return audioContext;
  };

  const playTone = (type, muted) => {
    if (muted) {
      return;
    }

    const context = getContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      context.resume();
    }

    if (type === "success") {
      playArpeggio(context, [523.25, 659.25, 783.99, 1046.5], 0.075, 0.07);
      return;
    }

    if (type === "error") {
      playSweep(context, 180, 82, 0.22, "sawtooth", 0.12);
      return;
    }

    playSweep(context, 420, 270, 0.16, "square", 0.055);
  };

  return playTone;
}

function playSweep(context, startFrequency, endFrequency, duration, type, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playArpeggio(context, frequencies, noteLength, volume) {
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * noteLength;
    const end = start + noteLength * 1.4;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  });
}
